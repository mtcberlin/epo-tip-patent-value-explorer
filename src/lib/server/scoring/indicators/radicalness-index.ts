import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:radicalness-index]';
const DATA_SOURCE = 'tls212_citation + tls224_appln_cpc';

/**
 * Calculates Radicalness Index for a patent.
 *
 * @description Measures the diversity of CPC technology classes among the
 * patent's backward citations (prior art). Uses the Herfindahl formula:
 *
 *   RAD = 1 - SUM(sij^2)
 *
 * where sij is the share of backward citations belonging to CPC section j.
 * A high radicalness means the patent draws knowledge from many different
 * technology fields — a hallmark of disruptive innovation.
 *
 * Returns `{ available: false }` when the patent has zero backward citations,
 * as diversity cannot be computed without cited patents.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value (0.0-1.0) and metadata
 *
 * @see OECD Patent Quality Indicators, Section 3.6
 * @see PATSTAT tables: tls212_citation, tls224_appln_cpc
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateRadicalnessIndex(12345, mcpClient);
 * // { indicator: 'radicalness_index', value: 0.72, available: true, dataSource: '...', error: null }
 */
export async function calculateRadicalnessIndex(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		// Get CPC sections of all backward-cited patents
		const query = `
			SELECT SUBSTR(cpc.cpc_class_symbol, 1, 1) AS cpc_section, COUNT(*) AS cnt
			FROM \`tls211_pat_publn\` p
			JOIN \`tls212_citation\` c ON p.pat_publn_id = c.pat_publn_id
			JOIN \`tls211_pat_publn\` cited_pub ON c.cited_pat_publn_id = cited_pub.pat_publn_id
			JOIN \`tls224_appln_cpc\` cpc ON cited_pub.appln_id = cpc.appln_id
			WHERE p.appln_id = ${applnId}
			  AND c.cited_pat_publn_id > 0
			GROUP BY cpc_section
		`.trim();

		const response = await mcpClient.executeQuery(query, 100);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.warn(`${LOG_PREFIX} No backward citation CPC data for applnId=${applnId}`);
			return {
				indicator: 'radicalness_index',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No backward citation data available'
			};
		}

		const value = calculateHerfindahl(rows.map((r) => parseInt(r.cnt, 10)));

		console.info(`${LOG_PREFIX} OK: ${value.toFixed(4)} for applnId=${applnId}`);
		return {
			indicator: 'radicalness_index',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'radicalness_index',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

/**
 * Herfindahl diversity index: 1 - SUM(share_i^2)
 * @param counts - Array of counts per class
 * @returns Diversity score between 0.0 and ~1.0
 */
export function calculateHerfindahl(counts: number[]): number {
	const total = counts.reduce((sum, c) => sum + c, 0);
	if (total === 0) return 0;
	const sumSquares = counts.reduce((sum, c) => {
		const share = c / total;
		return sum + share * share;
	}, 0);
	return 1 - sumSquares;
}

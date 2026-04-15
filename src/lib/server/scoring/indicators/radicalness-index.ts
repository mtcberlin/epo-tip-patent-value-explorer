import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:radicalness-index]';
const DATA_SOURCE = 'tls212_citation + tls224_appln_cpc';

/**
 * Calculates Radicalness Index for a patent.
 *
 * @description Share of backward citations whose CPC subclasses do not
 * overlap with the focal patent's own CPC subclasses:
 *
 *   RAD = (1 / n_BC) · COUNT(j : CPC(j) ∩ CPC(focal) = ∅)
 *
 * A high radicalness means the patent draws prior art from technology
 * areas different from its own classification — interpreted by the OECD
 * as a signal of unconventional, potentially disruptive recombination.
 *
 * Distinct from the Originality Index, which measures the *diversity*
 * of cited technology classes regardless of whether they overlap with
 * the focal patent (Herfindahl-based).
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value (0.0-1.0) and metadata
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013), "Radicalness index" section
 * @see PATSTAT tables: tls212_citation, tls224_appln_cpc
 *
 * @example
 * const result = await calculateRadicalnessIndex(12345, mcpClient);
 * // { indicator: 'radicalness_index', value: 0.42, available: true, dataSource: '...', error: null }
 */
export async function calculateRadicalnessIndex(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		const query = `
			WITH focal AS (
				SELECT DISTINCT SUBSTR(cpc_class_symbol, 1, 4) AS sub
				FROM \`tls224_appln_cpc\`
				WHERE appln_id = ${applnId}
			),
			cited_subs AS (
				SELECT
					cited_pub.appln_id AS cited_aid,
					SUBSTR(cited_cpc.cpc_class_symbol, 1, 4) AS sub
				FROM \`tls211_pat_publn\` p
				JOIN \`tls212_citation\` c ON p.pat_publn_id = c.pat_publn_id
				JOIN \`tls211_pat_publn\` cited_pub ON c.cited_pat_publn_id = cited_pub.pat_publn_id
				JOIN \`tls224_appln_cpc\` cited_cpc ON cited_cpc.appln_id = cited_pub.appln_id
				WHERE p.appln_id = ${applnId}
				  AND c.cited_pat_publn_id > 0
			),
			cited_overlap AS (
				SELECT cs.cited_aid, COUNTIF(f.sub IS NOT NULL) AS overlap
				FROM cited_subs cs
				LEFT JOIN focal f ON cs.sub = f.sub
				GROUP BY cs.cited_aid
			)
			SELECT
				COUNT(*) AS total,
				COUNTIF(overlap = 0) AS radical
			FROM cited_overlap
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.warn(`${LOG_PREFIX} No backward citation data for applnId=${applnId}`);
			return {
				indicator: 'radicalness_index',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No backward citation data available'
			};
		}

		const total = parseInt(rows[0].total ?? '', 10);
		const radical = parseInt(rows[0].radical ?? '', 10);

		if (isNaN(total) || total === 0) {
			return {
				indicator: 'radicalness_index',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'Patent has zero classified backward citations'
			};
		}

		const value = +(radical / total).toFixed(4);

		console.info(`${LOG_PREFIX} OK: ${value} (${radical}/${total}) for applnId=${applnId}`);
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

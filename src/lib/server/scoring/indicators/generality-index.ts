import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';
import { calculateHerfindahl } from './originality-index';

const LOG_PREFIX = '[scoring:generality-index]';
const DATA_SOURCE = 'tls212_citation + tls224_appln_cpc';

/**
 * Calculates Generality Index for a patent (ON-DEMAND ONLY).
 *
 * @description Measures the diversity of CPC technology classes among the
 * patent's forward citations (patents that cite this one). Uses the
 * Herfindahl formula:
 *
 *   GEN = 1 - SUM(sij^2)
 *
 * where sij is the share of citing patents belonging to CPC section j.
 * A high generality means the patent is cited by patents in many different
 * technology fields — indicating broad technological applicability.
 *
 * **This indicator is NOT auto-calculated** due to ~16GB BigQuery query cost.
 * It is triggered on-demand via a "Calculate" button in the UI, and the
 * result is cached in-memory for future visits.
 *
 * Returns `{ available: false }` when the patent has zero forward citations,
 * as CPC diversity cannot be computed without citing patents.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value (0.0-1.0) and metadata
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013), "Generality index" section
 * @see PATSTAT tables: tls228_docdb_fam_citn, tls224_appln_cpc
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateGeneralityIndex(12345, mcpClient);
 * // { indicator: 'generality_index', value: 0.85, available: true, dataSource: '...', error: null }
 */
export async function calculateGeneralityIndex(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		// Get CPC sections of all citing patents via publication-level citations
		// (mirrors originality query but reversed: forward instead of backward)
		const query = `
			SELECT SUBSTR(cpc.cpc_class_symbol, 1, 1) AS cpc_section, COUNT(*) AS cnt
			FROM \`tls211_pat_publn\` p
			JOIN \`tls212_citation\` c ON p.pat_publn_id = c.cited_pat_publn_id
			JOIN \`tls211_pat_publn\` citing_pub ON c.pat_publn_id = citing_pub.pat_publn_id
			JOIN \`tls224_appln_cpc\` cpc ON citing_pub.appln_id = cpc.appln_id
			WHERE p.appln_id = ${applnId}
			  AND c.pat_publn_id > 0
			GROUP BY cpc_section
		`.trim();

		const response = await mcpClient.executeQuery(query, 100);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.info(`${LOG_PREFIX} No forward citation CPC data for applnId=${applnId}`);
			return {
				indicator: 'generality_index',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No forward citation data available'
			};
		}

		const value = calculateHerfindahl(rows.map((r) => parseInt(r.cnt, 10)));

		console.info(`${LOG_PREFIX} OK: ${value.toFixed(4)} for applnId=${applnId}`);
		return {
			indicator: 'generality_index',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'generality_index',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

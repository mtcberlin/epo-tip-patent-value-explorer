import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:backward-citations]';
const DATA_SOURCE = 'tls212_citation';

/**
 * Calculates Backward Citations for a patent.
 *
 * @description Counts the number of prior art references this patent cites.
 * A high backward citation count indicates a broad knowledge base — the
 * inventors were aware of and building upon many earlier inventions.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value and metadata
 *
 * @see OECD Patent Quality Indicators, Section 3.2
 * @see PATSTAT tables: tls211_pat_publn, tls212_citation (cited_pat_publn_id > 0)
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateBackwardCitations(12345, mcpClient);
 * // { indicator: 'backward_citations', value: 23, available: true, dataSource: 'tls212_citation', error: null }
 */
export async function calculateBackwardCitations(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		const query = `
			SELECT COUNT(*) AS backward_count
			FROM \`patstat.tls212_citation\` c
			JOIN \`patstat.tls211_pat_publn\` p ON c.pat_publn_id = p.pat_publn_id
			WHERE p.appln_id = ${applnId}
			  AND c.cited_pat_publn_id > 0
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.warn(`${LOG_PREFIX} No data for applnId=${applnId}`);
			return {
				indicator: 'backward_citations',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No data found'
			};
		}

		const raw = rows[0].backward_count;
		const value = raw !== undefined && raw !== '' ? parseInt(raw, 10) : null;

		if (value === null || isNaN(value)) {
			return {
				indicator: 'backward_citations',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'Invalid value returned'
			};
		}

		console.info(`${LOG_PREFIX} OK: ${value} for applnId=${applnId}`);
		return {
			indicator: 'backward_citations',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'backward_citations',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

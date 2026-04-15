import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:claims-count]';
const DATA_SOURCE = 'tls211_pat_publn.publn_claims';

/**
 * Calculates Claims Count for a patent.
 *
 * @description Counts the number of claims in the patent publication.
 * Claims define the legal scope of protection. More claims generally
 * indicate broader or more detailed protection - but can also signal
 * examination complexity.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value and metadata
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013), "Claims" section
 * @see PATSTAT table: tls211_pat_publn (publn_claims column)
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateClaimsCount(12345, mcpClient);
 * // { indicator: 'claims_count', value: 20, available: true, dataSource: 'tls211_pat_publn.publn_claims', error: null }
 */
export async function calculateClaimsCount(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		const query = `
			SELECT MAX(publn_claims) AS claims_count
			FROM \`tls211_pat_publn\`
			WHERE appln_id = ${applnId}
			  AND publn_claims > 0
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.warn(`${LOG_PREFIX} No data for applnId=${applnId}`);
			return {
				indicator: 'claims_count',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No data found'
			};
		}

		const raw = rows[0].claims_count;
		const value = raw !== undefined && raw !== '' ? parseInt(raw, 10) : null;

		if (value === null || isNaN(value)) {
			return {
				indicator: 'claims_count',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No claims data available'
			};
		}

		console.info(`${LOG_PREFIX} OK: ${value} for applnId=${applnId}`);
		return {
			indicator: 'claims_count',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'claims_count',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

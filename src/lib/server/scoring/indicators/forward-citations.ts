import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:forward-citations]';
const DATA_SOURCE = 'tls201.nb_citing_docdb_fam';

/**
 * Calculates Forward Citations for a patent.
 *
 * @description Counts how many times this patent's DOCDB family has been cited
 * by later patents. Forward citations are the most widely used indicator of
 * technological impact — a high count signals that the invention influenced
 * subsequent innovation.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value and metadata
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013), "Forward citations" section
 * @see PATSTAT table: tls201_appln (nb_citing_docdb_fam column)
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateForwardCitations(12345, mcpClient);
 * // { indicator: 'forward_citations', value: 47, available: true, dataSource: 'tls201.nb_citing_docdb_fam', error: null }
 */
export async function calculateForwardCitations(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		const query = `
			SELECT nb_citing_docdb_fam
			FROM \`tls201_appln\`
			WHERE appln_id = ${applnId}
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.warn(`${LOG_PREFIX} No data for applnId=${applnId}`);
			return {
				indicator: 'forward_citations',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No data found'
			};
		}

		const raw = rows[0].nb_citing_docdb_fam;
		const value = raw !== undefined && raw !== '' ? parseInt(raw, 10) : null;

		if (value === null || isNaN(value)) {
			return {
				indicator: 'forward_citations',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'Invalid value returned'
			};
		}

		console.info(`${LOG_PREFIX} OK: ${value} for applnId=${applnId}`);
		return {
			indicator: 'forward_citations',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'forward_citations',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

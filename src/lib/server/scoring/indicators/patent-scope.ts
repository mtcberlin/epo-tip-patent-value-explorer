import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:patent-scope]';
const DATA_SOURCE = 'tls224_appln_cpc';

/**
 * Calculates Patent Scope for a patent.
 *
 * @description Counts the number of distinct CPC subclasses (4-character
 * codes such as "C12N" or "G06F") assigned to the patent. CPC subclasses
 * mirror the IPC subclass taxonomy used in the OECD definition.
 *
 * A larger scope means the invention spans more technology areas and
 * therefore claims protection across a broader technological domain.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value (count of distinct subclasses) and metadata
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013), "Patent scope" section
 * @see PATSTAT table: tls224_appln_cpc
 *
 * @example
 * const result = await calculatePatentScope(12345, mcpClient);
 * // { indicator: 'patent_scope', value: 4, available: true, dataSource: 'tls224_appln_cpc', error: null }
 */
export async function calculatePatentScope(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		const query = `
			SELECT COUNT(DISTINCT SUBSTR(cpc_class_symbol, 1, 4)) AS cnt
			FROM \`tls224_appln_cpc\`
			WHERE appln_id = ${applnId}
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.warn(`${LOG_PREFIX} No CPC data for applnId=${applnId}`);
			return {
				indicator: 'patent_scope',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No CPC classifications available'
			};
		}

		const raw = rows[0].cnt;
		const value = raw !== undefined && raw !== '' ? parseInt(raw, 10) : null;

		if (value === null || isNaN(value) || value === 0) {
			return {
				indicator: 'patent_scope',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No CPC subclasses found'
			};
		}

		console.info(`${LOG_PREFIX} OK: ${value} subclasses for applnId=${applnId}`);
		return {
			indicator: 'patent_scope',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'patent_scope',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

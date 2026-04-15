import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:family-size]';
const DATA_SOURCE = 'tls201_appln.docdb_family_size';

/**
 * Calculates Family Size for a patent.
 *
 * @description Counts the number of jurisdictions (patent offices) in the
 * patent's DOCDB family. A larger family size indicates the applicant
 * considered the invention valuable enough to file — and pay fees — in
 * multiple countries. It is a proxy for perceived market value.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value and metadata
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013), "Patent family size" section
 * @see PATSTAT table: tls201_appln (docdb_family_size column)
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateFamilySize(12345, mcpClient);
 * // { indicator: 'family_size', value: 12, available: true, dataSource: 'tls201_appln.docdb_family_size', error: null }
 */
export async function calculateFamilySize(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		const query = `
			SELECT docdb_family_size
			FROM \`tls201_appln\`
			WHERE appln_id = ${applnId}
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.warn(`${LOG_PREFIX} No data for applnId=${applnId}`);
			return {
				indicator: 'family_size',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No data found'
			};
		}

		const raw = rows[0].docdb_family_size;
		const value = raw !== undefined && raw !== '' ? parseInt(raw, 10) : null;

		if (value === null || isNaN(value)) {
			return {
				indicator: 'family_size',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'Invalid value returned'
			};
		}

		console.info(`${LOG_PREFIX} OK: ${value} for applnId=${applnId}`);
		return {
			indicator: 'family_size',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'family_size',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:renewal-duration]';
const DATA_SOURCE = 'tls231_inpadoc_legal_event';

/**
 * Calculates Renewal Duration for a patent.
 *
 * @description Retrieves the maximum maintenance fee renewal year from
 * INPADOC legal events. A longer renewal duration indicates the patent
 * holder continued paying fees to keep the patent alive — a strong signal
 * of long-term perceived commercial value.
 *
 * Returns `{ available: false }` for patents without renewal fee data,
 * which is common for very recent patents or patents in jurisdictions
 * where INPADOC tracking is incomplete. This is expected, not an error.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value (years) and metadata
 *
 * @see OECD Patent Quality Indicators, Section 3.9
 * @see PATSTAT table: tls231_inpadoc_legal_event (renewal fee events)
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateRenewalDuration(12345, mcpClient);
 * // { indicator: 'renewal_duration', value: 15, available: true, dataSource: '...', error: null }
 */
export async function calculateRenewalDuration(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		// tls231 has appln_id directly and fee_renewal_year for renewal fee payments.
		const query = `
			SELECT MAX(le.fee_renewal_year) AS max_renewal_year
			FROM \`tls231_inpadoc_legal_event\` le
			WHERE le.appln_id = ${applnId}
			  AND le.fee_renewal_year > 0
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0 || !rows[0].max_renewal_year || rows[0].max_renewal_year === 'null') {
			console.info(`${LOG_PREFIX} No renewal data for applnId=${applnId}`);
			return {
				indicator: 'renewal_duration',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No renewal fee data available'
			};
		}

		const raw = rows[0].max_renewal_year;
		const value = raw !== undefined && raw !== '' && raw !== 'null' ? parseInt(raw, 10) : null;

		if (value === null || isNaN(value)) {
			return {
				indicator: 'renewal_duration',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'No renewal fee data available'
			};
		}

		console.info(`${LOG_PREFIX} OK: ${value} years for applnId=${applnId}`);
		return {
			indicator: 'renewal_duration',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'renewal_duration',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

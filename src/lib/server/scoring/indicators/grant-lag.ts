import type { McpClient } from '$lib/server/mcp/types';
import { parseMarkdownTable } from '$lib/server/mcp/client';
import type { IndicatorResult } from '../types';

const LOG_PREFIX = '[scoring:grant-lag]';
const DATA_SOURCE = 'tls201_appln + tls211_pat_publn';

/**
 * Calculates Grant Lag for a patent.
 *
 * @description Measures the number of days between the patent's filing date
 * and its earliest grant date. A longer grant lag typically indicates more
 * complex examination — the patent office needed more time to evaluate the
 * claims. Can also reflect applicant strategy (delays, divisionals).
 *
 * Returns `{ available: false }` for patents that have not been granted,
 * as no grant date exists. This is expected behavior, not an error.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Raw indicator value (days) and metadata
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013), "Grant lag" section
 * @see PATSTAT tables: tls201_appln (filing date), tls211_pat_publn (grant date via publn_first_grant)
 * @see Normalization: Winsorization at 98th percentile, cohort-relative 0.0-1.0
 *
 * @example
 * const result = await calculateGrantLag(12345, mcpClient);
 * // { indicator: 'grant_lag_days', value: 1247, available: true, dataSource: '...', error: null }
 */
export async function calculateGrantLag(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult> {
	try {
		const query = `
			SELECT
				a.appln_filing_date,
				MIN(p.publn_date) AS grant_date
			FROM \`tls201_appln\` a
			JOIN \`tls211_pat_publn\` p ON a.appln_id = p.appln_id
			WHERE a.appln_id = ${applnId}
			  AND p.publn_first_grant = 'Y'
			GROUP BY a.appln_filing_date
		`.trim();

		const response = await mcpClient.executeQuery(query, 1);
		const rows = parseMarkdownTable(response);

		if (rows.length === 0) {
			console.info(`${LOG_PREFIX} Patent not granted for applnId=${applnId}`);
			return {
				indicator: 'grant_lag_days',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'Patent not granted'
			};
		}

		const filingDate = rows[0].appln_filing_date;
		const grantDate = rows[0].grant_date;

		if (!filingDate || !grantDate || filingDate === '9999-12-31' || grantDate === '9999-12-31') {
			return {
				indicator: 'grant_lag_days',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'Invalid date data'
			};
		}

		const filing = new Date(filingDate);
		const grant = new Date(grantDate);
		const diffMs = grant.getTime() - filing.getTime();
		const value = Math.round(diffMs / (1000 * 60 * 60 * 24));

		if (value < 0) {
			return {
				indicator: 'grant_lag_days',
				value: null,
				available: false,
				dataSource: DATA_SOURCE,
				error: 'Grant date before filing date'
			};
		}

		console.info(`${LOG_PREFIX} OK: ${value} days for applnId=${applnId}`);
		return {
			indicator: 'grant_lag_days',
			value,
			available: true,
			dataSource: DATA_SOURCE,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error(`${LOG_PREFIX} FAILED for applnId=${applnId}: ${message}`);
		return {
			indicator: 'grant_lag_days',
			value: null,
			available: false,
			dataSource: DATA_SOURCE,
			error: message
		};
	}
}

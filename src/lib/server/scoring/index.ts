import type { McpClient } from '$lib/server/mcp/types';
import type { IndicatorResult, IndicatorName } from './types';
import { calculateForwardCitations } from './indicators/forward-citations';
import { calculateBackwardCitations } from './indicators/backward-citations';
import { calculateFamilySize } from './indicators/family-size';
import { calculateClaimsCount } from './indicators/claims-count';
import { calculateRadicalnessIndex } from './indicators/radicalness-index';
import { calculateGrantLag } from './indicators/grant-lag';
import { calculateRenewalDuration } from './indicators/renewal-duration';

const LOG_PREFIX = '[scoring]';

/** Indicator names for the safety-net fallback, in order of execution */
const INDICATOR_ORDER: IndicatorName[] = [
	'forward_citations',
	'backward_citations',
	'family_size',
	'claims_count',
	'radicalness_index',
	'grant_lag_days',
	'renewal_duration'
	// Generality Index is on-demand only (command), not in this array
];

/**
 * Calculates all available indicators for a patent in parallel.
 *
 * Runs 7 indicators via Promise.allSettled() to ensure partial results
 * when individual indicators fail. Generality Index is excluded — it is
 * triggered on-demand via a separate command due to ~16GB query cost.
 *
 * @param applnId - PATSTAT application ID
 * @param mcpClient - MCP Server client instance
 * @returns Array of IndicatorResult — one per indicator, always 7 elements
 *
 * @see OECD Patent Quality Indicators (2023)
 */
export async function calculateAllIndicators(
	applnId: number,
	mcpClient: McpClient
): Promise<IndicatorResult[]> {
	console.info(
		`${LOG_PREFIX} Calculating ${INDICATOR_ORDER.length} indicators for applnId=${applnId}`
	);

	const results = await Promise.allSettled([
		calculateForwardCitations(applnId, mcpClient),
		calculateBackwardCitations(applnId, mcpClient),
		calculateFamilySize(applnId, mcpClient),
		calculateClaimsCount(applnId, mcpClient),
		calculateRadicalnessIndex(applnId, mcpClient),
		calculateGrantLag(applnId, mcpClient),
		calculateRenewalDuration(applnId, mcpClient)
	]);

	const indicators = results.map((result, index) => {
		if (result.status === 'fulfilled') return result.value;

		// Safety net: individual modules already catch errors internally,
		// but if something truly unexpected happens, we still return a result
		const indicatorName = INDICATOR_ORDER[index];
		const errorMessage =
			result.reason instanceof Error ? result.reason.message : 'Unexpected error';
		console.error(`${LOG_PREFIX} Unexpected failure for ${indicatorName}: ${errorMessage}`);

		return {
			indicator: indicatorName,
			value: null,
			available: false,
			dataSource: 'unknown',
			error: errorMessage
		} satisfies IndicatorResult;
	});

	const succeeded = indicators.filter((i) => i.available).length;
	console.info(`${LOG_PREFIX} Done: ${succeeded}/${indicators.length} indicators available`);

	return indicators;
}

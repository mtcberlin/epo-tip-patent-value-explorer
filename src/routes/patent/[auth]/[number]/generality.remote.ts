import * as v from 'valibot';
import { command } from '$app/server';
import { mcpClient } from '$lib/server/mcp/client';
import { calculateGeneralityIndex } from '$lib/server/scoring/indicators/generality-index';
import { normalizeIndicator } from '$lib/server/scoring/normalization';
import { getCohortStats } from '$lib/server/queries/cohort';
import { getCached, setCached } from '$lib/server/queries/patent-cache';
import { parsePatentNumber, toNormalized } from '$lib/utils/patent-number-parser';
import type { IndicatorResult, NormalizedScore, PatentProfile } from '$lib/server/scoring/types';

const LOG_PREFIX = '[generality:command]';

const ParamsSchema = v.object({
	applnId: v.pipe(v.number(), v.integer(), v.minValue(1)),
	wipoField: v.pipe(v.number(), v.integer(), v.minValue(0)),
	filingYear: v.pipe(v.number(), v.integer(), v.minValue(1900)),
	auth: v.string(),
	number: v.string()
});

interface GeneralityResponse {
	raw: IndicatorResult;
	normalized: NormalizedScore;
}

/**
 * On-demand Generality Index calculation.
 *
 * Calculates the raw value, normalizes against the cohort,
 * and updates the patent cache so future page loads include it.
 */
export const calculateGenerality = command(
	ParamsSchema,
	async (params): Promise<GeneralityResponse> => {
		const { applnId, wipoField, filingYear, auth, number } = v.parse(ParamsSchema, params);

		// Build normalized cache key (same as data.remote.ts)
		const parsed = parsePatentNumber(`${auth}${number}`);
		const cacheKey = parsed ? toNormalized(parsed) : `${auth}${number}`;

		// 1. Calculate raw generality
		const raw = await calculateGeneralityIndex(applnId, mcpClient);

		// 2. Normalize against cohort
		let cohort = null;
		if (wipoField > 0 && filingYear > 0) {
			try {
				cohort = await getCohortStats(wipoField, filingYear, 'generality_index');
			} catch (err) {
				console.error(`${LOG_PREFIX} Failed to get cohort stats:`, err);
			}
		}
		const normalized = normalizeIndicator(
			raw.available ? raw.value : null,
			'generality_index',
			cohort
		);

		// 3. Update patent cache with generality result
		try {
			const cached = await getCached(cacheKey);
			if (cached) {
				const profile = JSON.parse(cached.dataJson) as PatentProfile;

				// Merge raw indicator
				const hasRaw = profile.rawIndicators.some((i) => i.indicator === 'generality_index');
				profile.rawIndicators = hasRaw
					? profile.rawIndicators.map((i) => (i.indicator === 'generality_index' ? raw : i))
					: [...profile.rawIndicators, raw];

				// Merge normalized score
				const hasNorm = profile.normalizedScores.some((s) => s.indicator === 'generality_index');
				profile.normalizedScores = hasNorm
					? profile.normalizedScores.map((s) =>
							s.indicator === 'generality_index' ? normalized : s
						)
					: [...profile.normalizedScores, normalized];

				await setCached(cacheKey, {
					applnId,
					wipoFieldNumber: wipoField,
					dataJson: JSON.stringify(profile),
					expiresAt: cached.expiresAt
				});
				console.info(`${LOG_PREFIX} Cache updated for ${cacheKey}`);
			}
		} catch (err) {
			console.error(`${LOG_PREFIX} Cache update failed:`, err);
		}

		return { raw, normalized };
	}
);

/**
 * Cohort-relative normalization for patent quality indicators.
 *
 * Applies Winsorization at 98% (p1-p99) and linear normalization to 0.0-1.0.
 * Each patent's raw values are compared against its cohort (same WIPO field
 * and filing year) to produce meaningful relative scores.
 *
 * @see OECD Patent Quality Indicators methodology
 */

import type { CohortStatsRow } from '$lib/server/data/types';
import { getCohortStats } from '$lib/server/queries/cohort';
import type { IndicatorResult, NormalizedScore, IndicatorName } from './types';

const LOG_PREFIX = '[scoring:normalization]';
const SMALL_COHORT_THRESHOLD = 30;

/**
 * Winsorization: clamp extreme values to reduce outlier impact.
 * Values below p1 are set to p1, values above p99 are set to p99.
 *
 * @see OECD Patent Quality Indicators — Winsorization at 98%
 */
export function winsorize(rawValue: number, p1: number, p99: number): number {
	return Math.max(p1, Math.min(p99, rawValue));
}

/**
 * Linear normalization to 0.0-1.0 scale within the Winsorized range.
 *
 * normalized = (winsorized - p1) / (p99 - p1)
 *
 * Edge case: if p99 == p1 (degenerate cohort), return 0.5
 */
export function normalizeToScale(winsorizedValue: number, p1: number, p99: number): number {
	if (p99 === p1) return 0.5;
	return (winsorizedValue - p1) / (p99 - p1);
}

/**
 * Estimate percentile position (0-100) using linear interpolation
 * between known percentile breakpoints from cohort statistics.
 */
export function estimatePercentile(rawValue: number, stats: CohortStatsRow): number {
	const breakpoints = [
		{ percentile: 1, value: stats.p1 },
		{ percentile: 5, value: stats.p5 },
		{ percentile: 25, value: stats.p25 },
		{ percentile: 50, value: stats.median },
		{ percentile: 75, value: stats.p75 },
		{ percentile: 95, value: stats.p95 },
		{ percentile: 99, value: stats.p99 }
	];

	// Below lowest breakpoint
	if (rawValue <= breakpoints[0].value) return 1;
	// Above highest breakpoint
	if (rawValue >= breakpoints[breakpoints.length - 1].value) return 99;

	// Find surrounding breakpoints and interpolate
	for (let i = 0; i < breakpoints.length - 1; i++) {
		const lo = breakpoints[i];
		const hi = breakpoints[i + 1];
		if (rawValue >= lo.value && rawValue <= hi.value) {
			if (hi.value === lo.value) return lo.percentile;
			const fraction = (rawValue - lo.value) / (hi.value - lo.value);
			return Math.round(lo.percentile + fraction * (hi.percentile - lo.percentile));
		}
	}

	return 50; // fallback
}

/**
 * Normalize a single indicator value against its cohort.
 *
 * @param rawValue - Raw indicator value, null if unavailable
 * @param indicator - Indicator name for logging
 * @param cohortStats - Cohort statistics for the indicator
 * @returns NormalizedScore with 0.0-1.0 normalized value and percentile
 */
export function normalizeIndicator(
	rawValue: number | null,
	indicator: IndicatorName,
	cohortStats: CohortStatsRow | null
): NormalizedScore {
	if (rawValue === null) {
		return {
			indicator,
			raw: null,
			normalized: null,
			percentile: null,
			available: false,
			cohortSize: cohortStats?.count ?? null,
			smallCohort: (cohortStats?.count ?? 0) < SMALL_COHORT_THRESHOLD
		};
	}

	if (!cohortStats) {
		console.warn(`${LOG_PREFIX} No cohort data for ${indicator} — returning raw only`);
		return {
			indicator,
			raw: rawValue,
			normalized: null,
			percentile: null,
			available: true,
			cohortSize: null,
			smallCohort: false
		};
	}

	const winsorized = winsorize(rawValue, cohortStats.p1, cohortStats.p99);
	const normalized = normalizeToScale(winsorized, cohortStats.p1, cohortStats.p99);
	const percentile = estimatePercentile(rawValue, cohortStats);
	const smallCohort = cohortStats.count < SMALL_COHORT_THRESHOLD;

	return {
		indicator,
		raw: rawValue,
		normalized: +normalized.toFixed(4),
		percentile,
		available: true,
		cohortSize: cohortStats.count,
		smallCohort
	};
}

/**
 * Normalize all raw indicators against their cohort (same WIPO field + filing year).
 *
 * For each available raw indicator, looks up cohort statistics
 * and applies Winsorization + linear normalization.
 *
 * @param rawIndicators - Raw indicator results from scoring engine
 * @param wipoField - WIPO technology field number (1-35)
 * @param filingYear - Patent filing year
 * @returns Array of NormalizedScore for all indicators
 */
export async function normalizeAllIndicators(
	rawIndicators: IndicatorResult[],
	wipoField: number,
	filingYear: number
): Promise<NormalizedScore[]> {
	const results: NormalizedScore[] = [];

	for (const raw of rawIndicators) {
		let cohort: CohortStatsRow | null = null;
		try {
			cohort = await getCohortStats(wipoField, filingYear, raw.indicator);
		} catch (err) {
			console.error(`${LOG_PREFIX} Failed to get cohort for ${raw.indicator}:`, err);
		}

		results.push(normalizeIndicator(raw.available ? raw.value : null, raw.indicator, cohort));
	}

	const normalized = results.filter((r) => r.normalized !== null).length;
	console.info(
		`${LOG_PREFIX} Normalized ${normalized}/${results.length} indicators (field=${wipoField}, year=${filingYear})`
	);

	return results;
}

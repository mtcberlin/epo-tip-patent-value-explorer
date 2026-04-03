/**
 * Composite Quality Index calculation.
 *
 * @description The composite score provides a single summary metric for
 * overall patent quality. Equal weighting is used because the OECD framework
 * does not prescribe indicator weights — all 8 dimensions are considered
 * equally important measures of different quality aspects.
 *
 * Formula: composite = SUM(normalized_i) / COUNT(available_i)
 *
 * @see OECD Patent Quality Indicators, Composite Index methodology
 */

import type { NormalizedScore, CompositeResult } from './types';

/**
 * Calculate the composite quality index from normalized indicator scores.
 *
 * @param normalizedScores - Array of normalized scores (may include null values)
 * @returns Composite score (0.0-1.0), indicator count, and total possible
 *
 * @see OECD Patent Quality Indicators — Equal-weighted composite
 *
 * @example
 * const result = calculateCompositeIndex(scores);
 * // { score: 0.72, indicatorCount: 6, totalIndicators: 8 }
 */
export function calculateCompositeIndex(normalizedScores: NormalizedScore[]): CompositeResult {
	const available = normalizedScores.filter((s) => s.normalized !== null);

	if (available.length === 0) {
		return { score: null, indicatorCount: 0, totalIndicators: 8 };
	}

	const sum = available.reduce((acc, s) => acc + s.normalized!, 0);
	const score = +(sum / available.length).toFixed(4);

	return {
		score,
		indicatorCount: available.length,
		totalIndicators: 8
	};
}

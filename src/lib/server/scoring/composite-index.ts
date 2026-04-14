/**
 * Composite Quality Index calculation.
 *
 * @description Equal-weighted mean of a fixed subset of OECD indicators,
 * following Squicciarini & Dernis (2013) §4 — six components (Forward
 * Citations, Family Size, Claims, Generality, Originality, Radicalness).
 *
 * PVE excludes Generality from the standard composite because computing
 * it requires scanning ~16 GB on tls224_appln_cpc per patent (every
 * citing patent's CPC classes). Generality is offered on-demand in the
 * UI and is intentionally not part of this index.
 *
 * Backward Citations and Patent Scope are reported as standalone OECD
 * indicators but, per Squicciarini & Dernis, are not part of the
 * composite definition.
 *
 * Formula: composite = SUM(normalized_i) / COUNT(available_i),
 * restricted to the 5 indicators listed in COMPOSITE_INDICATORS.
 */

import type { NormalizedScore, CompositeResult } from './types';
import { COMPOSITE_INDICATORS } from '$lib/scoring/types';

export { COMPOSITE_INDICATORS };

/**
 * Calculate the composite quality index from normalized indicator scores.
 *
 * @param normalizedScores - Array of normalized scores (may include null values
 *                           and indicators outside the composite definition)
 * @returns Composite score (0.0-1.0), indicator count, and total possible
 *
 * @example
 * const result = calculateCompositeIndex(scores);
 * // { score: 0.72, indicatorCount: 4, totalIndicators: 5 }
 */
export function calculateCompositeIndex(normalizedScores: NormalizedScore[]): CompositeResult {
	const composite = normalizedScores.filter(
		(s) => s.normalized !== null && COMPOSITE_INDICATORS.includes(s.indicator)
	);

	if (composite.length === 0) {
		return { score: null, indicatorCount: 0, totalIndicators: COMPOSITE_INDICATORS.length };
	}

	const sum = composite.reduce((acc, s) => acc + s.normalized!, 0);
	const score = +(sum / composite.length).toFixed(4);

	return {
		score,
		indicatorCount: composite.length,
		totalIndicators: COMPOSITE_INDICATORS.length
	};
}

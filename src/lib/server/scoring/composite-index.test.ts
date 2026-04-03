import { describe, it, expect } from 'vitest';
import { calculateCompositeIndex } from './composite-index';
import type { NormalizedScore } from './types';

function makeScore(indicator: string, normalized: number | null): NormalizedScore {
	return {
		indicator: indicator as NormalizedScore['indicator'],
		raw: normalized !== null ? normalized * 100 : null,
		normalized,
		percentile: normalized !== null ? Math.round(normalized * 100) : null,
		available: normalized !== null,
		cohortSize: 5000,
		smallCohort: false
	};
}

describe('calculateCompositeIndex', () => {
	it('averages all 8 indicators when all available', () => {
		const scores = [
			makeScore('forward_citations', 0.9),
			makeScore('backward_citations', 0.7),
			makeScore('family_size', 0.8),
			makeScore('generality_index', 0.6),
			makeScore('radicalness_index', 0.5),
			makeScore('claims_count', 0.8),
			makeScore('grant_lag_days', 0.4),
			makeScore('renewal_duration', 0.7)
		];

		const result = calculateCompositeIndex(scores);

		expect(result.score).toBeCloseTo(0.675, 3);
		expect(result.indicatorCount).toBe(8);
		expect(result.totalIndicators).toBe(8);
	});

	it('averages only available indicators (5 of 8)', () => {
		const scores = [
			makeScore('forward_citations', 0.9),
			makeScore('backward_citations', 0.7),
			makeScore('family_size', null),
			makeScore('generality_index', null),
			makeScore('radicalness_index', 0.5),
			makeScore('claims_count', 0.8),
			makeScore('grant_lag_days', null),
			makeScore('renewal_duration', 0.7)
		];

		const result = calculateCompositeIndex(scores);

		// (0.9 + 0.7 + 0.5 + 0.8 + 0.7) / 5 = 0.72
		expect(result.score).toBeCloseTo(0.72, 3);
		expect(result.indicatorCount).toBe(5);
		expect(result.totalIndicators).toBe(8);
	});

	it('handles single indicator', () => {
		const scores = [makeScore('forward_citations', 0.85)];

		const result = calculateCompositeIndex(scores);

		expect(result.score).toBeCloseTo(0.85, 3);
		expect(result.indicatorCount).toBe(1);
	});

	it('returns null when zero indicators available', () => {
		const scores = [makeScore('forward_citations', null), makeScore('backward_citations', null)];

		const result = calculateCompositeIndex(scores);

		expect(result.score).toBeNull();
		expect(result.indicatorCount).toBe(0);
		expect(result.totalIndicators).toBe(8);
	});

	it('returns null for empty array', () => {
		const result = calculateCompositeIndex([]);

		expect(result.score).toBeNull();
		expect(result.indicatorCount).toBe(0);
	});
});

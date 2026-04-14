import { describe, it, expect } from 'vitest';
import { calculateCompositeIndex, COMPOSITE_INDICATORS } from './composite-index';
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
	it('exposes the OECD 5-component composite definition', () => {
		expect(COMPOSITE_INDICATORS).toEqual([
			'forward_citations',
			'family_size',
			'claims_count',
			'originality_index',
			'radicalness_index'
		]);
	});

	it('averages all 5 composite indicators when all available', () => {
		const scores = [
			makeScore('forward_citations', 0.9),
			makeScore('family_size', 0.8),
			makeScore('claims_count', 0.8),
			makeScore('originality_index', 0.5),
			makeScore('radicalness_index', 0.6)
		];

		const result = calculateCompositeIndex(scores);

		// (0.9 + 0.8 + 0.8 + 0.5 + 0.6) / 5 = 0.72
		expect(result.score).toBeCloseTo(0.72, 3);
		expect(result.indicatorCount).toBe(5);
		expect(result.totalIndicators).toBe(5);
	});

	it('ignores indicators outside the composite definition', () => {
		const scores = [
			makeScore('forward_citations', 0.9),
			makeScore('family_size', 0.8),
			makeScore('claims_count', 0.8),
			makeScore('originality_index', 0.5),
			makeScore('radicalness_index', 0.6),
			// Not in composite — should be excluded:
			makeScore('backward_citations', 0.1),
			makeScore('patent_scope', 0.0),
			makeScore('grant_lag_days', 0.0),
			makeScore('renewal_duration', 0.1),
			makeScore('generality_index', 0.0)
		];

		const result = calculateCompositeIndex(scores);

		// Same mean as the previous test — extras don't change the result
		expect(result.score).toBeCloseTo(0.72, 3);
		expect(result.indicatorCount).toBe(5);
	});

	it('averages only available composite indicators (3 of 5)', () => {
		const scores = [
			makeScore('forward_citations', 0.9),
			makeScore('family_size', null),
			makeScore('claims_count', 0.8),
			makeScore('originality_index', null),
			makeScore('radicalness_index', 0.7)
		];

		const result = calculateCompositeIndex(scores);

		// (0.9 + 0.8 + 0.7) / 3 = 0.8
		expect(result.score).toBeCloseTo(0.8, 3);
		expect(result.indicatorCount).toBe(3);
		expect(result.totalIndicators).toBe(5);
	});

	it('handles a single available composite indicator', () => {
		const scores = [
			makeScore('forward_citations', 0.85),
			makeScore('family_size', null),
			makeScore('claims_count', null),
			makeScore('originality_index', null),
			makeScore('radicalness_index', null)
		];

		const result = calculateCompositeIndex(scores);

		expect(result.score).toBeCloseTo(0.85, 3);
		expect(result.indicatorCount).toBe(1);
	});

	it('returns null when no composite indicator is available', () => {
		const scores = [
			makeScore('forward_citations', null),
			makeScore('family_size', null),
			makeScore('claims_count', null),
			makeScore('originality_index', null),
			makeScore('radicalness_index', null),
			// Non-composite scores being available must not produce a composite:
			makeScore('backward_citations', 0.9),
			makeScore('patent_scope', 0.5)
		];

		const result = calculateCompositeIndex(scores);

		expect(result.score).toBeNull();
		expect(result.indicatorCount).toBe(0);
		expect(result.totalIndicators).toBe(5);
	});

	it('returns null for empty array', () => {
		const result = calculateCompositeIndex([]);

		expect(result.score).toBeNull();
		expect(result.indicatorCount).toBe(0);
	});
});

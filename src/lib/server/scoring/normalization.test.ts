import { describe, it, expect, vi } from 'vitest';
import type { CohortStatsRow } from '$lib/server/data/types';

// Mock the cohort query
vi.mock('$lib/server/queries/cohort', () => ({
	getCohortStats: vi.fn()
}));

import {
	winsorize,
	normalizeToScale,
	estimatePercentile,
	normalizeIndicator,
	normalizeAllIndicators
} from './normalization';
import { getCohortStats } from '$lib/server/queries/cohort';

const mockCohort: CohortStatsRow = {
	wipoFieldNumber: 6,
	wipoFieldName: 'Computer technology',
	filingYear: 2015,
	indicator: 'forward_citations',
	count: 5000,
	mean: 8.5,
	median: 3,
	p1: 0,
	p5: 0,
	p25: 1,
	p75: 8,
	p95: 35,
	p99: 95,
	max: 500
};

describe('winsorize', () => {
	it('returns value unchanged when within range', () => {
		expect(winsorize(50, 0, 95)).toBe(50);
	});

	it('caps at p99 when above', () => {
		expect(winsorize(200, 0, 95)).toBe(95);
	});

	it('caps at p1 when below', () => {
		expect(winsorize(-5, 0, 95)).toBe(0);
	});

	it('returns p1 when value equals p1', () => {
		expect(winsorize(0, 0, 95)).toBe(0);
	});

	it('returns p99 when value equals p99', () => {
		expect(winsorize(95, 0, 95)).toBe(95);
	});
});

describe('normalizeToScale', () => {
	it('returns 0.0 at p1', () => {
		expect(normalizeToScale(0, 0, 95)).toBe(0);
	});

	it('returns 1.0 at p99', () => {
		expect(normalizeToScale(95, 0, 95)).toBe(1);
	});

	it('returns ~0.5 at midpoint', () => {
		expect(normalizeToScale(47.5, 0, 95)).toBeCloseTo(0.5, 2);
	});

	it('returns 0.5 when p99 == p1 (degenerate cohort)', () => {
		expect(normalizeToScale(10, 10, 10)).toBe(0.5);
	});
});

describe('estimatePercentile', () => {
	it('returns 1 for values at or below p1', () => {
		expect(estimatePercentile(-1, mockCohort)).toBe(1);
		expect(estimatePercentile(0, mockCohort)).toBe(1);
	});

	it('returns 99 for values at or above p99', () => {
		expect(estimatePercentile(95, mockCohort)).toBe(99);
		expect(estimatePercentile(200, mockCohort)).toBe(99);
	});

	it('returns 50 for median value', () => {
		expect(estimatePercentile(3, mockCohort)).toBe(50);
	});

	it('interpolates between breakpoints', () => {
		// Between p25 (1) and p50 (3), value 2 should be ~37
		const result = estimatePercentile(2, mockCohort);
		expect(result).toBeGreaterThan(25);
		expect(result).toBeLessThan(50);
	});
});

describe('normalizeIndicator', () => {
	it('returns null normalized when rawValue is null', () => {
		const result = normalizeIndicator(null, 'forward_citations', mockCohort);
		expect(result.normalized).toBeNull();
		expect(result.percentile).toBeNull();
		expect(result.available).toBe(false);
	});

	it('returns null normalized when no cohort data', () => {
		const result = normalizeIndicator(50, 'forward_citations', null);
		expect(result.raw).toBe(50);
		expect(result.normalized).toBeNull();
		expect(result.available).toBe(true);
	});

	it('normalizes a normal value correctly', () => {
		const result = normalizeIndicator(47.5, 'forward_citations', mockCohort);
		expect(result.raw).toBe(47.5);
		expect(result.normalized).toBeCloseTo(0.5, 2);
		expect(result.percentile).toBeGreaterThan(75);
		expect(result.available).toBe(true);
		expect(result.cohortSize).toBe(5000);
		expect(result.smallCohort).toBe(false);
	});

	it('winsorizes value above p99', () => {
		const result = normalizeIndicator(200, 'forward_citations', mockCohort);
		expect(result.normalized).toBe(1);
	});

	it('winsorizes value below p1', () => {
		const result = normalizeIndicator(-5, 'forward_citations', mockCohort);
		expect(result.normalized).toBe(0);
	});

	it('flags small cohort', () => {
		const smallCohort = { ...mockCohort, count: 15 };
		const result = normalizeIndicator(50, 'forward_citations', smallCohort);
		expect(result.smallCohort).toBe(true);
	});

	it('handles zero value', () => {
		const result = normalizeIndicator(0, 'forward_citations', mockCohort);
		expect(result.normalized).toBe(0);
		expect(result.available).toBe(true);
	});
});

describe('normalizeAllIndicators', () => {
	it('normalizes available indicators and skips unavailable ones', async () => {
		vi.mocked(getCohortStats).mockResolvedValue(mockCohort);

		const rawIndicators = [
			{
				indicator: 'forward_citations' as const,
				value: 47,
				available: true,
				dataSource: 'test',
				error: null
			},
			{
				indicator: 'backward_citations' as const,
				value: null,
				available: false,
				dataSource: 'test',
				error: 'timeout'
			}
		];

		const results = await normalizeAllIndicators(rawIndicators, 6, 2015);

		expect(results).toHaveLength(2);
		expect(results[0].normalized).not.toBeNull();
		expect(results[0].available).toBe(true);
		expect(results[1].normalized).toBeNull();
		expect(results[1].available).toBe(false);
	});

	it('handles missing cohort data gracefully', async () => {
		vi.mocked(getCohortStats).mockResolvedValue(null);

		const rawIndicators = [
			{
				indicator: 'forward_citations' as const,
				value: 47,
				available: true,
				dataSource: 'test',
				error: null
			}
		];

		const results = await normalizeAllIndicators(rawIndicators, 99, 1900);

		expect(results[0].raw).toBe(47);
		expect(results[0].normalized).toBeNull();
		expect(results[0].available).toBe(true);
	});
});

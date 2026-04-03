import { describe, it, expect, vi } from 'vitest';
import type { CohortStatsRow } from '$lib/server/data/types';

const sampleRow: CohortStatsRow = {
	wipoFieldNumber: 6,
	wipoFieldName: 'Computer technology',
	filingYear: 2015,
	indicator: 'forward_citations',
	count: 1200,
	mean: 12.5,
	median: 8.0,
	p1: 0.0,
	p5: 1.0,
	p25: 3.0,
	p75: 15.0,
	p95: 45.0,
	p99: 120.0,
	max: 350.0
};

const otherRow: CohortStatsRow = {
	...sampleRow,
	wipoFieldNumber: 4,
	wipoFieldName: 'Digital communication',
	filingYear: 2018,
	indicator: 'backward_citations'
};

vi.mock('$lib/server/data/cohort-stats.json', () => ({
	default: [sampleRow, otherRow]
}));

const { getCohortStats } = await import('./cohort');

describe('getCohortStats', () => {
	it('returns cohort stats when found', async () => {
		const result = await getCohortStats(6, 2015, 'forward_citations');
		expect(result).toEqual(sampleRow);
	});

	it('returns null when no matching cohort found', async () => {
		const result = await getCohortStats(999, 2000, 'forward_citations');
		expect(result).toBeNull();
	});

	it('returns null when only partial match', async () => {
		const result = await getCohortStats(6, 2015, 'backward_citations');
		expect(result).toBeNull();
	});
});

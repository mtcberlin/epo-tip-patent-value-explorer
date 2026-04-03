import { describe, it, expect, vi } from 'vitest';
import type { WipoPmiRow } from '$lib/server/data/types';

const samplePmi: WipoPmiRow = {
	wipoFieldNumber: 6,
	wipoFieldName: 'Computer technology',
	activityLevel: 1.85,
	cagr: 0.092,
	pmiScore: 1.24,
	classification: 'HIGH'
};

vi.mock('$lib/server/data/wipo-pmi.json', () => ({
	default: [samplePmi]
}));

const { getPmiByField } = await import('./pmi');

describe('getPmiByField', () => {
	it('returns PMI data when field exists', async () => {
		const result = await getPmiByField(6);
		expect(result).toEqual(samplePmi);
	});

	it('returns null when field does not exist', async () => {
		const result = await getPmiByField(999);
		expect(result).toBeNull();
	});
});

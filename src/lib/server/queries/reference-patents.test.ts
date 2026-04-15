import { describe, it, expect, vi } from 'vitest';
import type { ReferencePatentRow } from '$lib/server/data/types';

const samplePatent: ReferencePatentRow = {
	publicationNumber: 'EP1234567B1',
	title: 'Test Patent',
	applicant: 'Test Corp',
	filingDate: '2015-03-15',
	grantDate: '2018-07-22',
	applnId: 100001,
	wipoFieldNumber: 6,
	wipoFieldName: 'Computer technology',
	cpcCodes: 'G06F 16/00',
	description: 'Test description',
	archetype: 'Breakthrough Innovation',
	forwardCitations: 89,
	backwardCitations: 34,
	familySize: 28,
	generalityIndex: 0.78,
	originalityIndex: 0.65,
	radicalnessIndex: 0.5,
	claimsCount: 42,
	patentScope: 5,
	grantLagDays: 1195,
	renewalDuration: 18,
	forwardCitationsNormalized: 0.92,
	backwardCitationsNormalized: 0.71,
	familySizeNormalized: 0.85,
	generalityIndexNormalized: 0.88,
	originalityIndexNormalized: 0.76,
	radicalnessIndexNormalized: 0.6,
	claimsCountNormalized: 0.81,
	patentScopeNormalized: 0.6,
	grantLagNormalized: 0.45,
	renewalDurationNormalized: 0.9,
	compositeScore: 0.79
};

vi.mock('$lib/server/data/reference-patents.json', () => ({
	default: [samplePatent]
}));

const { getAllReferencePatents, getByPublicationNumber } = await import('./reference-patents');

describe('getAllReferencePatents', () => {
	it('returns all reference patents', async () => {
		const result = await getAllReferencePatents();
		expect(result).toEqual([samplePatent]);
		expect(result).toHaveLength(1);
	});
});

describe('getByPublicationNumber', () => {
	it('returns patent when found', async () => {
		const result = await getByPublicationNumber('EP1234567B1');
		expect(result).toEqual(samplePatent);
	});

	it('returns null when not found', async () => {
		const result = await getByPublicationNumber('NONEXISTENT');
		expect(result).toBeNull();
	});
});

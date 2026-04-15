import { describe, it, expect } from 'vitest';
import { mapReferenceToProfile } from './reference-patent-mapper';
import type { ReferencePatentRow } from '$lib/server/data/types';
import { INDICATOR_NAMES } from '$lib/scoring/types';

const fullRef: ReferencePatentRow = {
	publicationNumber: 'EP2771468B1',
	title: 'CRISPR-Cas9 Gene Editing',
	applicant: 'The Broad Institute, Inc.; MIT',
	filingDate: '2013-12-12',
	grantDate: '2015-02-11',
	applnId: 414237564,
	wipoFieldNumber: 15,
	wipoFieldName: 'Biotechnology',
	cpcCodes: '["C12N 15/102","G16B 20/50"]',
	description: 'Revolutionary gene editing technology',
	archetype: 'Disruptor',
	forwardCitations: 189,
	backwardCitations: 25,
	familySize: 16,
	generalityIndex: 0.49,
	originalityIndex: 0.56,
	radicalnessIndex: 0.42,
	claimsCount: 17,
	patentScope: 3,
	grantLagDays: 426,
	renewalDuration: 8,
	forwardCitationsNormalized: 1.0,
	backwardCitationsNormalized: 0.2,
	familySizeNormalized: 0.41,
	generalityIndexNormalized: 0.7,
	originalityIndexNormalized: 0.76,
	radicalnessIndexNormalized: 0.55,
	claimsCountNormalized: 0.33,
	patentScopeNormalized: 0.5,
	grantLagNormalized: 0.07,
	renewalDurationNormalized: 0.44,
	compositeScore: 0.49
};

const partialRef: ReferencePatentRow = {
	...fullRef,
	publicationNumber: 'US1234567A1',
	grantDate: null,
	generalityIndex: null,
	grantLagDays: null,
	generalityIndexNormalized: null,
	grantLagNormalized: null
};

describe('mapReferenceToProfile', () => {
	it('maps all fields correctly for a full reference patent', () => {
		const profile = mapReferenceToProfile(fullRef);

		expect(profile.publicationNumber).toBe('EP2771468B1');
		expect(profile.title).toBe('CRISPR-Cas9 Gene Editing');
		expect(profile.applicants).toEqual(['The Broad Institute, Inc.', 'MIT']);
		expect(profile.filingDate).toBe('2013-12-12');
		expect(profile.grantDate).toBe('2015-02-11');
		expect(profile.grantStatus).toBe('granted');
		expect(profile.cpcCodes).toEqual(['C12N 15/102', 'G16B 20/50']);
		expect(profile.wipoFieldNumber).toBe(15);
		expect(profile.wipoFieldName).toBe('Biotechnology');
		expect(profile.applnId).toBe(414237564);
		expect(profile.compositeScore).toBe(0.49);
		expect(profile.pmiData).toBeNull();
		expect(profile.narrative).toBeNull();
	});

	it('maps all 10 raw indicators', () => {
		const profile = mapReferenceToProfile(fullRef);

		expect(profile.rawIndicators).toHaveLength(10);
		for (const ri of profile.rawIndicators) {
			expect(ri.available).toBe(true);
			expect(ri.value).not.toBeNull();
			expect(ri.error).toBeNull();
			expect(ri.dataSource).toBe('reference_patents');
		}

		const fwd = profile.rawIndicators.find((r) => r.indicator === 'forward_citations');
		expect(fwd?.value).toBe(189);
	});

	it('maps all 10 normalized scores', () => {
		const profile = mapReferenceToProfile(fullRef);

		expect(profile.normalizedScores).toHaveLength(10);
		for (const ns of profile.normalizedScores) {
			expect(ns.available).toBe(true);
			expect(ns.normalized).not.toBeNull();
			expect(ns.percentile).toBeNull();
			expect(ns.cohortSize).toBeNull();
			expect(ns.smallCohort).toBe(false);
		}

		const fwd = profile.normalizedScores.find((n) => n.indicator === 'forward_citations');
		expect(fwd?.normalized).toBe(1.0);
		expect(fwd?.raw).toBe(189);
	});

	it('handles null indicators correctly', () => {
		const profile = mapReferenceToProfile(partialRef);

		const generality = profile.rawIndicators.find((r) => r.indicator === 'generality_index');
		expect(generality?.available).toBe(false);
		expect(generality?.value).toBeNull();

		const grantLag = profile.normalizedScores.find((n) => n.indicator === 'grant_lag_days');
		expect(grantLag?.available).toBe(false);
		expect(grantLag?.normalized).toBeNull();

		// Non-null indicators still available
		const fwd = profile.rawIndicators.find((r) => r.indicator === 'forward_citations');
		expect(fwd?.available).toBe(true);
	});

	it('sets grantStatus to pending when grantDate is null', () => {
		const profile = mapReferenceToProfile(partialRef);
		expect(profile.grantStatus).toBe('pending');
	});

	it('handles malformed cpcCodes JSON gracefully', () => {
		const badRef = { ...fullRef, cpcCodes: 'not-json' };
		const profile = mapReferenceToProfile(badRef);
		expect(profile.cpcCodes).toEqual([]);
	});

	it('includes all indicator names in correct order', () => {
		const profile = mapReferenceToProfile(fullRef);
		const indicatorNames = profile.rawIndicators.map((r) => r.indicator);
		expect(indicatorNames).toEqual(INDICATOR_NAMES);
	});
});

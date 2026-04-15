import { describe, it, expect } from 'vitest';
import { METHODOLOGY_CONTENT, type MethodologyContent } from './methodology-content';
import { INDICATOR_NAMES, type IndicatorName } from '$lib/scoring/types';

describe('methodology-content', () => {
	it('has an entry for every indicator', () => {
		for (const name of INDICATOR_NAMES) {
			expect(METHODOLOGY_CONTENT[name]).toBeDefined();
		}
	});

	it('each entry has all required fields', () => {
		for (const name of INDICATOR_NAMES) {
			const entry: MethodologyContent = METHODOLOGY_CONTENT[name];
			expect(entry.formula).toBeTruthy();
			expect(entry.patstatSource).toBeTruthy();
			expect(entry.normalizationMethod).toBeTruthy();
			expect(entry.oecdSection).toBeTruthy();
			expect(entry.unavailableReason).toBeTruthy();
		}
	});

	it.each([
		['forward_citations', 'tls201.nb_citing_docdb_fam', '"Forward citations"'],
		['backward_citations', 'tls212 (citations)', '"Backward citations"'],
		['patent_scope', 'tls224_appln_cpc', '"Patent scope"'],
		['family_size', 'tls201 + tls218 (family links)', '"Patent family size"'],
		['claims_count', 'tls201.nb_claims', '"Claims"'],
		['generality_index', 'tls228 + tls224', '"Generality index"'],
		['originality_index', 'tls212 + tls224', '"Originality index"'],
		['radicalness_index', 'tls212 + tls224', '"Radicalness index"'],
		['grant_lag_days', 'tls201 + tls231', '"Grant lag"'],
		['renewal_duration', 'tls231 (INPADOC legal events)', '"Patent renewal"']
	] as const)(
		'%s has correct PATSTAT source and OECD section',
		(indicator, expectedSource, expectedSection) => {
			const entry = METHODOLOGY_CONTENT[indicator as IndicatorName];
			expect(entry.patstatSource).toBe(expectedSource);
			expect(entry.oecdSection).toBe(expectedSection);
		}
	);

	it('generality_index has formulaDisplay', () => {
		expect(METHODOLOGY_CONTENT.generality_index.formulaDisplay).toBeTruthy();
	});

	it('originality_index has formulaDisplay', () => {
		expect(METHODOLOGY_CONTENT.originality_index.formulaDisplay).toBeTruthy();
	});

	it('forward_citations does not have formulaDisplay', () => {
		expect(METHODOLOGY_CONTENT.forward_citations.formulaDisplay).toBeUndefined();
	});
});

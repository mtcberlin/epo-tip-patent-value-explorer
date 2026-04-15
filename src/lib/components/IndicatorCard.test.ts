import { describe, it, expect } from 'vitest';
import { METHODOLOGY_CONTENT } from '$lib/config/methodology-content';
import { INDICATOR_NAMES } from '$lib/scoring/types';

describe('IndicatorCard', () => {
	it('methodology content is available for all indicators used by card', () => {
		for (const name of INDICATOR_NAMES) {
			expect(METHODOLOGY_CONTENT[name]).toBeDefined();
			expect(METHODOLOGY_CONTENT[name].formula).toBeTruthy();
		}
	});

	it('each indicator has a PATSTAT source for methodology display', () => {
		for (const name of INDICATOR_NAMES) {
			expect(METHODOLOGY_CONTENT[name].patstatSource).toBeTruthy();
		}
	});

	it('each indicator has an OECD section reference', () => {
		for (const name of INDICATOR_NAMES) {
			// Named sections from Squicciarini, Dernis & Criscuolo (2013), e.g. '"Forward citations"'
			expect(METHODOLOGY_CONTENT[name].oecdSection).toMatch(/^"[A-Z][A-Za-z ]+( index)?"$/);
		}
	});

	it('generality_index has formulaDisplay for expanded methodology', () => {
		expect(METHODOLOGY_CONTENT.generality_index.formulaDisplay).toBeTruthy();
	});

	it('all indicators have unavailable reasons for methodology display', () => {
		for (const name of INDICATOR_NAMES) {
			expect(METHODOLOGY_CONTENT[name].unavailableReason.length).toBeGreaterThan(0);
		}
	});
});

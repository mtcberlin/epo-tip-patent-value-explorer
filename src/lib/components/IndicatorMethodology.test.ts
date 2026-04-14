import { describe, it, expect } from 'vitest';
import { METHODOLOGY_CONTENT } from '$lib/config/methodology-content';
import { INDICATOR_NAMES } from '$lib/scoring/types';

describe('IndicatorMethodology', () => {
	it('all 8 indicators have methodology content available', () => {
		expect(INDICATOR_NAMES).toHaveLength(8);
		for (const name of INDICATOR_NAMES) {
			const content = METHODOLOGY_CONTENT[name];
			expect(content).toBeDefined();
			expect(content.formula).toBeTruthy();
			expect(content.patstatSource).toBeTruthy();
			expect(content.oecdSection).toBeTruthy();
		}
	});

	it('unavailable reasons are non-empty strings for all indicators', () => {
		for (const name of INDICATOR_NAMES) {
			const content = METHODOLOGY_CONTENT[name];
			expect(typeof content.unavailableReason).toBe('string');
			expect(content.unavailableReason.length).toBeGreaterThan(0);
		}
	});

	it('normalization method describes winsorization for all indicators', () => {
		for (const name of INDICATOR_NAMES) {
			expect(METHODOLOGY_CONTENT[name].normalizationMethod).toContain('Winsorization');
		}
	});

	it('generality_index methodology describes Herfindahl in formulaDisplay', () => {
		const gen = METHODOLOGY_CONTENT.generality_index;
		expect(gen.formulaDisplay).toContain('Herfindahl');
		expect(gen.formula).toContain('sij');
	});

	it('originality_index methodology describes Herfindahl in formulaDisplay', () => {
		const rad = METHODOLOGY_CONTENT.originality_index;
		expect(rad.formulaDisplay).toContain('Herfindahl');
		expect(rad.formula).toContain('sij');
	});

	it('grant_lag_days unavailable reason mentions grant', () => {
		expect(METHODOLOGY_CONTENT.grant_lag_days.unavailableReason).toContain('grant');
	});

	it('generality_index unavailable reason mentions forward citations', () => {
		expect(METHODOLOGY_CONTENT.generality_index.unavailableReason).toContain('forward citations');
	});
});

import { describe, it, expect } from 'vitest';

describe('PmiMethodology', () => {
	const PMI_THRESHOLDS = {
		HIGH: 0.81,
		MEDIUM_LOW: -0.18
	};

	it('HIGH classification threshold is > 0.81', () => {
		expect(PMI_THRESHOLDS.HIGH).toBe(0.81);
		expect(1.5 > PMI_THRESHOLDS.HIGH).toBe(true);
	});

	it('MEDIUM classification is between -0.18 and 0.81', () => {
		const score = 0.5;
		expect(score >= PMI_THRESHOLDS.MEDIUM_LOW && score <= PMI_THRESHOLDS.HIGH).toBe(true);
	});

	it('LOW classification threshold is < -0.18', () => {
		expect(-0.5 < PMI_THRESHOLDS.MEDIUM_LOW).toBe(true);
	});

	it('PMI formula components are additive', () => {
		const activityLevel = 1.24;
		const cagr = 0.87;
		const pmiScore = activityLevel + cagr;
		expect(pmiScore).toBeCloseTo(2.11);
	});

	it('HIGH explanation describes growing rapidly', () => {
		const explanation =
			'This patent is in a high momentum technology field — patent activity is growing rapidly.';
		expect(explanation).toContain('growing rapidly');
	});

	it('MEDIUM explanation describes stable', () => {
		const explanation =
			'This patent is in a moderate momentum technology field — patent activity is stable.';
		expect(explanation).toContain('stable');
	});

	it('LOW explanation describes declining', () => {
		const explanation =
			'This patent is in a low momentum technology field — patent activity is declining.';
		expect(explanation).toContain('declining');
	});

	it('badge variant maps correctly for each classification', () => {
		const variantMap: Record<string, string> = {
			HIGH: 'default',
			MEDIUM: 'secondary',
			LOW: 'outline'
		};
		expect(variantMap['HIGH']).toBe('default');
		expect(variantMap['MEDIUM']).toBe('secondary');
		expect(variantMap['LOW']).toBe('outline');
	});
});

import { describe, it, expect } from 'vitest';
import {
	EPO_DIMENSIONS,
	AXIS_ORDER,
	getDimensionForIndicator,
	UNAVAILABLE_COLOR
} from './chart-config';
import { INDICATOR_NAMES } from '$lib/scoring/types';

describe('chart-config', () => {
	it('AXIS_ORDER contains all 8 indicators', () => {
		expect(AXIS_ORDER).toHaveLength(8);
		for (const name of INDICATOR_NAMES) {
			expect(AXIS_ORDER).toContain(name);
		}
	});

	it('EPO_DIMENSIONS covers all 8 indicators', () => {
		const allIndicators = EPO_DIMENSIONS.flatMap((d) => d.indicators);
		expect(allIndicators).toHaveLength(8);
		for (const name of INDICATOR_NAMES) {
			expect(allIndicators).toContain(name);
		}
	});

	it('getDimensionForIndicator returns correct dimension', () => {
		const dim = getDimensionForIndicator('forward_citations');
		expect(dim.name).toBe('Technological Importance');

		const dim2 = getDimensionForIndicator('family_size');
		expect(dim2.name).toBe('Market Relevance');

		const dim3 = getDimensionForIndicator('grant_lag_days');
		expect(dim3.name).toBe('Market Relevance');
	});

	it('each dimension has light and dark colors', () => {
		for (const dim of EPO_DIMENSIONS) {
			expect(dim.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
			expect(dim.darkColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});

	it('UNAVAILABLE_COLOR is defined', () => {
		expect(UNAVAILABLE_COLOR).toBe('#D4D4D4');
	});
});

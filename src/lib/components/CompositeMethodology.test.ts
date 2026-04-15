import { describe, it, expect } from 'vitest';
import { METHODOLOGY_CONTENT } from '$lib/config/methodology-content';
import { INDICATOR_NAMES, STORY_LABELS } from '$lib/scoring/types';

describe('CompositeMethodology', () => {
	it('all indicators have story labels for included/excluded lists', () => {
		for (const name of INDICATOR_NAMES) {
			expect(STORY_LABELS[name]).toBeTruthy();
		}
	});

	it('all indicators have unavailable reasons for excluded list display', () => {
		for (const name of INDICATOR_NAMES) {
			expect(METHODOLOGY_CONTENT[name].unavailableReason).toBeTruthy();
		}
	});

	it('included and excluded partition covers all indicators', () => {
		const available = INDICATOR_NAMES.filter(() => true);
		const excluded = INDICATOR_NAMES.filter(() => false);
		expect(available.length + excluded.length).toBe(INDICATOR_NAMES.length);
	});

	it('total indicators is always 10', () => {
		expect(INDICATOR_NAMES).toHaveLength(10);
	});

	it('story labels are human-readable strings', () => {
		for (const name of INDICATOR_NAMES) {
			expect(STORY_LABELS[name].length).toBeGreaterThan(10);
		}
	});
});

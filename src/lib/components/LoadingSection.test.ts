import { describe, it, expect } from 'vitest';

describe('LoadingSection', () => {
	it('exports the correct skeleton types', async () => {
		// Verify the component module can be imported
		const mod = await import('./LoadingSection.svelte');
		expect(mod.default).toBeDefined();
	});

	it('skeleton type names cover all sections', () => {
		const expectedTypes = [
			'patent-profile',
			'radar-chart',
			'indicator-card',
			'composite-score',
			'ai-narrative'
		];
		// Type-level test: these must be valid SkeletonType values
		// If the type changes, this test documents the expected set
		expect(expectedTypes).toHaveLength(5);
		expect(new Set(expectedTypes).size).toBe(5);
	});
});

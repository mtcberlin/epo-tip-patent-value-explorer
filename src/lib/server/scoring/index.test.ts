import { describe, it, expect, vi } from 'vitest';
import type { McpClient } from '$lib/server/mcp/types';

// Mock all indicator modules
vi.mock('./indicators/forward-citations', () => ({
	calculateForwardCitations: vi.fn()
}));
vi.mock('./indicators/backward-citations', () => ({
	calculateBackwardCitations: vi.fn()
}));
vi.mock('./indicators/family-size', () => ({
	calculateFamilySize: vi.fn()
}));
vi.mock('./indicators/claims-count', () => ({
	calculateClaimsCount: vi.fn()
}));
vi.mock('./indicators/originality-index', () => ({
	calculateOriginalityIndex: vi.fn(),
	calculateHerfindahl: vi.fn()
}));
vi.mock('./indicators/grant-lag', () => ({
	calculateGrantLag: vi.fn()
}));
vi.mock('./indicators/renewal-duration', () => ({
	calculateRenewalDuration: vi.fn()
}));

// Mock parseMarkdownTable (transitive dependency)
vi.mock('$lib/server/mcp/client', () => ({
	parseMarkdownTable: vi.fn()
}));

import { calculateAllIndicators } from './index';
import { calculateForwardCitations } from './indicators/forward-citations';
import { calculateBackwardCitations } from './indicators/backward-citations';
import { calculateFamilySize } from './indicators/family-size';
import { calculateClaimsCount } from './indicators/claims-count';
import { calculateOriginalityIndex } from './indicators/originality-index';
import { calculateGrantLag } from './indicators/grant-lag';
import { calculateRenewalDuration } from './indicators/renewal-duration';
import type { IndicatorResult } from './types';

const mockClient: McpClient = { executeQuery: vi.fn() };

const successResult = (indicator: string, value: number): IndicatorResult => ({
	indicator: indicator as IndicatorResult['indicator'],
	value,
	available: true,
	dataSource: 'test',
	error: null
});

const failResult = (indicator: string, error: string): IndicatorResult => ({
	indicator: indicator as IndicatorResult['indicator'],
	value: null,
	available: false,
	dataSource: 'test',
	error
});

function mockAllSuccess(): void {
	vi.mocked(calculateForwardCitations).mockResolvedValue(successResult('forward_citations', 47));
	vi.mocked(calculateBackwardCitations).mockResolvedValue(successResult('backward_citations', 23));
	vi.mocked(calculateFamilySize).mockResolvedValue(successResult('family_size', 12));
	vi.mocked(calculateClaimsCount).mockResolvedValue(successResult('claims_count', 20));
	vi.mocked(calculateOriginalityIndex).mockResolvedValue(successResult('originality_index', 0.72));
	vi.mocked(calculateGrantLag).mockResolvedValue(successResult('grant_lag_days', 1247));
	vi.mocked(calculateRenewalDuration).mockResolvedValue(successResult('renewal_duration', 15));
}

describe('calculateAllIndicators', () => {
	it('returns 7 results when all indicators succeed', async () => {
		mockAllSuccess();
		const results = await calculateAllIndicators(12345, mockClient);

		expect(results).toHaveLength(7);
		expect(results.every((r) => r.available)).toBe(true);
		expect(results.map((r) => r.indicator)).toEqual([
			'forward_citations',
			'backward_citations',
			'family_size',
			'claims_count',
			'originality_index',
			'grant_lag_days',
			'renewal_duration'
		]);
	});

	it('does NOT include generality_index (on-demand only)', async () => {
		mockAllSuccess();
		const results = await calculateAllIndicators(12345, mockClient);

		expect(results.find((r) => r.indicator === 'generality_index')).toBeUndefined();
	});

	it('returns partial results when some indicators fail', async () => {
		vi.mocked(calculateForwardCitations).mockResolvedValue(successResult('forward_citations', 47));
		vi.mocked(calculateBackwardCitations).mockResolvedValue(
			failResult('backward_citations', 'MCP timeout')
		);
		vi.mocked(calculateFamilySize).mockResolvedValue(successResult('family_size', 12));
		vi.mocked(calculateClaimsCount).mockResolvedValue(failResult('claims_count', 'Server error'));
		vi.mocked(calculateOriginalityIndex).mockResolvedValue(successResult('originality_index', 0.5));
		vi.mocked(calculateGrantLag).mockResolvedValue(
			failResult('grant_lag_days', 'Patent not granted')
		);
		vi.mocked(calculateRenewalDuration).mockResolvedValue(successResult('renewal_duration', 10));

		const results = await calculateAllIndicators(12345, mockClient);

		expect(results).toHaveLength(7);
		const available = results.filter((r) => r.available);
		const unavailable = results.filter((r) => !r.available);
		expect(available).toHaveLength(4);
		expect(unavailable).toHaveLength(3);
	});

	it('handles unexpected rejection via Promise.allSettled safety net', async () => {
		mockAllSuccess();
		vi.mocked(calculateOriginalityIndex).mockRejectedValue(new Error('Unexpected crash'));

		const results = await calculateAllIndicators(12345, mockClient);

		expect(results).toHaveLength(7);
		expect(results[4].available).toBe(false);
		expect(results[4].indicator).toBe('originality_index');
		expect(results[4].error).toBe('Unexpected crash');
	});

	it('returns all unavailable when all indicators fail', async () => {
		vi.mocked(calculateForwardCitations).mockResolvedValue(
			failResult('forward_citations', 'timeout')
		);
		vi.mocked(calculateBackwardCitations).mockResolvedValue(
			failResult('backward_citations', 'timeout')
		);
		vi.mocked(calculateFamilySize).mockResolvedValue(failResult('family_size', 'timeout'));
		vi.mocked(calculateClaimsCount).mockResolvedValue(failResult('claims_count', 'timeout'));
		vi.mocked(calculateOriginalityIndex).mockResolvedValue(
			failResult('originality_index', 'timeout')
		);
		vi.mocked(calculateGrantLag).mockResolvedValue(failResult('grant_lag_days', 'timeout'));
		vi.mocked(calculateRenewalDuration).mockResolvedValue(
			failResult('renewal_duration', 'timeout')
		);

		const results = await calculateAllIndicators(12345, mockClient);

		expect(results).toHaveLength(7);
		expect(results.every((r) => !r.available)).toBe(true);
	});
});

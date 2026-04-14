import { describe, it, expect } from 'vitest';
import { ordinalSuffix, formatRawValue, percentileInterpretation } from './format';

describe('ordinalSuffix', () => {
	it('handles 1st, 2nd, 3rd', () => {
		expect(ordinalSuffix(1)).toBe('1st');
		expect(ordinalSuffix(2)).toBe('2nd');
		expect(ordinalSuffix(3)).toBe('3rd');
	});

	it('handles 4th through 10th', () => {
		expect(ordinalSuffix(4)).toBe('4th');
		expect(ordinalSuffix(5)).toBe('5th');
		expect(ordinalSuffix(10)).toBe('10th');
	});

	it('handles teens (11th-13th)', () => {
		expect(ordinalSuffix(11)).toBe('11th');
		expect(ordinalSuffix(12)).toBe('12th');
		expect(ordinalSuffix(13)).toBe('13th');
	});

	it('handles 21st, 22nd, 23rd', () => {
		expect(ordinalSuffix(21)).toBe('21st');
		expect(ordinalSuffix(22)).toBe('22nd');
		expect(ordinalSuffix(23)).toBe('23rd');
	});

	it('handles 91st, 100th', () => {
		expect(ordinalSuffix(91)).toBe('91st');
		expect(ordinalSuffix(100)).toBe('100th');
	});
});

describe('formatRawValue', () => {
	it('formats integer indicators with unit', () => {
		expect(formatRawValue('forward_citations', 47)).toBe('47 citations');
		expect(formatRawValue('backward_citations', 23)).toBe('23 references');
		expect(formatRawValue('family_size', 12)).toBe('12 countries');
		expect(formatRawValue('claims_count', 20)).toBe('20 claims');
		expect(formatRawValue('grant_lag_days', 1252)).toBe('1,252 days');
		expect(formatRawValue('renewal_duration', 15)).toBe('15 years');
	});

	it('formats diversity indices with 2 decimal places', () => {
		expect(formatRawValue('generality_index', 0.75)).toBe('0.75 fwd. citation score');
		expect(formatRawValue('originality_index', 0.6667)).toBe('0.67 bwd. citation score');
	});

	it('returns null for null values', () => {
		expect(formatRawValue('forward_citations', null)).toBeNull();
	});
});

describe('percentileInterpretation', () => {
	it('returns correct interpretation for each range', () => {
		expect(percentileInterpretation(95)).toBe('Exceptionally high');
		expect(percentileInterpretation(90)).toBe('Exceptionally high');
		expect(percentileInterpretation(80)).toBe('Above average');
		expect(percentileInterpretation(75)).toBe('Above average');
		expect(percentileInterpretation(60)).toBe('Average');
		expect(percentileInterpretation(50)).toBe('Average');
		expect(percentileInterpretation(30)).toBe('Below average');
		expect(percentileInterpretation(25)).toBe('Below average');
		expect(percentileInterpretation(10)).toBe('Low');
	});
});

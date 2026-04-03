import { describe, it, expect } from 'vitest';
import {
	parsePatentNumber,
	toNormalized,
	toUrlParams,
	toDisplay,
	isValidPatentInput
} from './patent-number-parser';

describe('parsePatentNumber', () => {
	describe('EP formats', () => {
		it('parses "EP1000000"', () => {
			expect(parsePatentNumber('EP1000000')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: null
			});
		});

		it('parses "EP1000000B1"', () => {
			expect(parsePatentNumber('EP1000000B1')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: 'B1'
			});
		});

		it('parses "EP 1 000 000" (spaces)', () => {
			expect(parsePatentNumber('EP 1 000 000')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: null
			});
		});

		it('parses "EP 1000000 B1" (spaces with kind code)', () => {
			expect(parsePatentNumber('EP 1000000 B1')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: 'B1'
			});
		});

		it('parses "ep1000000b1" (lowercase)', () => {
			expect(parsePatentNumber('ep1000000b1')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: 'B1'
			});
		});
	});

	describe('US formats', () => {
		it('parses "US6285999"', () => {
			expect(parsePatentNumber('US6285999')).toEqual({
				authority: 'US',
				number: '6285999',
				kindCode: null
			});
		});

		it('parses "US6285999B2"', () => {
			expect(parsePatentNumber('US6285999B2')).toEqual({
				authority: 'US',
				number: '6285999',
				kindCode: 'B2'
			});
		});

		it('parses "US 6,285,999" (commas)', () => {
			expect(parsePatentNumber('US 6,285,999')).toEqual({
				authority: 'US',
				number: '6285999',
				kindCode: null
			});
		});
	});

	describe('WO formats', () => {
		it('parses "WO2020001234"', () => {
			expect(parsePatentNumber('WO2020001234')).toEqual({
				authority: 'WO',
				number: '2020001234',
				kindCode: null
			});
		});

		it('parses "WO2020/001234" (slash)', () => {
			expect(parsePatentNumber('WO2020/001234')).toEqual({
				authority: 'WO',
				number: '2020001234',
				kindCode: null
			});
		});

		it('parses "WO 2020 001234" (spaces)', () => {
			expect(parsePatentNumber('WO 2020 001234')).toEqual({
				authority: 'WO',
				number: '2020001234',
				kindCode: null
			});
		});
	});

	describe('other authorities', () => {
		it('parses "DE102020001234A1"', () => {
			const result = parsePatentNumber('DE102020001234A1');
			expect(result).toEqual({
				authority: 'DE',
				number: '102020001234',
				kindCode: 'A1'
			});
		});

		it('parses "JP2020123456"', () => {
			expect(parsePatentNumber('JP2020123456')).toEqual({
				authority: 'JP',
				number: '2020123456',
				kindCode: null
			});
		});
	});

	describe('invalid inputs', () => {
		it('returns null for empty string', () => {
			expect(parsePatentNumber('')).toBeNull();
		});

		it('returns null for "HELLO"', () => {
			expect(parsePatentNumber('HELLO')).toBeNull();
		});

		it('returns null for "123"', () => {
			expect(parsePatentNumber('123')).toBeNull();
		});

		it('returns null for "XX999" (unsupported authority)', () => {
			expect(parsePatentNumber('XX999')).toBeNull();
		});

		it('returns null for whitespace only', () => {
			expect(parsePatentNumber('   ')).toBeNull();
		});

		it('returns null for partial input "EP"', () => {
			expect(parsePatentNumber('EP')).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('handles extra whitespace', () => {
			expect(parsePatentNumber('  EP  1000000  B1  ')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: 'B1'
			});
		});

		it('handles mixed case "Ep1000000b1"', () => {
			expect(parsePatentNumber('Ep1000000b1')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: 'B1'
			});
		});

		it('handles kind code A2', () => {
			expect(parsePatentNumber('EP1000000A2')).toEqual({
				authority: 'EP',
				number: '1000000',
				kindCode: 'A2'
			});
		});
	});
});

describe('toNormalized', () => {
	it('formats without kind code', () => {
		expect(toNormalized({ authority: 'EP', number: '1000000', kindCode: null })).toBe('EP1000000');
	});

	it('formats with kind code', () => {
		expect(toNormalized({ authority: 'EP', number: '1000000', kindCode: 'B1' })).toBe(
			'EP1000000B1'
		);
	});
});

describe('toUrlParams', () => {
	it('returns auth and number without kind code', () => {
		expect(toUrlParams({ authority: 'EP', number: '1000000', kindCode: null })).toEqual({
			auth: 'EP',
			number: '1000000'
		});
	});

	it('returns auth and number with kind code appended', () => {
		expect(toUrlParams({ authority: 'EP', number: '1000000', kindCode: 'B1' })).toEqual({
			auth: 'EP',
			number: '1000000B1'
		});
	});
});

describe('toDisplay', () => {
	it('formats without kind code', () => {
		expect(toDisplay({ authority: 'EP', number: '1000000', kindCode: null })).toBe('EP 1000000');
	});

	it('formats with kind code', () => {
		expect(toDisplay({ authority: 'EP', number: '1000000', kindCode: 'B1' })).toBe('EP 1000000 B1');
	});
});

describe('isValidPatentInput', () => {
	it('returns true for valid input', () => {
		expect(isValidPatentInput('EP1000000B1')).toBe(true);
	});

	it('returns false for invalid input', () => {
		expect(isValidPatentInput('HELLO')).toBe(false);
	});

	it('returns false for empty input', () => {
		expect(isValidPatentInput('')).toBe(false);
	});
});

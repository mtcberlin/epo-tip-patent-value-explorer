/**
 * Patent publication number parser, validator, and formatter.
 * SINGLE source of truth for all patent number transformations.
 *
 * Supported authorities: EP, US, WO, DE, FR, GB, JP, KR, CN
 * Supports flexible whitespace, commas, slashes, optional kind codes (A1, B1, B2, etc.)
 */

export interface ParsedPatentNumber {
	/** Two-letter authority code, always uppercase (e.g. "EP", "US", "WO") */
	authority: string;
	/** Numeric portion only, no spaces or separators (e.g. "1000000") */
	number: string;
	/** Kind code suffix or null (e.g. "B1", "A2") */
	kindCode: string | null;
}

const SUPPORTED_AUTHORITIES = new Set(['EP', 'US', 'WO', 'DE', 'FR', 'GB', 'JP', 'KR', 'CN']);

/**
 * Parse a patent number string into structured parts.
 * Handles flexible whitespace, commas, slashes, mixed case.
 * Returns null for invalid input.
 */
export function parsePatentNumber(input: string): ParsedPatentNumber | null {
	if (!input || typeof input !== 'string') return null;

	// Normalize: trim, uppercase, remove commas/slashes/dashes used as separators
	const cleaned = input
		.trim()
		.toUpperCase()
		.replace(/[,/-]/g, '')
		.replace(/\s+/g, '');

	if (cleaned.length < 3) return null;

	// Match: authority (2 letters) + digits + optional kind code (letter + optional digit)
	const match = cleaned.match(/^([A-Z]{2})(\d+)([A-Z]\d?)?$/);
	if (!match) return null;

	const authority = match[1];
	const number = match[2];
	const kindCode = match[3] ?? null;

	if (!SUPPORTED_AUTHORITIES.has(authority)) return null;
	if (number.length < 1) return null;

	return { authority, number, kindCode };
}

/**
 * Format for DB keys and internal use: "EP1000000B1" (no spaces).
 */
export function toNormalized(parsed: ParsedPatentNumber): string {
	return `${parsed.authority}${parsed.number}${parsed.kindCode ?? ''}`;
}

/**
 * Format for URL route params: { auth: "EP", number: "1000000B1" }.
 */
export function toUrlParams(parsed: ParsedPatentNumber): { auth: string; number: string } {
	return {
		auth: parsed.authority,
		number: `${parsed.number}${parsed.kindCode ?? ''}`
	};
}

/**
 * Format for human-readable display: "EP 1000000 B1".
 */
export function toDisplay(parsed: ParsedPatentNumber): string {
	const parts = [parsed.authority, parsed.number];
	if (parsed.kindCode) parts.push(parsed.kindCode);
	return parts.join(' ');
}

/**
 * Real-time validation helper for search bar input.
 * Returns true if the input can be parsed as a valid patent number.
 */
export function isValidPatentInput(input: string): boolean {
	return parsePatentNumber(input) !== null;
}

import type { IndicatorName } from '$lib/scoring/types';

/** Format a number with ordinal suffix: 1st, 2nd, 3rd, 4th, 11th, 91st, etc. */
export function ordinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Units for each indicator's raw value */
const RAW_UNITS: Record<IndicatorName, string> = {
	forward_citations: 'citations',
	backward_citations: 'references',
	family_size: 'countries',
	generality_index: 'fwd. citation score',
	radicalness_index: 'bwd. citation score',
	claims_count: 'claims',
	grant_lag_days: 'days',
	renewal_duration: 'years'
};

/** Format a raw indicator value with its unit */
export function formatRawValue(indicator: IndicatorName, value: number | null): string | null {
	if (value === null) return null;
	const unit = RAW_UNITS[indicator];
	if (indicator === 'generality_index' || indicator === 'radicalness_index') {
		return `${value.toFixed(2)} ${unit}`;
	}
	const rounded = Math.round(value);
	return `${rounded.toLocaleString()} ${unit}`;
}

/** Human-readable interpretation of a percentile ranking.
 * For grant_lag_days, lower percentile = faster grant = positive framing. */
export function percentileInterpretation(percentile: number, indicator?: IndicatorName): string {
	if (indicator === 'grant_lag_days') {
		if (percentile >= 90) return 'Exceptionally slow';
		if (percentile >= 75) return 'Slower than average';
		if (percentile >= 50) return 'Average speed';
		if (percentile >= 25) return 'Faster than average';
		return 'Exceptionally fast';
	}
	if (percentile >= 90) return 'Exceptionally high';
	if (percentile >= 75) return 'Above average';
	if (percentile >= 50) return 'Average';
	if (percentile >= 25) return 'Below average';
	return 'Low';
}

/**
 * Methodology explanations for each indicator.
 * Based on OECD Patent Quality Indicators (2023).
 */
export const INDICATOR_METHODOLOGY: Record<IndicatorName, string> = {
	forward_citations:
		'Counts how many later patents cite this one. More citations suggest the invention influenced subsequent innovation. Compared to patents in the same technology field and filing year.',
	backward_citations:
		'Counts how many earlier patents this one references. More references suggest the invention builds on a broad base of prior art.',
	family_size:
		'Counts in how many countries patent protection was sought. Filing in more countries signals the applicant expects commercial value across markets.',
	generality_index:
		'Measures how broadly this patent is cited across different technology fields (Herfindahl diversity of citing patents\u2019 CPC sections). Higher values mean wider technological impact.',
	radicalness_index:
		'Measures CPC section diversity of backward citations — how many different technology fields the cited prior art covers (Herfindahl index). Higher values mean the patent draws knowledge from more diverse technology areas.',
	claims_count:
		'The number of independent and dependent claims defines the scope of legal protection. More claims generally mean broader protection.',
	grant_lag_days:
		'Days between filing and grant. Faster grants provide earlier legal certainty. Compared to patents in the same technology field and filing year.',
	renewal_duration:
		'How many years the patent holder paid renewal fees. Longer maintenance suggests the patent retains commercial value to its owner.'
};

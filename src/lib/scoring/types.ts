/**
 * Shared scoring type definitions and display constants.
 *
 * This module is safe for both server and client code.
 * All indicator names match the `cohort_stats.indicator` column values exactly.
 * Story labels are the primary display names (UX requirement — "Scientific Elegance").
 *
 * @see OECD Patent Quality Indicators (2023)
 */

/** Exact indicator name constants matching cohort_stats.indicator values */
export type IndicatorName =
	| 'forward_citations'
	| 'backward_citations'
	| 'family_size'
	| 'generality_index'
	| 'radicalness_index'
	| 'claims_count'
	| 'grant_lag_days'
	| 'renewal_duration';

export const INDICATOR_NAMES: readonly IndicatorName[] = [
	'forward_citations',
	'backward_citations',
	'family_size',
	'generality_index',
	'radicalness_index',
	'claims_count',
	'grant_lag_days',
	'renewal_duration'
] as const;

/** Story labels as primary display names (UX requirement) */
export const STORY_LABELS: Record<IndicatorName, string> = {
	forward_citations: 'This idea sparked many others',
	backward_citations: 'This patent references prior art',
	family_size: 'This idea matters in these countries',
	generality_index: 'This idea applies across many fields',
	radicalness_index: 'This idea draws from diverse technology fields',
	claims_count: "This is the scope of what's protected",
	grant_lag_days: 'How quickly this patent was granted',
	renewal_duration: 'Someone believed enough to keep paying'
} as const;

/** Technical display names */
export const TECHNICAL_NAMES: Record<IndicatorName, string> = {
	forward_citations: 'Forward Citations',
	backward_citations: 'Backward Citations',
	family_size: 'Family Size',
	generality_index: 'Generality Index',
	radicalness_index: 'Radicalness Index',
	claims_count: 'Patent Scope (Claims)',
	grant_lag_days: 'Grant Lag',
	renewal_duration: 'Renewal Duration'
} as const;

/** Normalized score after cohort comparison */
export interface NormalizedScore {
	indicator: IndicatorName;
	raw: number | null;
	normalized: number | null;
	percentile: number | null;
	available: boolean;
	cohortSize: number | null;
	/** True when cohort has fewer than 30 patents — results may be unreliable */
	smallCohort: boolean;
}

/** Result from a single indicator calculation */
export interface IndicatorResult {
	/** Indicator identifier matching cohort_stats.indicator values */
	indicator: IndicatorName;
	/** Raw calculated value, null if unavailable */
	value: number | null;
	/** Whether this indicator was successfully calculated */
	available: boolean;
	/** PATSTAT data source reference (e.g., 'tls201.nb_citing_docdb_fam') */
	dataSource: string;
	/** Error message if calculation failed, null on success */
	error: string | null;
}

/** Result of composite quality index calculation */
export interface CompositeResult {
	/** Composite score 0.0-1.0, null if no indicators available */
	score: number | null;
	/** Number of indicators included in composite */
	indicatorCount: number;
	/** Total possible indicators (always 8) */
	totalIndicators: 8;
}

/** Error types for AI narrative generation (shared across client and server) */
export type NarrativeErrorType = 'auth_error' | 'no_key' | 'api_error' | 'timeout';

/** Structured error from narrative generation (shared across client and server) */
export interface NarrativeError {
	type: NarrativeErrorType;
	message: string;
}

/** Complete patent quality profile */
export interface PatentProfile {
	publicationNumber: string;
	title: string;
	applicants: string[];
	filingDate: string;
	grantDate: string | null;
	grantStatus: 'granted' | 'pending' | 'unknown';
	cpcCodes: string[];
	wipoFieldNumber: number;
	wipoFieldName: string;
	applnId: number;
	rawIndicators: IndicatorResult[];
	normalizedScores: NormalizedScore[];
	compositeScore: number | null;
	pmiData: {
		classification: string;
		pmiScore: number;
		activityLevel: number;
		cagr: number;
	} | null;
	narrative: {
		summary: string;
		archetype: 'Specialist' | 'Generalist' | 'Disruptor' | 'Incremental' | null;
		generatedAt: string;
	} | null;
	narrativeError?: NarrativeError | null;
}

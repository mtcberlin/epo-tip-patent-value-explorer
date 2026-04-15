/**
 * Shared scoring type definitions and display constants.
 *
 * This module is safe for both server and client code.
 * All indicator names match the `cohort_stats.indicator` column values exactly.
 * Story labels are the primary display names (UX requirement - "Scientific Elegance").
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013)
 */

/** Exact indicator name constants matching cohort_stats.indicator values */
export type IndicatorName =
	| 'forward_citations'
	| 'backward_citations'
	| 'family_size'
	| 'generality_index'
	| 'originality_index'
	| 'radicalness_index'
	| 'claims_count'
	| 'patent_scope'
	| 'grant_lag_days'
	| 'renewal_duration';

export const INDICATOR_NAMES: readonly IndicatorName[] = [
	'forward_citations',
	'backward_citations',
	'family_size',
	'generality_index',
	'originality_index',
	'radicalness_index',
	'claims_count',
	'patent_scope',
	'grant_lag_days',
	'renewal_duration'
] as const;

/** Story labels as primary display names (UX requirement) */
export const STORY_LABELS: Record<IndicatorName, string> = {
	forward_citations: 'This idea sparked many others',
	backward_citations: 'This patent references prior art',
	family_size: 'This idea matters in these countries',
	generality_index: 'This idea applies across many fields',
	originality_index: 'This idea draws from diverse technology fields',
	radicalness_index: 'This idea breaks from its own technology field',
	claims_count: "This is the scope of what's protected",
	patent_scope: 'This idea spans multiple technology areas',
	grant_lag_days: 'How quickly this patent was granted',
	renewal_duration: 'Someone believed enough to keep paying'
} as const;

/**
 * Provenance of each indicator: where it originates from.
 *
 * 'OECD'  - defined in the OECD Patent Quality framework
 *           (Squicciarini, Dernis & Criscuolo 2013).
 * 'PVE'   - added by Patent Value Explorer beyond the OECD set.
 *
 * Currently all indicators are OECD-grounded; the type exists so that
 * UI surfaces (badges, legends) can label provenance consistently and
 * future PVE-specific additions can be marked clearly.
 */
export type IndicatorProvenance = 'OECD' | 'PVE';

export const INDICATOR_PROVENANCE: Record<IndicatorName, IndicatorProvenance> = {
	forward_citations: 'OECD',
	backward_citations: 'OECD',
	family_size: 'OECD',
	generality_index: 'OECD',
	originality_index: 'OECD',
	radicalness_index: 'OECD',
	claims_count: 'OECD',
	patent_scope: 'OECD',
	grant_lag_days: 'OECD',
	renewal_duration: 'OECD'
} as const;

/** Technical display names */
export const TECHNICAL_NAMES: Record<IndicatorName, string> = {
	forward_citations: 'Forward Citations',
	backward_citations: 'Backward Citations',
	family_size: 'Family Size',
	generality_index: 'Generality Index',
	originality_index: 'Originality Index',
	radicalness_index: 'Radicalness Index',
	claims_count: 'Number of Claims',
	patent_scope: 'Patent Scope',
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
	/** True when cohort has fewer than 30 patents - results may be unreliable */
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

/**
 * Indicators that contribute to the Composite Quality Index.
 *
 * Subset of the OECD "Patent quality: composite index" 6-component composite
 * (Squicciarini, Dernis & Criscuolo 2013),
 * omitting Generality due to its query cost (~16 GB scan per patent on
 * tls224_appln_cpc - the citing patents' CPC classes).
 *
 * Other indicators (backward_citations, patent_scope, grant_lag_days,
 * renewal_duration) are reported standalone but not part of the composite.
 */
export const COMPOSITE_INDICATORS: readonly IndicatorName[] = [
	'forward_citations',
	'family_size',
	'claims_count',
	'originality_index',
	'radicalness_index'
] as const;

/** Result of composite quality index calculation */
export interface CompositeResult {
	/** Composite score 0.0-1.0, null if no indicators available */
	score: number | null;
	/** Number of indicators included in composite */
	indicatorCount: number;
	/** Total possible indicators in the composite (length of COMPOSITE_INDICATORS) */
	totalIndicators: number;
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

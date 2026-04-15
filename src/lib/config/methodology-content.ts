/**
 * Per-indicator methodology content for the expandable methodology sections.
 * Data-only configuration — no logic.
 *
 * @see OECD Measuring Patent Quality (Squicciarini, Dernis & Criscuolo 2013)
 */
import type { IndicatorName } from '$lib/scoring/types';

export interface MethodologyContent {
	/** Calculation formula description */
	formula: string;
	/** Optional human-readable formula display (e.g., for Herfindahl indices) */
	formulaDisplay?: string;
	/** PATSTAT table/column source reference */
	patstatSource: string;
	/** Normalization method description */
	normalizationMethod: string;
	/** Source-paper section name and page number (Squicciarini, Dernis & Criscuolo 2013) */
	oecdSection: string;
	/** Explanation shown when indicator is unavailable */
	unavailableReason: string;
	/** Theoretical value range for display context (e.g., "1.0" for Herfindahl indices) */
	range?: string;
}

export const METHODOLOGY_CONTENT: Record<IndicatorName, MethodologyContent> = {
	forward_citations: {
		formula: 'Count of citing patent families',
		patstatSource: 'tls201.nb_citing_docdb_fam',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Forward citations"',
		unavailableReason: 'No citation data available for this patent'
	},
	backward_citations: {
		formula: 'Count of cited patent families',
		patstatSource: 'tls212 (citations)',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Backward citations"',
		unavailableReason: 'No backward citation data available'
	},
	family_size: {
		formula: 'Count of distinct patent authorities in DOCDB family',
		patstatSource: 'tls201 + tls218 (family links)',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Patent family size"',
		unavailableReason: 'No family data available'
	},
	claims_count: {
		formula: 'Number of claims in granted patent',
		patstatSource: 'tls201.nb_claims',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Claims"',
		unavailableReason: 'Claims data not available for this patent'
	},
	patent_scope: {
		formula: 'COUNT(DISTINCT 4-character CPC subclass)',
		formulaDisplay:
			'Counts distinct CPC subclasses (e.g. "C12N", "G06F") assigned to the patent — the OECD definition uses IPC subclasses; CPC and IPC share the subclass taxonomy',
		patstatSource: 'tls224_appln_cpc',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Patent scope"',
		unavailableReason: 'No CPC classifications available for this patent'
	},
	generality_index: {
		formula: 'GEN = 1 - \u03A3(sij\u00B2)',
		formulaDisplay: "Herfindahl index of forward citations' CPC class diversity",
		patstatSource: 'tls228 + tls224',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Generality index"',
		unavailableReason: 'Requires forward citations > 0 to compute CPC diversity',
		range: '1.0'
	},
	originality_index: {
		formula: 'ORIG = 1 - \u03A3(sij\u00B2)',
		formulaDisplay:
			'Herfindahl index measuring CPC section diversity of backward citations — how many different technology fields the cited prior art covers',
		patstatSource: 'tls212 + tls224',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Originality index"',
		unavailableReason: 'Requires backward citations > 0 to compute CPC diversity',
		range: '1.0'
	},
	radicalness_index: {
		formula: 'RAD = (1 / n_BC) \u00B7 COUNT(j : CPC(j) \u2229 CPC(focal) = \u2205)',
		formulaDisplay:
			'Share of backward citations whose CPC subclasses do not overlap with the focal patent\u2019s own classification',
		patstatSource: 'tls212 + tls224',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Radicalness index"',
		unavailableReason: 'Requires backward citations > 0 with CPC classifications',
		range: '1.0'
	},
	grant_lag_days: {
		formula: 'Days between filing date and grant date',
		patstatSource: 'tls201 + tls231',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Grant lag"',
		unavailableReason: 'Patent not yet granted — no grant date available'
	},
	renewal_duration: {
		formula: 'Maximum fee renewal year',
		patstatSource: 'tls231 (INPADOC legal events)',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '"Patent renewal"',
		unavailableReason: 'No renewal fee data available for this patent',
		range: '20 years'
	}
} as const;

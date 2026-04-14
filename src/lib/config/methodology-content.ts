/**
 * Per-indicator methodology content for the expandable methodology sections.
 * Data-only configuration — no logic.
 *
 * @see OECD Patent Quality Indicators (2023)
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
	/** OECD Patent Quality Indicators section reference */
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
		oecdSection: '3.1',
		unavailableReason: 'No citation data available for this patent'
	},
	backward_citations: {
		formula: 'Count of cited patent families',
		patstatSource: 'tls212 (citations)',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '3.2',
		unavailableReason: 'No backward citation data available'
	},
	family_size: {
		formula: 'Count of distinct patent authorities in DOCDB family',
		patstatSource: 'tls201 + tls218 (family links)',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '3.4',
		unavailableReason: 'No family data available'
	},
	claims_count: {
		formula: 'Number of claims in granted patent',
		patstatSource: 'tls201.nb_claims',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '3.7',
		unavailableReason: 'Claims data not available for this patent'
	},
	generality_index: {
		formula: 'GEN = 1 - \u03A3(sij\u00B2)',
		formulaDisplay: "Herfindahl index of forward citations' CPC class diversity",
		patstatSource: 'tls228 + tls224',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '3.5',
		unavailableReason: 'Requires forward citations > 0 to compute CPC diversity',
		range: '1.0'
	},
	originality_index: {
		formula: 'ORIG = 1 - \u03A3(sij\u00B2)',
		formulaDisplay:
			'Herfindahl index measuring CPC section diversity of backward citations — how many different technology fields the cited prior art covers',
		patstatSource: 'tls212 + tls224',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '3.6',
		unavailableReason: 'Requires backward citations > 0 to compute CPC diversity',
		range: '1.0'
	},
	grant_lag_days: {
		formula: 'Days between filing date and grant date',
		patstatSource: 'tls201 + tls231',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '3.8',
		unavailableReason: 'Patent not yet granted — no grant date available'
	},
	renewal_duration: {
		formula: 'Maximum fee renewal year',
		patstatSource: 'tls231 (INPADOC legal events)',
		normalizationMethod: 'Winsorization at 98th percentile, then linear 0.0–1.0 scaling',
		oecdSection: '3.9',
		unavailableReason: 'No renewal fee data available for this patent',
		range: '20 years'
	}
} as const;

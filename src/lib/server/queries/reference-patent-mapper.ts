/**
 * Maps a ReferencePatentRow to a full PatentProfile.
 * Enables instant loading of reference patents without MCP/BigQuery.
 */

import type { ReferencePatentRow } from '$lib/server/data/types';
import type {
	PatentProfile,
	IndicatorResult,
	NormalizedScore,
	IndicatorName
} from '$lib/scoring/types';
import { INDICATOR_NAMES } from '$lib/scoring/types';

interface IndicatorColumnMap {
	raw: keyof ReferencePatentRow;
	norm: keyof ReferencePatentRow;
	dataSource: string;
}

const INDICATOR_COLUMNS: Record<IndicatorName, IndicatorColumnMap> = {
	forward_citations: {
		raw: 'forwardCitations',
		norm: 'forwardCitationsNormalized',
		dataSource: 'reference_patents'
	},
	backward_citations: {
		raw: 'backwardCitations',
		norm: 'backwardCitationsNormalized',
		dataSource: 'reference_patents'
	},
	family_size: { raw: 'familySize', norm: 'familySizeNormalized', dataSource: 'reference_patents' },
	generality_index: {
		raw: 'generalityIndex',
		norm: 'generalityIndexNormalized',
		dataSource: 'reference_patents'
	},
	originality_index: {
		raw: 'originalityIndex',
		norm: 'originalityIndexNormalized',
		dataSource: 'reference_patents'
	},
	radicalness_index: {
		raw: 'radicalnessIndex',
		norm: 'radicalnessIndexNormalized',
		dataSource: 'reference_patents'
	},
	claims_count: {
		raw: 'claimsCount',
		norm: 'claimsCountNormalized',
		dataSource: 'reference_patents'
	},
	patent_scope: {
		raw: 'patentScope',
		norm: 'patentScopeNormalized',
		dataSource: 'reference_patents'
	},
	grant_lag_days: {
		raw: 'grantLagDays',
		norm: 'grantLagNormalized',
		dataSource: 'reference_patents'
	},
	renewal_duration: {
		raw: 'renewalDuration',
		norm: 'renewalDurationNormalized',
		dataSource: 'reference_patents'
	}
};

/**
 * Reference patent cache was generated before some indicators existed
 * (e.g. patent_scope, radicalness_index added in PIP-61). Surface a
 * truthful error instead of letting the UI fall back to the methodology
 * "unavailableReason", which would suggest the patent itself lacks the
 * underlying data when in fact the cache simply has not been recomputed.
 */
const CACHE_PENDING_ERROR =
	'Not in reference patent cache (recompute pending)';

export function mapReferenceToProfile(ref: ReferencePatentRow): PatentProfile {
	const rawIndicators: IndicatorResult[] = INDICATOR_NAMES.map((name) => {
		const col = INDICATOR_COLUMNS[name];
		const value = ref[col.raw] as number | null;
		return {
			indicator: name,
			value,
			available: value !== null,
			dataSource: col.dataSource,
			error: value === null ? CACHE_PENDING_ERROR : null
		};
	});

	const normalizedScores: NormalizedScore[] = INDICATOR_NAMES.map((name) => {
		const col = INDICATOR_COLUMNS[name];
		const raw = ref[col.raw] as number | null;
		const normalized = ref[col.norm] as number | null;
		return {
			indicator: name,
			raw,
			normalized,
			percentile: null,
			available: normalized !== null,
			cohortSize: null,
			smallCohort: false
		};
	});

	const cpcCodes: string[] = (() => {
		try {
			return JSON.parse(ref.cpcCodes);
		} catch {
			return [];
		}
	})();

	const grantStatus: PatentProfile['grantStatus'] = ref.grantDate ? 'granted' : 'pending';

	return {
		publicationNumber: ref.publicationNumber,
		title: ref.title,
		applicants: ref.applicant.split('; ').filter(Boolean),
		filingDate: ref.filingDate,
		grantDate: ref.grantDate,
		grantStatus,
		cpcCodes,
		wipoFieldNumber: ref.wipoFieldNumber,
		wipoFieldName: ref.wipoFieldName,
		applnId: ref.applnId,
		rawIndicators,
		normalizedScores,
		compositeScore: ref.compositeScore,
		pmiData: null,
		narrative: null
	};
}

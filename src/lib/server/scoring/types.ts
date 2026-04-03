/**
 * Re-exports all scoring types and constants from the shared module.
 *
 * Server-side code can import from either '$lib/server/scoring/types' or '$lib/scoring/types'.
 * Client-side code MUST import from '$lib/scoring/types'.
 */
export {
	type IndicatorName,
	INDICATOR_NAMES,
	STORY_LABELS,
	TECHNICAL_NAMES,
	type NormalizedScore,
	type IndicatorResult,
	type CompositeResult,
	type PatentProfile
} from '$lib/scoring/types';

import type { PatentProfile, NarrativeError, NarrativeErrorType } from '$lib/scoring/types';

// Re-export shared error types for consumers already importing from this module
export type { NarrativeError, NarrativeErrorType };

/**
 * Patent archetype based on radar chart shape analysis.
 *
 * - Specialist: High scores in one EPO dimension, moderate/low in others
 * - Generalist: Balanced scores across all 3 dimensions (>0.5 each)
 * - Disruptor: High Technological Importance, low Market Relevance/Legal Strength
 * - Incremental: Low scores across most dimensions (<0.4 average)
 */
export type PatentArchetype = 'Specialist' | 'Generalist' | 'Disruptor' | 'Incremental';

/** Request payload for AI narrative generation */
export interface NarrativeRequest {
	patentProfile: PatentProfile;
	language?: 'en';
}

/** Result of narrative generation: success, error, or null (no key configured) */
export type NarrativeResult =
	| { ok: true; data: NarrativeResponse }
	| { ok: false; error: NarrativeError };

/** Response from AI narrative generation */
export interface NarrativeResponse {
	/** 2-3 sentence summary referencing specific cohort data */
	summary: string;
	/** Suggested archetype based on radar chart shape, null if undetermined */
	archetype: PatentArchetype | null;
	/** ISO timestamp of when the narrative was generated */
	generatedAt: string;
}

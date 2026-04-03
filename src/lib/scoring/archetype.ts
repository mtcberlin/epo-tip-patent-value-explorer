/**
 * Deterministic patent archetype classification based on dimension score averages.
 *
 * Rules (applied in priority order):
 * 1. Generalist: All dimension averages >= 0.5
 * 2. Disruptor: Technological Importance avg >= 0.5 AND Market Relevance avg < 0.3
 * 3. Incremental: Overall average < 0.4
 * 4. Specialist: One dimension avg >= 0.5, the other < 0.5
 *
 * Falls back to null if insufficient data (fewer than 2 indicators per dimension).
 *
 * @see FB-15b — Deterministic archetype classification
 */

import type { NormalizedScore, IndicatorName } from './types';
import { EPO_DIMENSIONS } from '$lib/config/chart-config';

export type PatentArchetype = 'Specialist' | 'Generalist' | 'Disruptor' | 'Incremental';

interface DimensionAverage {
	name: string;
	average: number;
	count: number;
}

/**
 * Computes the average normalized score per EPO dimension.
 */
function getDimensionAverages(scores: NormalizedScore[]): DimensionAverage[] {
	return EPO_DIMENSIONS.map((dim) => {
		const dimScores = scores.filter(
			(s) =>
				s.available &&
				s.normalized !== null &&
				dim.indicators.includes(s.indicator as IndicatorName)
		);
		const sum = dimScores.reduce((acc, s) => acc + (s.normalized ?? 0), 0);
		return {
			name: dim.name,
			average: dimScores.length > 0 ? sum / dimScores.length : 0,
			count: dimScores.length
		};
	});
}

/**
 * Classifies a patent into an archetype based on normalized scores.
 * Returns null if insufficient data for reliable classification.
 */
export function classifyArchetype(scores: NormalizedScore[]): PatentArchetype | null {
	const dims = getDimensionAverages(scores);

	// Need at least 1 indicator per dimension for reliable classification
	if (dims.some((d) => d.count === 0)) return null;

	const techImportance = dims.find((d) => d.name === 'Technological Importance');
	const marketRelevance = dims.find((d) => d.name === 'Market Relevance');

	if (!techImportance || !marketRelevance) return null;

	const allAboveHalf = dims.every((d) => d.average >= 0.5);
	const overallAvg = dims.reduce((acc, d) => acc + d.average, 0) / dims.length;

	// 1. Generalist: balanced scores across all dimensions
	if (allAboveHalf) return 'Generalist';

	// 2. Disruptor: high tech importance, low market relevance
	if (techImportance.average >= 0.5 && marketRelevance.average < 0.3) return 'Disruptor';

	// 3. Incremental: low scores everywhere
	if (overallAvg < 0.4) return 'Incremental';

	// 4. Specialist: strong in one dimension, weaker in others
	return 'Specialist';
}

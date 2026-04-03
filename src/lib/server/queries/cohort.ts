import cohortData from '$lib/server/data/cohort-stats.json';
import type { CohortStatsRow } from '$lib/server/data/types';

const typedCohortData = cohortData as CohortStatsRow[];

export async function getCohortStats(
	wipoField: number,
	filingYear: number,
	indicator: string
): Promise<CohortStatsRow | null> {
	const row = typedCohortData.find(
		(r) =>
			r.wipoFieldNumber === wipoField && r.filingYear === filingYear && r.indicator === indicator
	);

	return row ?? null;
}

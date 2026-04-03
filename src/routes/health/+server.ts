import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import cohortData from '$lib/server/data/cohort-stats.json';

export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		cohortStatsCount: cohortData.length
	});
};

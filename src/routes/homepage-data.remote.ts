import { query } from '$app/server';
import { getAllReferencePatents as fetchAll } from '$lib/server/queries/reference-patents';
import type { ReferencePatentRow } from '$lib/server/data/types';

export const getAllReferencePatents = query(async (): Promise<ReferencePatentRow[]> => {
	try {
		return await fetchAll();
	} catch (err) {
		console.error('[homepage] Reference patents query failed:', err);
		return [];
	}
});

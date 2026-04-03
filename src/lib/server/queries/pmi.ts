import pmiData from '$lib/server/data/wipo-pmi.json';
import type { WipoPmiRow } from '$lib/server/data/types';

const typedPmiData = pmiData as WipoPmiRow[];

export async function getPmiByField(wipoField: number): Promise<WipoPmiRow | null> {
	const row = typedPmiData.find((r) => r.wipoFieldNumber === wipoField);

	return row ?? null;
}

import refData from '$lib/server/data/reference-patents.json';
import type { ReferencePatentRow } from '$lib/server/data/types';

const typedRefData = refData as ReferencePatentRow[];

export async function getAllReferencePatents(): Promise<ReferencePatentRow[]> {
	return [...typedRefData];
}

export async function getByPublicationNumber(
	pubNumber: string
): Promise<ReferencePatentRow | null> {
	const row = typedRefData.find((r) => r.publicationNumber === pubNumber);

	return row ?? null;
}

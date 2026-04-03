import type { PatentCacheRow, PatentCacheData } from '$lib/server/data/types';

const cache = new Map<string, PatentCacheRow>();

export async function getCached(pubNumber: string): Promise<PatentCacheRow | null> {
	const entry = cache.get(pubNumber);
	if (!entry) return null;

	if (new Date(entry.expiresAt).getTime() < Date.now()) {
		cache.delete(pubNumber);
		return null;
	}

	return entry;
}

export async function setCached(pubNumber: string, data: PatentCacheData): Promise<void> {
	cache.set(pubNumber, {
		publicationNumber: pubNumber,
		applnId: data.applnId,
		wipoFieldNumber: data.wipoFieldNumber,
		dataJson: data.dataJson,
		createdAt: new Date().toISOString(),
		expiresAt: data.expiresAt
	});
}

export async function cleanExpired(): Promise<number> {
	const now = Date.now();
	let count = 0;
	for (const [key, entry] of cache) {
		if (new Date(entry.expiresAt).getTime() < now) {
			cache.delete(key);
			count++;
		}
	}
	return count;
}

export function clearAll(): number {
	const size = cache.size;
	cache.clear();
	return size;
}

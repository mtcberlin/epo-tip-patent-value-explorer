import { command } from '$app/server';
import { clearAll } from '$lib/server/queries/patent-cache';

/**
 * Temporary dev tool: Clear the in-memory patent cache.
 * Remove this before production deployment.
 */
export const clearCache = command(async (): Promise<{ deleted: number }> => {
	const deleted = clearAll();
	console.info(`[cache] Cleared ${deleted} cached patents`);
	return { deleted };
});

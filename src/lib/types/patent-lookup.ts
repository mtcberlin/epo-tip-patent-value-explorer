import type { PatentMetadata } from '$lib/server/mcp/types';

export interface PatentLookupResult {
	success: true;
	data: PatentMetadata;
}

export interface PatentLookupError {
	success: false;
	error: {
		type: string;
		message: string;
	};
}

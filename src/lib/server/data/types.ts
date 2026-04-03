/**
 * Standalone type definitions for the static data layer.
 * Replaces Drizzle-inferred types from db/schema.ts.
 */

export interface CohortStatsRow {
	wipoFieldNumber: number;
	wipoFieldName: string;
	filingYear: number;
	indicator: string;
	count: number;
	mean: number;
	median: number;
	p1: number;
	p5: number;
	p25: number;
	p75: number;
	p95: number;
	p99: number;
	max: number;
}

export interface WipoPmiRow {
	wipoFieldNumber: number;
	wipoFieldName: string;
	activityLevel: number;
	cagr: number;
	pmiScore: number;
	classification: string;
}

export interface ReferencePatentRow {
	publicationNumber: string;
	title: string;
	applicant: string;
	filingDate: string;
	grantDate: string | null;
	applnId: number;
	wipoFieldNumber: number;
	wipoFieldName: string;
	cpcCodes: string;
	description: string;
	archetype: string | null;
	forwardCitations: number | null;
	backwardCitations: number | null;
	familySize: number | null;
	generalityIndex: number | null;
	radicalnessIndex: number | null;
	claimsCount: number | null;
	grantLagDays: number | null;
	renewalDuration: number | null;
	forwardCitationsNormalized: number | null;
	backwardCitationsNormalized: number | null;
	familySizeNormalized: number | null;
	generalityIndexNormalized: number | null;
	radicalnessIndexNormalized: number | null;
	claimsCountNormalized: number | null;
	grantLagNormalized: number | null;
	renewalDurationNormalized: number | null;
	compositeScore: number | null;
}

export interface PatentCacheRow {
	publicationNumber: string;
	applnId: number;
	wipoFieldNumber: number;
	dataJson: string;
	createdAt: string;
	expiresAt: string;
}

export interface PatentCacheData {
	applnId: number;
	wipoFieldNumber: number;
	dataJson: string;
	expiresAt: string;
}

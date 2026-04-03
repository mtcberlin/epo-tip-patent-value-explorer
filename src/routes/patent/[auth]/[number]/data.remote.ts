import * as v from 'valibot';
import { query } from '$app/server';
import { parsePatentNumber, toNormalized } from '$lib/utils/patent-number-parser';
import { getCached, setCached } from '$lib/server/queries/patent-cache';
import { getByPublicationNumber } from '$lib/server/queries/reference-patents';
import { mapReferenceToProfile } from '$lib/server/queries/reference-patent-mapper';
import { getPmiByField } from '$lib/server/queries/pmi';
import { lookupPatent, mcpClient } from '$lib/server/mcp/client';
import { McpError } from '$lib/server/mcp/types';
import { calculateAllIndicators } from '$lib/server/scoring/index';
import { normalizeAllIndicators } from '$lib/server/scoring/normalization';
import { calculateCompositeIndex } from '$lib/server/scoring/composite-index';
import { generateNarrative } from '$lib/server/ai/narrative';
import { classifyArchetype } from '$lib/scoring/archetype';
import type { PatentProfile, NormalizedScore } from '$lib/server/scoring/types';

const ParamsSchema = v.object({
	auth: v.pipe(v.string(), v.regex(/^[A-Za-z]{2}$/)),
	number: v.pipe(v.string(), v.minLength(1)),
	apiKey: v.optional(v.string())
});

const CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000; // ~1 year (effectively permanent)
const LOG_PREFIX = '[patent:query]';

export const getPatent = query(
	ParamsSchema,
	async (
		params
	): Promise<
		| { success: true; data: PatentProfile }
		| { success: false; error: { type: string; message: string } }
	> => {
		// Reconstruct publication number from URL params
		const parsed = parsePatentNumber(`${params.auth}${params.number}`);
		if (!parsed) {
			return {
				success: false,
				error: { type: 'validation_error', message: 'Could not parse patent number' }
			};
		}

		const pubNumber = toNormalized(parsed);

		// 1. Check patent_cache first (includes narrative from previous visits)
		try {
			const cached = await getCached(pubNumber);
			if (cached) {
				const data = JSON.parse(cached.dataJson) as PatentProfile;
				const hasNormalized = data.normalizedScores?.some((s) => s.normalized !== null);
				if (data.grantStatus && hasNormalized) {
					// Re-attempt narrative when cached with error and user provides a (possibly new) API key
					if (params.apiKey && (data.narrativeError || !data.narrative)) {
						try {
							const narrativeResult = await generateNarrative(data, params.apiKey);
							if (narrativeResult.ok) {
								const deterministicArchetype = classifyArchetype(data.normalizedScores);
								narrativeResult.data.archetype =
									deterministicArchetype ?? narrativeResult.data.archetype;
								data.narrative = narrativeResult.data;
								data.narrativeError = undefined;
								// Update cache with successful narrative
								await setCached(pubNumber, {
									applnId: data.applnId,
									wipoFieldNumber: data.wipoFieldNumber,
									dataJson: JSON.stringify(data),
									expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString()
								});
							} else {
								data.narrativeError = narrativeResult.error;
							}
						} catch {
							// Non-fatal: return cached data as-is
						}
					}
					return { success: true, data };
				}
				console.info(`${LOG_PREFIX} Skipping stale cache for ${pubNumber}`);
			}
		} catch (err) {
			console.error(`${LOG_PREFIX} Cache read error:`, err);
		}

		// 2. Check reference_patents (instant load for curated patents, no MCP needed)
		try {
			const ref = await getByPublicationNumber(pubNumber);
			if (ref) {
				console.info(`${LOG_PREFIX} Reference patent hit: ${pubNumber}`);
				const profile = mapReferenceToProfile(ref);

				// Enrich with percentiles from cohort stats (mapper only has normalized scores, not percentiles)
				const filingYear = ref.filingDate ? parseInt(ref.filingDate.substring(0, 4), 10) : null;
				if (filingYear && ref.wipoFieldNumber > 0) {
					try {
						const enriched = await normalizeAllIndicators(
							profile.rawIndicators,
							ref.wipoFieldNumber,
							filingYear
						);
						// Merge: keep pre-computed normalized values from reference data, add percentiles + cohort info
						for (const score of profile.normalizedScores) {
							const fresh = enriched.find((e) => e.indicator === score.indicator);
							if (fresh) {
								score.percentile = fresh.percentile;
								score.cohortSize = fresh.cohortSize;
								score.smallCohort = fresh.smallCohort;
								if (score.normalized === null && fresh.normalized !== null) {
									score.normalized = fresh.normalized;
								}
							}
						}
					} catch (err) {
						console.error(`${LOG_PREFIX} Percentile enrichment failed (non-fatal):`, err);
					}
				}

				// PMI data (fast JSON lookup)
				const pmiRow = ref.wipoFieldNumber > 0 ? await getPmiByField(ref.wipoFieldNumber) : null;
				if (pmiRow) {
					profile.pmiData = {
						classification: pmiRow.classification,
						pmiScore: pmiRow.pmiScore,
						activityLevel: pmiRow.activityLevel,
						cagr: pmiRow.cagr
					};
				}

				// AI narrative
				const narrativeResult = await generateNarrative(profile, params.apiKey);
				if (narrativeResult.ok) {
					const deterministicArchetype = classifyArchetype(profile.normalizedScores);
					narrativeResult.data.archetype = deterministicArchetype ?? narrativeResult.data.archetype;
					profile.narrative = narrativeResult.data;
				} else {
					profile.narrativeError = narrativeResult.error;
				}

				// Cache the complete profile (so next visit skips narrative regeneration)
				try {
					await setCached(pubNumber, {
						applnId: ref.applnId,
						wipoFieldNumber: ref.wipoFieldNumber,
						dataJson: JSON.stringify(profile),
						expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString()
					});
				} catch (cacheErr) {
					console.error(`${LOG_PREFIX} Cache write error:`, cacheErr);
				}

				return { success: true, data: profile };
			}
		} catch (err) {
			console.error(`${LOG_PREFIX} Reference patent check error:`, err);
		}

		// 2. MCP lookup — resolve patent and get metadata
		try {
			const metadata = await lookupPatent(parsed.authority, parsed.number, parsed.kindCode);

			// 3. Calculate raw indicators in parallel (7 auto, generality on-demand)
			const rawIndicators = await calculateAllIndicators(metadata.applnId, mcpClient);

			// 4. Normalize against cohort (WIPO field + filing year)
			const filingYear = metadata.filingDate
				? parseInt(metadata.filingDate.substring(0, 4), 10)
				: null;
			const wipoField = metadata.wipoFieldNumber ?? 0;

			const fallbackScores = rawIndicators.map((r) => ({
				indicator: r.indicator,
				raw: r.value,
				normalized: null,
				percentile: null,
				available: r.available,
				cohortSize: null,
				smallCohort: false
			}));

			let normalizedScores: NormalizedScore[] = fallbackScores;
			if (filingYear && wipoField > 0) {
				try {
					normalizedScores = await normalizeAllIndicators(rawIndicators, wipoField, filingYear);
				} catch (err) {
					console.error(`${LOG_PREFIX} Normalization failed (non-fatal), using raw values:`, err);
				}
			}

			// 5. Composite Quality Index
			const composite = calculateCompositeIndex(normalizedScores);

			// 6. WIPO PMI classification (isolated — failure must not block display)
			let pmiRow = null;
			try {
				pmiRow = wipoField > 0 ? await getPmiByField(wipoField) : null;
			} catch (err) {
				console.error(`${LOG_PREFIX} PMI lookup failed (non-fatal):`, err);
			}

			// 7. Assemble PatentProfile (narrative added in step 8b)
			const profile: PatentProfile = {
				publicationNumber: metadata.publicationNumber,
				title: metadata.title ?? 'Untitled Patent',
				applicants: metadata.applicants,
				filingDate: metadata.filingDate ?? 'Unknown',
				grantDate: metadata.grantDate,
				grantStatus: metadata.granted ? 'granted' : metadata.grantDate ? 'granted' : 'pending',
				cpcCodes: metadata.cpcCodes,
				wipoFieldNumber: wipoField,
				wipoFieldName: metadata.wipoFieldName ?? 'Unknown',
				applnId: metadata.applnId,
				rawIndicators,
				normalizedScores,
				compositeScore: composite.score,
				pmiData: pmiRow
					? {
							classification: pmiRow.classification,
							pmiScore: pmiRow.pmiScore,
							activityLevel: pmiRow.activityLevel,
							cagr: pmiRow.cagr
						}
					: null,
				narrative: null
			};

			// 8b. AI narrative (isolated — failure must not block patent display)
			try {
				const narrativeResult = await generateNarrative(profile, params.apiKey);
				if (narrativeResult.ok) {
					const deterministicArchetype = classifyArchetype(profile.normalizedScores);
					narrativeResult.data.archetype = deterministicArchetype ?? narrativeResult.data.archetype;
					profile.narrative = narrativeResult.data;
				} else {
					profile.narrativeError = narrativeResult.error;
				}
			} catch (err) {
				console.error(`${LOG_PREFIX} Narrative generation failed (non-fatal):`, err);
			}

			// 8. Cache with 24h TTL
			try {
				await setCached(pubNumber, {
					applnId: metadata.applnId,
					wipoFieldNumber: wipoField,
					dataJson: JSON.stringify(profile),
					expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString()
				});
			} catch (err) {
				console.error(`${LOG_PREFIX} Cache write error:`, err);
			}

			return { success: true, data: profile };
		} catch (err) {
			if (err instanceof McpError) {
				return {
					success: false,
					error: { type: err.type, message: err.message }
				};
			}
			return {
				success: false,
				error: { type: 'network_error', message: String(err) }
			};
		}
	}
);

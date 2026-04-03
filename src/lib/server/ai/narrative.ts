import { getAnthropicClientWithKey } from './client';
import type { NarrativeResponse, NarrativeResult, PatentArchetype } from './types';
import type { PatentProfile } from '$lib/scoring/types';

const LOG_PREFIX = '[ai:narrative]';
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 500;
const TIMEOUT_MS = 15_000;

const VALID_ARCHETYPES: readonly PatentArchetype[] = [
	'Specialist',
	'Generalist',
	'Disruptor',
	'Incremental'
] as const;

/**
 * Generates an AI narrative summary for a patent's quality profile.
 *
 * Sends a structured prompt to the Claude API that includes:
 * - All available normalized scores with percentiles
 * - Cohort context (technology field, filing year, cohort size)
 * - WIPO PMI classification
 * - Patent metadata (title, applicant, filing year)
 *
 * The prompt instructs Claude to produce:
 * - A 2-3 sentence summary referencing specific cohort data
 *   (e.g., "forward citations in the 87th percentile of Computer Technology patents filed in 2015")
 * - A suggested patent archetype based on radar chart shape:
 *   Specialist, Generalist, Disruptor, or Incremental
 *
 * Expected response format:
 * ```json
 * {
 *   "summary": "This patent demonstrates strong technological importance...",
 *   "archetype": "Specialist"
 * }
 * ```
 *
 * @param profile - Complete patent profile with normalized scores and cohort data
 * @returns NarrativeResponse on success, null on any failure (graceful degradation)
 */
export async function generateNarrative(
	profile: PatentProfile,
	apiKey?: string
): Promise<NarrativeResult> {
	const client = getAnthropicClientWithKey(apiKey);
	if (!client) {
		console.info(`${LOG_PREFIX} No API key configured`);
		return { ok: false, error: { type: 'no_key', message: 'No API key configured' } };
	}

	const prompt = buildPrompt(profile);

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

		let response;
		try {
			response = await client.messages.create(
				{
					model: MODEL,
					max_tokens: MAX_TOKENS,
					messages: [{ role: 'user', content: prompt }]
				},
				{ signal: controller.signal }
			);
		} finally {
			clearTimeout(timeoutId);
		}

		const parsed = parseResponse(response);
		if (!parsed) {
			return { ok: false, error: { type: 'api_error', message: 'Failed to parse AI response' } };
		}
		return { ok: true, data: parsed };
	} catch (err: unknown) {
		if (err instanceof Error && err.name === 'AbortError') {
			console.error(`${LOG_PREFIX} Timeout after ${TIMEOUT_MS / 1000}s`);
			return {
				ok: false,
				error: { type: 'timeout', message: `Timeout after ${TIMEOUT_MS / 1000}s` }
			};
		}

		if (isApiError(err) && (err.status === 401 || err.status === 403)) {
			// Do NOT log the API key or detailed auth error
			console.error(`${LOG_PREFIX} Authentication error (${err.status})`);
			return {
				ok: false,
				error: { type: 'auth_error', message: 'API key invalid or unauthorized' }
			};
		}

		const statusCode = isApiError(err) ? err.status : 'unknown';
		// Avoid logging any key material from error messages
		console.error(`${LOG_PREFIX} API error: ${statusCode}`);
		return { ok: false, error: { type: 'api_error', message: 'AI narrative generation failed' } };
	}
}

/**
 * Builds the structured prompt for Claude API narrative generation.
 *
 * Input data included in prompt:
 * - Patent metadata: title, applicant, publication number, filing year
 * - Normalized scores: all available indicators with percentiles
 * - Cohort context: technology field, filing year, cohort size
 * - WIPO PMI: classification (HIGH/MEDIUM/LOW), pmi_score
 *
 * Instructions in prompt:
 * - Produce 2-3 sentence summary
 * - Reference specific cohort data
 * - Suggest archetype: Specialist, Generalist, Disruptor, or Incremental
 * - Respond in JSON format
 */
function buildPrompt(profile: PatentProfile): string {
	const filingYear = profile.filingDate?.substring(0, 4) ?? 'Unknown';

	const scores = profile.normalizedScores
		.filter((s) => s.available && s.normalized !== null)
		.map(
			(s) =>
				`- ${s.indicator}: normalized=${s.normalized?.toFixed(2)}, percentile=${s.percentile?.toFixed(0)}th, cohort_size=${s.cohortSize ?? 'N/A'}`
		)
		.join('\n');

	const pmiSection = profile.pmiData
		? `Field Activity Index: ${profile.pmiData.classification} (FAI Score: ${profile.pmiData.pmiScore.toFixed(2)}, Activity: ${profile.pmiData.activityLevel.toFixed(2)}, CAGR: ${profile.pmiData.cagr.toFixed(2)})`
		: 'Field Activity Index: Not available';

	return `You are a patent quality analyst. Analyze this patent's quality profile and provide a brief narrative summary.

PATENT METADATA:
- Title: ${profile.title}
- Publication: ${profile.publicationNumber}
- Applicants: ${profile.applicants.join(', ') || 'Unknown'}
- Filing Year: ${filingYear}
- Technology Field: ${profile.wipoFieldName} (WIPO field ${profile.wipoFieldNumber})
- Grant Status: ${profile.grantStatus}

NORMALIZED QUALITY SCORES (0.0-1.0 scale, compared to cohort):
${scores || 'No normalized scores available'}

COMPOSITE QUALITY INDEX: ${profile.compositeScore !== null ? profile.compositeScore.toFixed(2) : 'N/A'}

${pmiSection}

PATENT ARCHETYPES:
- Specialist: High scores in one dimension, moderate/low in others
- Generalist: Balanced scores across all dimensions (>0.5 each)
- Disruptor: High technological importance, low market relevance
- Incremental: Low scores across most dimensions (<0.4 average)

INSTRUCTIONS:
1. Write a 2-3 sentence summary of this patent's quality profile
2. Reference specific cohort data (e.g., "in the 87th percentile of [field] patents filed in [year]")
3. Suggest one archetype that best matches the score pattern
4. Respond ONLY with valid JSON in this exact format:

{"summary": "Your 2-3 sentence summary here.", "archetype": "Specialist"}`;
}

/**
 * Parses the Claude API response into a NarrativeResponse.
 * Returns null if the response cannot be parsed.
 */
function parseResponse(response: {
	content: Array<{ type: string; text?: string }>;
}): NarrativeResponse | null {
	try {
		const textBlock = response.content.find((b) => b.type === 'text');
		if (!textBlock?.text) {
			console.error(`${LOG_PREFIX} Failed to parse response: no text block`);
			return null;
		}

		const parsed: unknown = JSON.parse(extractJson(textBlock.text));
		if (!isValidNarrativePayload(parsed)) {
			console.error(`${LOG_PREFIX} Failed to parse response: invalid shape`);
			return null;
		}

		const archetype = VALID_ARCHETYPES.includes(parsed.archetype as PatentArchetype)
			? (parsed.archetype as PatentArchetype)
			: null;

		return {
			summary: parsed.summary,
			archetype,
			generatedAt: new Date().toISOString()
		};
	} catch {
		console.error(`${LOG_PREFIX} Failed to parse response`);
		return null;
	}
}

/** Extracts JSON from Claude response, stripping markdown code fences if present */
function extractJson(text: string): string {
	const trimmed = text.trim();
	// Strip ```json ... ``` or ``` ... ``` wrappers
	const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
	return match ? match[1].trim() : trimmed;
}

/** Type guard for the raw JSON payload from Claude */
function isValidNarrativePayload(
	value: unknown
): value is { summary: string; archetype: string | null } {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return typeof obj.summary === 'string' && obj.summary.length > 0;
}

/** Type guard for API errors with a status code */
function isApiError(err: unknown): err is { status: number; message: string } {
	return typeof err === 'object' && err !== null && 'status' in err;
}

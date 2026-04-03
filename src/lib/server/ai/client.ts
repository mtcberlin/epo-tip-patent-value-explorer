import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

let _client: Anthropic | null = null;

/**
 * Lazy-initialized Anthropic client using the server env variable.
 * Returns null if ANTHROPIC_API_KEY is not set.
 */
export function getAnthropicClient(): Anthropic | null {
	if (!env.ANTHROPIC_API_KEY) return null;
	if (!_client) {
		_client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	}
	return _client;
}

/**
 * Returns an Anthropic client, preferring a user-provided runtime key.
 * If apiKey is provided, creates a fresh instance (never cached in the singleton).
 * Falls back to the env-var singleton if no runtime key is given.
 * Returns null if no key is available from either source.
 */
export function getAnthropicClientWithKey(apiKey?: string): Anthropic | null {
	if (apiKey) {
		return new Anthropic({ apiKey });
	}
	return getAnthropicClient();
}

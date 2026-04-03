import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Anthropic SDK as a class constructor
vi.mock('@anthropic-ai/sdk', () => {
	const MockAnthropic = vi.fn(function (this: Record<string, unknown>, opts: { apiKey: string }) {
		this._apiKey = opts.apiKey;
		this.messages = { create: vi.fn() };
	});
	return { default: MockAnthropic };
});

// Mock env
vi.mock('$env/dynamic/private', () => ({
	env: { ANTHROPIC_API_KEY: '' }
}));

describe('AI client', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	describe('getAnthropicClient', () => {
		it('returns null when no env key is set', async () => {
			const { getAnthropicClient } = await import('./client');
			expect(getAnthropicClient()).toBeNull();
		});

		it('returns a client when env key is set', async () => {
			const { env } = await import('$env/dynamic/private');
			(env as Record<string, string>).ANTHROPIC_API_KEY = 'sk-ant-env-key';
			const { getAnthropicClient } = await import('./client');
			const client = getAnthropicClient();
			expect(client).not.toBeNull();
		});
	});

	describe('getAnthropicClientWithKey', () => {
		it('creates a fresh instance with a user-provided key', async () => {
			const { getAnthropicClientWithKey } = await import('./client');
			const client = getAnthropicClientWithKey('sk-ant-user-key');
			expect(client).not.toBeNull();
		});

		it('falls back to env singleton when no user key', async () => {
			const { env } = await import('$env/dynamic/private');
			(env as Record<string, string>).ANTHROPIC_API_KEY = 'sk-ant-env-key';
			const { getAnthropicClientWithKey } = await import('./client');
			const client = getAnthropicClientWithKey();
			expect(client).not.toBeNull();
		});

		it('returns null when no user key and no env key', async () => {
			const { env } = await import('$env/dynamic/private');
			(env as Record<string, string>).ANTHROPIC_API_KEY = '';
			const { getAnthropicClientWithKey } = await import('./client');
			const client = getAnthropicClientWithKey();
			expect(client).toBeNull();
		});

		it('does not cache user-provided key instances', async () => {
			const { getAnthropicClientWithKey } = await import('./client');
			const client1 = getAnthropicClientWithKey('sk-ant-key1');
			const client2 = getAnthropicClientWithKey('sk-ant-key2');
			expect(client1).not.toBe(client2);
		});
	});
});

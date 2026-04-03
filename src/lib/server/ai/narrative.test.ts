import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PatentProfile } from '$lib/scoring/types';

// Mock the client module
vi.mock('./client', () => ({
	getAnthropicClientWithKey: vi.fn()
}));

import { getAnthropicClientWithKey } from './client';
import { generateNarrative } from './narrative';

const mockGetClient = vi.mocked(getAnthropicClientWithKey);

function createMockProfile(overrides: Partial<PatentProfile> = {}): PatentProfile {
	return {
		publicationNumber: 'EP1000000B1',
		title: 'Method for testing patents',
		applicants: ['Test Corp'],
		filingDate: '2015-06-15',
		grantDate: '2018-03-20',
		grantStatus: 'granted',
		cpcCodes: ['G06F'],
		wipoFieldNumber: 6,
		wipoFieldName: 'Computer Technology',
		applnId: 12345,
		rawIndicators: [],
		normalizedScores: [
			{
				indicator: 'forward_citations',
				raw: 45,
				normalized: 0.87,
				percentile: 87,
				available: true,
				cohortSize: 1500,
				smallCohort: false
			},
			{
				indicator: 'family_size',
				raw: 12,
				normalized: 0.72,
				percentile: 72,
				available: true,
				cohortSize: 1500,
				smallCohort: false
			}
		],
		compositeScore: 0.65,
		pmiData: {
			classification: 'HIGH',
			pmiScore: 1.25,
			activityLevel: 1.1,
			cagr: 0.05
		},
		narrative: null,
		...overrides
	};
}

function createMockClient(responseText: string) {
	return {
		messages: {
			create: vi.fn().mockResolvedValue({
				content: [{ type: 'text', text: responseText }]
			})
		}
	};
}

describe('generateNarrative', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns NarrativeResponse on successful generation', async () => {
		const mockClient = createMockClient(
			JSON.stringify({
				summary:
					'This patent demonstrates strong technological importance, with forward citations in the 87th percentile of Computer Technology patents filed in 2015.',
				archetype: 'Specialist'
			})
		);
		mockGetClient.mockReturnValue(mockClient as never);

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.summary).toContain('87th percentile');
			expect(result.data.archetype).toBe('Specialist');
			expect(result.data.generatedAt).toBeTruthy();
			expect(new Date(result.data.generatedAt).toISOString()).toBe(result.data.generatedAt);
		}
	});

	it('includes normalized scores, percentiles, and cohort context in prompt', async () => {
		const mockClient = createMockClient(
			JSON.stringify({ summary: 'Test summary.', archetype: 'Generalist' })
		);
		mockGetClient.mockReturnValue(mockClient as never);

		await generateNarrative(createMockProfile());

		const call = mockClient.messages.create.mock.calls[0];
		const prompt = call[0].messages[0].content as string;

		expect(prompt).toContain('forward_citations');
		expect(prompt).toContain('normalized=0.87');
		expect(prompt).toContain('percentile=87th');
		expect(prompt).toContain('cohort_size=1500');
		expect(prompt).toContain('Computer Technology');
		expect(prompt).toContain('WIPO field 6');
		expect(prompt).toContain('HIGH');
		expect(prompt).toContain('Method for testing patents');
		expect(prompt).toContain('EP1000000B1');
		expect(prompt).toContain('Test Corp');
		expect(prompt).toContain('2015');
	});

	it('returns no_key error when API key is missing', async () => {
		mockGetClient.mockReturnValue(null);
		const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('no_key');
		}
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[ai:narrative] No API key configured')
		);
	});

	it('returns timeout error on API timeout', async () => {
		const mockClient = {
			messages: {
				create: vi
					.fn()
					.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
			}
		};
		mockGetClient.mockReturnValue(mockClient as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('timeout');
		}
	});

	it('returns auth_error on 401 response', async () => {
		const mockClient = {
			messages: {
				create: vi.fn().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }))
			}
		};
		mockGetClient.mockReturnValue(mockClient as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('auth_error');
			expect(result.error.message).toContain('invalid or unauthorized');
		}
	});

	it('returns auth_error on 403 response', async () => {
		const mockClient = {
			messages: {
				create: vi.fn().mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }))
			}
		};
		mockGetClient.mockReturnValue(mockClient as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('auth_error');
		}
	});

	it('returns api_error on 500 response', async () => {
		const mockClient = {
			messages: {
				create: vi
					.fn()
					.mockRejectedValue(Object.assign(new Error('Internal Server Error'), { status: 500 }))
			}
		};
		mockGetClient.mockReturnValue(mockClient as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('api_error');
		}
	});

	it('returns api_error on parse error (invalid JSON)', async () => {
		const mockClient = createMockClient('not valid json');
		mockGetClient.mockReturnValue(mockClient as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('api_error');
		}
	});

	it('returns null archetype for invalid archetype value', async () => {
		const mockClient = createMockClient(
			JSON.stringify({ summary: 'Test summary.', archetype: 'InvalidType' })
		);
		mockGetClient.mockReturnValue(mockClient as never);

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.archetype).toBeNull();
			expect(result.data.summary).toBe('Test summary.');
		}
	});

	it('handles JSON wrapped in markdown code fences', async () => {
		const mockClient = createMockClient(
			'```json\n{"summary": "This patent shows strong innovation.", "archetype": "Generalist"}\n```'
		);
		mockGetClient.mockReturnValue(mockClient as never);

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.summary).toBe('This patent shows strong innovation.');
			expect(result.data.archetype).toBe('Generalist');
		}
	});

	it('uses claude-sonnet-4-5-20250929 model', async () => {
		const mockClient = createMockClient(
			JSON.stringify({ summary: 'Test.', archetype: 'Generalist' })
		);
		mockGetClient.mockReturnValue(mockClient as never);

		await generateNarrative(createMockProfile());

		const call = mockClient.messages.create.mock.calls[0];
		expect(call[0].model).toBe('claude-sonnet-4-5-20250929');
		expect(call[0].max_tokens).toBe(500);
	});

	it('returns api_error when response has no text block', async () => {
		const mockClient = {
			messages: {
				create: vi.fn().mockResolvedValue({
					content: [{ type: 'tool_use', id: 'test' }]
				})
			}
		};
		mockGetClient.mockReturnValue(mockClient as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await generateNarrative(createMockProfile());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('api_error');
		}
	});

	it('passes apiKey parameter through to client factory', async () => {
		const mockClient = createMockClient(
			JSON.stringify({ summary: 'Test.', archetype: 'Generalist' })
		);
		mockGetClient.mockReturnValue(mockClient as never);

		await generateNarrative(createMockProfile(), 'sk-ant-user-key');

		expect(mockGetClient).toHaveBeenCalledWith('sk-ant-user-key');
	});
});

import { describe, it, expect, vi } from 'vitest';
import type { McpClient } from '$lib/server/mcp/types';

vi.mock('$lib/server/mcp/client', () => ({
	parseMarkdownTable: vi.fn((text: string) => {
		const lines = text.split('\n').filter((l: string) => l.startsWith('|'));
		if (lines.length < 3) return [];
		const headers = lines[0]
			.split('|')
			.map((h: string) => h.trim())
			.filter(Boolean);
		const rows: Record<string, string>[] = [];
		for (let i = 2; i < lines.length; i++) {
			const cells = lines[i]
				.split('|')
				.map((c: string) => c.trim())
				.filter(Boolean);
			if (cells.length !== headers.length) continue;
			const row: Record<string, string> = {};
			headers.forEach((h: string, idx: number) => {
				row[h] = cells[idx];
			});
			rows.push(row);
		}
		return rows;
	})
}));

function createMockClient(response: string): McpClient {
	return { executeQuery: vi.fn().mockResolvedValue(response) };
}

function createErrorClient(error: Error): McpClient {
	return { executeQuery: vi.fn().mockRejectedValue(error) };
}

describe('calculateRadicalnessIndex', () => {
	it('returns share of non-overlapping citations', async () => {
		const { calculateRadicalnessIndex } = await import('./radicalness-index');
		const client = createMockClient('| total | radical |\n| --- | --- |\n| 10 | 4 |');

		const result = await calculateRadicalnessIndex(12345, client);

		expect(result).toEqual({
			indicator: 'radicalness_index',
			value: 0.4,
			available: true,
			dataSource: 'tls212_citation + tls224_appln_cpc',
			error: null
		});
	});

	it('returns 1.0 when every citation is in a different CPC subclass', async () => {
		const { calculateRadicalnessIndex } = await import('./radicalness-index');
		const client = createMockClient('| total | radical |\n| --- | --- |\n| 5 | 5 |');

		const result = await calculateRadicalnessIndex(12345, client);

		expect(result.value).toBe(1);
		expect(result.available).toBe(true);
	});

	it('returns 0.0 when every citation overlaps with focal CPC', async () => {
		const { calculateRadicalnessIndex } = await import('./radicalness-index');
		const client = createMockClient('| total | radical |\n| --- | --- |\n| 7 | 0 |');

		const result = await calculateRadicalnessIndex(12345, client);

		expect(result.value).toBe(0);
		expect(result.available).toBe(true);
	});

	it('returns unavailable when patent has zero backward citations', async () => {
		const { calculateRadicalnessIndex } = await import('./radicalness-index');
		const client = createMockClient('| total | radical |\n| --- | --- |\n| 0 | 0 |');

		const result = await calculateRadicalnessIndex(12345, client);

		expect(result.available).toBe(false);
		expect(result.value).toBeNull();
	});

	it('returns unavailable on empty MCP result', async () => {
		const { calculateRadicalnessIndex } = await import('./radicalness-index');
		const client = createMockClient('No results found');

		const result = await calculateRadicalnessIndex(12345, client);

		expect(result.available).toBe(false);
		expect(result.value).toBeNull();
	});

	it('returns unavailable on MCP timeout', async () => {
		const { calculateRadicalnessIndex } = await import('./radicalness-index');
		const client = createErrorClient(new Error('MCP tool timed out after 30000ms'));

		const result = await calculateRadicalnessIndex(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('timed out');
	});
});

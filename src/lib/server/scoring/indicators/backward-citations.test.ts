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

describe('calculateBackwardCitations', () => {
	it('returns value on successful query', async () => {
		const { calculateBackwardCitations } = await import('./backward-citations');
		const client = createMockClient('| backward_count |\n| --- |\n| 23 |');

		const result = await calculateBackwardCitations(12345, client);

		expect(result).toEqual({
			indicator: 'backward_citations',
			value: 23,
			available: true,
			dataSource: 'tls212_citation',
			error: null
		});
	});

	it('returns unavailable on empty result', async () => {
		const { calculateBackwardCitations } = await import('./backward-citations');
		const client = createMockClient('No results found');

		const result = await calculateBackwardCitations(12345, client);

		expect(result.available).toBe(false);
		expect(result.value).toBeNull();
	});

	it('returns unavailable on MCP timeout', async () => {
		const { calculateBackwardCitations } = await import('./backward-citations');
		const client = createErrorClient(new Error('MCP tool timed out after 30000ms'));

		const result = await calculateBackwardCitations(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('timed out');
	});

	it('returns unavailable on MCP server error', async () => {
		const { calculateBackwardCitations } = await import('./backward-citations');
		const client = createErrorClient(new Error('MCP server error: 500'));

		const result = await calculateBackwardCitations(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('500');
	});

	it('handles zero backward citations', async () => {
		const { calculateBackwardCitations } = await import('./backward-citations');
		const client = createMockClient('| backward_count |\n| --- |\n| 0 |');

		const result = await calculateBackwardCitations(12345, client);

		expect(result.value).toBe(0);
		expect(result.available).toBe(true);
	});
});

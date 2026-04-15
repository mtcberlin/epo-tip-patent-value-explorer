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

describe('calculatePatentScope', () => {
	it('returns subclass count on successful query', async () => {
		const { calculatePatentScope } = await import('./patent-scope');
		const client = createMockClient('| cnt |\n| --- |\n| 4 |');

		const result = await calculatePatentScope(12345, client);

		expect(result).toEqual({
			indicator: 'patent_scope',
			value: 4,
			available: true,
			dataSource: 'tls224_appln_cpc',
			error: null
		});
	});

	it('returns unavailable when patent has zero CPC subclasses', async () => {
		const { calculatePatentScope } = await import('./patent-scope');
		const client = createMockClient('| cnt |\n| --- |\n| 0 |');

		const result = await calculatePatentScope(12345, client);

		expect(result.available).toBe(false);
		expect(result.value).toBeNull();
	});

	it('returns unavailable on empty MCP result', async () => {
		const { calculatePatentScope } = await import('./patent-scope');
		const client = createMockClient('No results found');

		const result = await calculatePatentScope(12345, client);

		expect(result.available).toBe(false);
		expect(result.value).toBeNull();
	});

	it('returns unavailable on MCP timeout', async () => {
		const { calculatePatentScope } = await import('./patent-scope');
		const client = createErrorClient(new Error('MCP tool timed out after 30000ms'));

		const result = await calculatePatentScope(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('timed out');
	});

	it('handles single subclass patent', async () => {
		const { calculatePatentScope } = await import('./patent-scope');
		const client = createMockClient('| cnt |\n| --- |\n| 1 |');

		const result = await calculatePatentScope(12345, client);

		expect(result.value).toBe(1);
		expect(result.available).toBe(true);
	});
});

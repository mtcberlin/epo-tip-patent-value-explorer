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

describe('calculateGeneralityIndex', () => {
	it('calculates Herfindahl diversity from citing patent CPC sections', async () => {
		const { calculateGeneralityIndex } = await import('./generality-index');
		// 4 CPC sections equally distributed → 1 - 4*(1/4)^2 = 0.75
		const client = createMockClient(
			'| cpc_section | cnt |\n| --- | --- |\n| A | 25 |\n| B | 25 |\n| C | 25 |\n| H | 25 |'
		);

		const result = await calculateGeneralityIndex(12345, client);

		expect(result.indicator).toBe('generality_index');
		expect(result.available).toBe(true);
		expect(result.value).toBeCloseTo(0.75, 3);
	});

	it('returns unavailable when no forward citations', async () => {
		const { calculateGeneralityIndex } = await import('./generality-index');
		const client = createMockClient('No results found');

		const result = await calculateGeneralityIndex(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toBe('No forward citation data available');
	});

	it('returns 0 for citations all from one CPC section', async () => {
		const { calculateGeneralityIndex } = await import('./generality-index');
		const client = createMockClient('| cpc_section | cnt |\n| --- | --- |\n| G | 100 |');

		const result = await calculateGeneralityIndex(12345, client);

		expect(result.available).toBe(true);
		expect(result.value).toBe(0);
	});

	it('returns unavailable on MCP error', async () => {
		const { calculateGeneralityIndex } = await import('./generality-index');
		const client = createErrorClient(new Error('MCP server error: 500'));

		const result = await calculateGeneralityIndex(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('500');
	});
});

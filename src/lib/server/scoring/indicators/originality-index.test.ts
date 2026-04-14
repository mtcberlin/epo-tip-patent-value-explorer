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

describe('calculateOriginalityIndex', () => {
	it('calculates Herfindahl diversity from CPC sections', async () => {
		const { calculateOriginalityIndex } = await import('./originality-index');
		// 3 CPC sections: A=10, B=10, C=10 → perfectly even → 1 - 3*(1/3)^2 = 0.6667
		const client = createMockClient(
			'| cpc_section | cnt |\n| --- | --- |\n| A | 10 |\n| B | 10 |\n| C | 10 |'
		);

		const result = await calculateOriginalityIndex(12345, client);

		expect(result.indicator).toBe('originality_index');
		expect(result.available).toBe(true);
		expect(result.value).toBeCloseTo(0.6667, 3);
	});

	it('returns 0 for single CPC section (all from one class)', async () => {
		const { calculateOriginalityIndex } = await import('./originality-index');
		const client = createMockClient('| cpc_section | cnt |\n| --- | --- |\n| H | 50 |');

		const result = await calculateOriginalityIndex(12345, client);

		expect(result.available).toBe(true);
		expect(result.value).toBe(0);
	});

	it('returns unavailable when no backward citations', async () => {
		const { calculateOriginalityIndex } = await import('./originality-index');
		const client = createMockClient('No results found');

		const result = await calculateOriginalityIndex(12345, client);

		expect(result.available).toBe(false);
		expect(result.value).toBeNull();
	});

	it('returns unavailable on MCP error', async () => {
		const { calculateOriginalityIndex } = await import('./originality-index');
		const client = createErrorClient(new Error('MCP server error: 500'));

		const result = await calculateOriginalityIndex(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('500');
	});
});

describe('calculateHerfindahl', () => {
	it('returns 0 for single class', async () => {
		const { calculateHerfindahl } = await import('./originality-index');
		expect(calculateHerfindahl([100])).toBe(0);
	});

	it('returns correct value for two equal classes', async () => {
		const { calculateHerfindahl } = await import('./originality-index');
		expect(calculateHerfindahl([50, 50])).toBeCloseTo(0.5, 4);
	});

	it('returns 0 for empty array', async () => {
		const { calculateHerfindahl } = await import('./originality-index');
		expect(calculateHerfindahl([])).toBe(0);
	});

	it('handles skewed distribution', async () => {
		const { calculateHerfindahl } = await import('./originality-index');
		// 90 from A, 10 from B → 1 - (0.9^2 + 0.1^2) = 1 - 0.82 = 0.18
		expect(calculateHerfindahl([90, 10])).toBeCloseTo(0.18, 2);
	});
});

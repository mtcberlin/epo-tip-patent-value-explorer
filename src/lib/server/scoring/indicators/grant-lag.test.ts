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

describe('calculateGrantLag', () => {
	it('calculates days between filing and grant', async () => {
		const { calculateGrantLag } = await import('./grant-lag');
		const client = createMockClient(
			'| appln_filing_date | grant_date |\n| --- | --- |\n| 2010-01-15 | 2013-06-20 |'
		);

		const result = await calculateGrantLag(12345, client);

		expect(result.indicator).toBe('grant_lag_days');
		expect(result.available).toBe(true);
		// ~1252 days between 2010-01-15 and 2013-06-20
		expect(result.value).toBe(1252);
	});

	it('returns unavailable for ungranted patent', async () => {
		const { calculateGrantLag } = await import('./grant-lag');
		const client = createMockClient('No results found');

		const result = await calculateGrantLag(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toBe('Patent not granted');
	});

	it('returns unavailable for sentinel date 9999-12-31', async () => {
		const { calculateGrantLag } = await import('./grant-lag');
		const client = createMockClient(
			'| appln_filing_date | grant_date |\n| --- | --- |\n| 9999-12-31 | 2013-06-20 |'
		);

		const result = await calculateGrantLag(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toBe('Invalid date data');
	});

	it('returns unavailable on MCP error', async () => {
		const { calculateGrantLag } = await import('./grant-lag');
		const client = createErrorClient(new Error('MCP timeout'));

		const result = await calculateGrantLag(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('timeout');
	});
});

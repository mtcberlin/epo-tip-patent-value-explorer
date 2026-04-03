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

describe('calculateRenewalDuration', () => {
	it('returns max renewal year on successful query', async () => {
		const { calculateRenewalDuration } = await import('./renewal-duration');
		const client = createMockClient('| max_renewal_year |\n| --- |\n| 15 |');

		const result = await calculateRenewalDuration(12345, client);

		expect(result).toEqual({
			indicator: 'renewal_duration',
			value: 15,
			available: true,
			dataSource: 'tls231_inpadoc_legal_event',
			error: null
		});
	});

	it('returns unavailable when no renewal data', async () => {
		const { calculateRenewalDuration } = await import('./renewal-duration');
		const client = createMockClient('No results found');

		const result = await calculateRenewalDuration(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toBe('No renewal fee data available');
	});

	it('returns unavailable for null max year', async () => {
		const { calculateRenewalDuration } = await import('./renewal-duration');
		const client = createMockClient('| max_renewal_year |\n| --- |\n| null |');

		const result = await calculateRenewalDuration(12345, client);

		expect(result.available).toBe(false);
	});

	it('returns unavailable on MCP error', async () => {
		const { calculateRenewalDuration } = await import('./renewal-duration');
		const client = createErrorClient(new Error('MCP server error: 500'));

		const result = await calculateRenewalDuration(12345, client);

		expect(result.available).toBe(false);
		expect(result.error).toContain('500');
	});
});

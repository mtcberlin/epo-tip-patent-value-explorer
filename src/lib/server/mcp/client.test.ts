import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock env
vi.mock('$env/dynamic/private', () => ({
	env: {
		PATSTAT_MCP_URL: 'https://patstat.test/mcp?api_key=test-key'
	}
}));

let fetchMock: ReturnType<typeof vi.fn>;

function createInitResponse(sessionId: string) {
	return {
		ok: true,
		status: 200,
		headers: new Headers({ 'mcp-session-id': sessionId }),
		json: async () => ({
			jsonrpc: '2.0',
			id: 1,
			result: {
				protocolVersion: '2025-03-26',
				capabilities: {},
				serverInfo: { name: 'test-server', version: '1.0.0' }
			}
		})
	};
}

function createSuccessResponse(text: string) {
	return {
		ok: true,
		status: 200,
		headers: new Headers(),
		json: async () => ({
			jsonrpc: '2.0',
			id: 2,
			result: {
				content: [{ type: 'text', text }],
				isError: false
			}
		})
	};
}

function create5xxResponse(status = 500) {
	return {
		ok: false,
		status,
		statusText: 'Internal Server Error',
		headers: new Headers(),
		json: async () => ({
			jsonrpc: '2.0',
			id: 'error',
			error: { code: -32000, message: 'Server error' }
		})
	};
}

function create4xxResponse(status = 400, message = 'Bad request') {
	return {
		ok: false,
		status,
		statusText: 'Bad Request',
		headers: new Headers(),
		json: async () => ({
			jsonrpc: '2.0',
			id: 'error',
			error: { code: -32600, message }
		})
	};
}

beforeEach(async () => {
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
	// Reset module to clear cached session
	vi.resetModules();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('callTool', () => {
	it('initializes session and returns successful tool call', async () => {
		fetchMock
			.mockResolvedValueOnce(createInitResponse('test-session-123'))
			.mockResolvedValueOnce(createSuccessResponse('result data'));

		const { callTool } = await import('./client');
		const result = await callTool('list_tables', {});

		expect(result.result.content[0].text).toBe('result data');
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// First call is init
		const initBody = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(initBody.method).toBe('initialize');

		// Second call is tool call
		const toolBody = JSON.parse(fetchMock.mock.calls[1][1].body);
		expect(toolBody.method).toBe('tools/call');
		expect(toolBody.params.name).toBe('list_tables');
	});

	it('retries on 5xx then fails with server_error', async () => {
		fetchMock
			.mockResolvedValueOnce(createInitResponse('sess-1'))
			.mockResolvedValueOnce(create5xxResponse())
			.mockResolvedValueOnce(create5xxResponse());

		const { callTool } = await import('./client');

		try {
			await callTool('execute_query', { query: 'SELECT 1' });
			expect.fail('Should have thrown');
		} catch (err) {
			expect((err as Error).message).toContain('server error');
		}

		// init + 2 attempts (original + 1 retry)
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('fails immediately on 4xx without retry', async () => {
		fetchMock
			.mockResolvedValueOnce(createInitResponse('sess-2'))
			.mockResolvedValueOnce(create4xxResponse(404, 'Not found'));

		const { callTool } = await import('./client');

		try {
			await callTool('execute_query', { query: 'SELECT 1' });
			expect.fail('Should have thrown');
		} catch (err) {
			expect((err as Error).message).toBe('Not found');
		}

		// init + 1 attempt (no retry on 4xx)
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('handles network error with AbortError as timeout', async () => {
		fetchMock
			.mockResolvedValueOnce(createInitResponse('sess-3'))
			// Simulate AbortError (what happens on timeout)
			.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'))
			.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

		const { callTool } = await import('./client');

		try {
			await callTool('execute_query', { query: 'SELECT 1' });
			expect.fail('Should have thrown');
		} catch (err) {
			expect((err as Error).message).toContain('timed out');
		}

		// init + 2 attempts (original + 1 retry on timeout)
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('reuses existing session', async () => {
		fetchMock
			.mockResolvedValueOnce(createInitResponse('reuse-session'))
			.mockResolvedValueOnce(createSuccessResponse('first'))
			.mockResolvedValueOnce(createSuccessResponse('second'));

		const { callTool } = await import('./client');

		await callTool('list_tables', {});
		await callTool('list_tables', {});

		// 1 init + 2 tool calls = 3 (no second init)
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});

describe('parseMarkdownTable', () => {
	it('is used by lookupPatent to parse query results', async () => {
		// Test via executeQuery which uses parseMarkdownTable internally
		fetchMock
			.mockResolvedValueOnce(createInitResponse('parse-sess'))
			.mockResolvedValueOnce(
				createSuccessResponse('| col1 | col2 |\n| --- | --- |\n| val1 | val2 |')
			);

		const { executeQuery } = await import('./client');
		const result = await executeQuery('SELECT 1');

		expect(result).toContain('val1');
		expect(result).toContain('val2');
	});
});

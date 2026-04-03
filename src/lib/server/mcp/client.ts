import { env } from '$env/dynamic/private';
import type {
	McpToolCallRequest,
	McpToolCallResponse,
	McpErrorResponse,
	McpInitializeResponse,
	McpClient,
	PatentMetadata
} from './types';
import { McpError } from './types';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const LOG_PREFIX = '[mcp:client]';

let _sessionId: string | null = null;
let _requestId = 0;

function nextId(): number {
	return ++_requestId;
}

function getBaseUrl(): string {
	const url = env.PATSTAT_MCP_URL;
	if (!url) {
		throw new McpError('network_error', 'PATSTAT_MCP_URL not configured');
	}
	return url;
}

/** Initialize MCP session if not already established */
async function ensureSession(): Promise<string> {
	if (_sessionId) return _sessionId;

	const url = getBaseUrl();
	const body = {
		jsonrpc: '2.0' as const,
		id: nextId(),
		method: 'initialize',
		params: {
			protocolVersion: '2025-03-26',
			capabilities: {},
			clientInfo: { name: 'pve-client', version: '0.1.0' }
		}
	};

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify(body),
			signal: controller.signal
		});

		clearTimeout(timer);

		if (!res.ok) {
			throw new McpError('session_error', `MCP init failed: ${res.status} ${res.statusText}`);
		}

		const sessionId = res.headers.get('mcp-session-id');
		if (!sessionId) {
			throw new McpError('session_error', 'MCP server did not return session ID');
		}

		const data = (await res.json()) as McpInitializeResponse;
		console.log(
			`${LOG_PREFIX} Session established with ${data.result.serverInfo.name} v${data.result.serverInfo.version}`
		);

		_sessionId = sessionId;
		return sessionId;
	} catch (err) {
		clearTimeout(timer);
		if (err instanceof McpError) throw err;
		if (err instanceof DOMException && err.name === 'AbortError') {
			throw new McpError('timeout', 'MCP session initialization timed out');
		}
		throw new McpError('network_error', `MCP session init failed: ${String(err)}`);
	}
}

/** Reset session (e.g. after session expiry) */
function resetSession(): void {
	_sessionId = null;
}

/**
 * Call an MCP tool with retry logic.
 * Retries once on timeout or 5xx. No retry on 4xx.
 */
export async function callTool(
	toolName: string,
	args: Record<string, unknown>
): Promise<McpToolCallResponse> {
	let lastError: McpError | null = null;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		if (attempt > 0) {
			console.log(`${LOG_PREFIX} Retrying ${toolName} (attempt ${attempt + 1})`);
		}

		try {
			const sessionId = await ensureSession();
			const url = getBaseUrl();

			const body: McpToolCallRequest = {
				jsonrpc: '2.0',
				id: nextId(),
				method: 'tools/call',
				params: { name: toolName, arguments: args }
			};

			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

			let res: Response;
			try {
				res = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						'Mcp-Session-Id': sessionId
					},
					body: JSON.stringify(body),
					signal: controller.signal
				});
			} catch (err) {
				clearTimeout(timer);
				if (err instanceof DOMException && err.name === 'AbortError') {
					lastError = new McpError(
						'timeout',
						`MCP tool ${toolName} timed out after ${TIMEOUT_MS}ms`
					);
					continue;
				}
				lastError = new McpError('network_error', `MCP network error: ${String(err)}`);
				continue;
			}

			clearTimeout(timer);

			// 4xx: no retry
			if (res.status >= 400 && res.status < 500) {
				const errorBody = (await res.json().catch(() => null)) as McpErrorResponse | null;
				const msg = errorBody?.error?.message ?? `HTTP ${res.status}`;

				// Session expired → reset and retry
				if (res.status === 400 && msg.includes('session')) {
					resetSession();
					lastError = new McpError('session_error', msg);
					continue;
				}

				if (res.status === 404) {
					throw new McpError('not_found', msg, errorBody);
				}
				throw new McpError('validation_error', msg, errorBody);
			}

			// 5xx: retry
			if (res.status >= 500) {
				lastError = new McpError('server_error', `MCP server error: ${res.status}`);
				continue;
			}

			const data = (await res.json()) as McpToolCallResponse | McpErrorResponse;

			if ('error' in data) {
				const errorData = data as McpErrorResponse;
				throw new McpError('server_error', errorData.error.message, errorData);
			}

			const response = data as McpToolCallResponse;

			if (response.result.isError) {
				const errorText = response.result.content[0]?.text ?? 'Unknown MCP tool error';
				throw new McpError('server_error', errorText);
			}

			return response;
		} catch (err) {
			if (
				err instanceof McpError &&
				!['timeout', 'server_error', 'session_error'].includes(err.type)
			) {
				throw err;
			}
			if (err instanceof McpError) {
				lastError = err;
			} else {
				lastError = new McpError('network_error', String(err));
			}
		}
	}

	console.error(`${LOG_PREFIX} ${toolName} failed after ${MAX_RETRIES + 1} attempts`, lastError);
	throw lastError ?? new McpError('network_error', 'Unknown error');
}

/** Execute a SQL query against PATSTAT BigQuery */
export async function executeQuery(query: string, maxResults = 1000): Promise<string> {
	const response = await callTool('execute_query', { query, max_results: maxResults });
	return response.result.content[0]?.text ?? '';
}

/** Default McpClient implementation using the module-level functions */
export const mcpClient: McpClient = { executeQuery };

/** Parse markdown table from MCP response into rows */
export function parseMarkdownTable(text: string): Record<string, string>[] {
	const lines = text.split('\n').filter((l) => l.startsWith('|'));
	if (lines.length < 3) return []; // header + separator + at least 1 row

	const headers = lines[0]
		.split('|')
		.map((h) => h.trim())
		.filter(Boolean);
	// Skip separator line (lines[1])
	const rows: Record<string, string>[] = [];

	for (let i = 2; i < lines.length; i++) {
		const cells = lines[i]
			.split('|')
			.map((c) => c.trim())
			.filter(Boolean);
		if (cells.length !== headers.length) continue;

		const row: Record<string, string> = {};
		headers.forEach((h, idx) => {
			row[h] = cells[idx];
		});
		rows.push(row);
	}

	return rows;
}

/**
 * Look up a patent by publication number.
 * Queries PATSTAT tables: tls211 (publication), tls201 (application),
 * tls202 (title), tls207+tls206 (applicants), tls224 (CPC), tls230+tls901 (WIPO field).
 */
export async function lookupPatent(
	authority: string,
	number: string,
	kindCode: string | null
): Promise<PatentMetadata> {
	const auth = authority.toUpperCase();
	const num = number.replace(/[^0-9]/g, '');

	// Step 1: Core patent data from tls211 + tls201 + tls202
	const kindFilter = kindCode ? `AND p.publn_kind = '${kindCode.toUpperCase()}'` : '';
	const coreQuery = `
		SELECT
			p.publn_auth, p.publn_nr, p.publn_kind, p.appln_id, p.publn_date,
			p.publn_first_grant, p.publn_claims,
			a.appln_filing_date, a.granted, a.docdb_family_size, a.nb_citing_docdb_fam,
			t.appln_title
		FROM \`patstat.tls211_pat_publn\` p
		JOIN \`patstat.tls201_appln\` a ON p.appln_id = a.appln_id
		LEFT JOIN \`patstat.tls202_appln_title\` t ON a.appln_id = t.appln_id AND t.appln_title_lg = 'en'
		WHERE p.publn_auth = '${auth}' AND p.publn_nr = '${num}' ${kindFilter}
		ORDER BY p.publn_first_grant DESC, p.publn_date DESC
		LIMIT 1
	`.trim();

	console.log(`${LOG_PREFIX} Looking up ${auth}${num}${kindCode ?? ''}`);
	const coreResult = await executeQuery(coreQuery, 1);
	const coreRows = parseMarkdownTable(coreResult);

	if (coreRows.length === 0) {
		throw new McpError('not_found', `Patent ${auth}${num}${kindCode ?? ''} not found in PATSTAT`);
	}

	const core = coreRows[0];
	const applnId = parseInt(core.appln_id, 10);

	// Step 2 + 3 + 4: Applicants, CPC codes, WIPO field (parallel, isolated)
	const [applicantsSettled, cpcSettled, wipoSettled] = await Promise.allSettled([
		executeQuery(
			`SELECT pe.person_name
			 FROM \`patstat.tls207_pers_appln\` pa
			 JOIN \`patstat.tls206_person\` pe ON pa.person_id = pe.person_id
			 WHERE pa.appln_id = ${applnId} AND pa.applt_seq_nr > 0
			 ORDER BY pa.applt_seq_nr
			 LIMIT 10`,
			10
		),
		executeQuery(
			`SELECT cpc_class_symbol
			 FROM \`patstat.tls224_appln_cpc\` WHERE appln_id = ${applnId}
			 LIMIT 20`,
			20
		),
		executeQuery(
			`SELECT DISTINCT tf.techn_field_nr, tf.weight, tfi.techn_sector, tfi.techn_field
			 FROM \`patstat.tls230_appln_techn_field\` tf
			 JOIN \`patstat.tls901_techn_field_ipc\` tfi ON tf.techn_field_nr = tfi.techn_field_nr
			 WHERE tf.appln_id = ${applnId}
			 ORDER BY tf.weight DESC
			 LIMIT 1`,
			1
		)
	]);

	const applicants =
		applicantsSettled.status === 'fulfilled'
			? parseMarkdownTable(applicantsSettled.value).map((r) => r.person_name)
			: (console.error(
					`${LOG_PREFIX} Applicants query failed (non-fatal):`,
					applicantsSettled.reason
				),
				[]);
	const cpcCodes =
		cpcSettled.status === 'fulfilled'
			? parseMarkdownTable(cpcSettled.value).map((r) => r.cpc_class_symbol.trim())
			: (console.error(`${LOG_PREFIX} CPC query failed (non-fatal):`, cpcSettled.reason), []);
	const wipoRows =
		wipoSettled.status === 'fulfilled'
			? parseMarkdownTable(wipoSettled.value)
			: (console.error(`${LOG_PREFIX} WIPO query failed (non-fatal):`, wipoSettled.reason), []);
	const wipo = wipoRows[0] ?? null;

	// Determine grant date: if publn_first_grant === 'Y', the publn_date is the grant date
	const grantDate = core.publn_first_grant === 'Y' ? core.publn_date : null;
	const pubNumber = `${core.publn_auth}${core.publn_nr}${core.publn_kind}`;

	return {
		publicationNumber: pubNumber,
		applnId,
		title: core.appln_title && core.appln_title !== '...' ? core.appln_title : null,
		applicants,
		filingDate: core.appln_filing_date !== '9999-12-31' ? core.appln_filing_date : null,
		grantDate,
		granted: core.granted === 'Y',
		publicationDate: core.publn_date !== '9999-12-31' ? core.publn_date : null,
		claimsCount: core.publn_claims ? parseInt(core.publn_claims, 10) : null,
		familySize: core.docdb_family_size ? parseInt(core.docdb_family_size, 10) : null,
		forwardCitations: core.nb_citing_docdb_fam ? parseInt(core.nb_citing_docdb_fam, 10) : null,
		cpcCodes,
		wipoFieldNumber: wipo ? parseInt(wipo.techn_field_nr, 10) : null,
		wipoFieldName: wipo?.techn_field ?? null,
		wipoSector: wipo?.techn_sector ?? null
	};
}

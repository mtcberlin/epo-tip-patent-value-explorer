/** MCP JSON-RPC request for tool calls */
export interface McpToolCallRequest {
	jsonrpc: '2.0';
	id: number;
	method: 'tools/call';
	params: {
		name: string;
		arguments: Record<string, unknown>;
	};
}

/** MCP JSON-RPC response content item */
export interface McpContentItem {
	type: 'text';
	text: string;
}

/** MCP JSON-RPC successful response */
export interface McpToolCallResponse {
	jsonrpc: '2.0';
	id: number;
	result: {
		content: McpContentItem[];
		isError: boolean;
	};
}

/** MCP JSON-RPC error response */
export interface McpErrorResponse {
	jsonrpc: '2.0';
	id: string | number;
	error: {
		code: number;
		message: string;
	};
}

/** MCP initialize response */
export interface McpInitializeResponse {
	jsonrpc: '2.0';
	id: number;
	result: {
		protocolVersion: string;
		capabilities: Record<string, unknown>;
		serverInfo: {
			name: string;
			version: string;
		};
	};
}

/** Structured error from MCP client */
export type McpErrorType =
	| 'timeout'
	| 'server_error'
	| 'not_found'
	| 'validation_error'
	| 'network_error'
	| 'session_error';

export class McpError extends Error {
	readonly type: McpErrorType;
	readonly details?: unknown;

	constructor(type: McpErrorType, message: string, details?: unknown) {
		super(message);
		this.name = 'McpError';
		this.type = type;
		this.details = details;
	}
}

/** Abstraction over MCP client for dependency injection and testability */
export interface McpClient {
	executeQuery(query: string, maxResults?: number): Promise<string>;
}

/** Patent metadata returned from PATSTAT lookup */
export interface PatentMetadata {
	publicationNumber: string;
	applnId: number;
	title: string | null;
	applicants: string[];
	filingDate: string | null;
	grantDate: string | null;
	granted: boolean;
	publicationDate: string | null;
	claimsCount: number | null;
	familySize: number | null;
	forwardCitations: number | null;
	cpcCodes: string[];
	wipoFieldNumber: number | null;
	wipoFieldName: string | null;
	wipoSector: string | null;
}

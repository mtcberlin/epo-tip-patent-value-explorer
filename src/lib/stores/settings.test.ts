import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock window and localStorage before importing the store
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		_clear() {
			store = {};
		}
	};
})();

// Simulate browser environment for SSR guard checks
Object.defineProperty(globalThis, 'window', { value: {}, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('settings store', () => {
	beforeEach(() => {
		localStorageMock._clear();
		vi.clearAllMocks();
	});

	it('starts with empty apiKey when localStorage is empty', async () => {
		vi.resetModules();
		const { settings } = await import('./settings.svelte');
		expect(settings.apiKey).toBe('');
		expect(settings.hasApiKey).toBe(false);
	});

	it('reads existing key from localStorage on creation', async () => {
		localStorageMock.getItem.mockReturnValueOnce('sk-ant-test123');

		vi.resetModules();
		const { settings } = await import('./settings.svelte');
		expect(settings.apiKey).toBe('sk-ant-test123');
		expect(settings.hasApiKey).toBe(true);
	});

	it('saveApiKey writes to localStorage and updates state', async () => {
		vi.resetModules();
		const { settings } = await import('./settings.svelte');

		settings.saveApiKey('sk-ant-newkey');
		expect(settings.apiKey).toBe('sk-ant-newkey');
		expect(settings.hasApiKey).toBe(true);
		expect(localStorageMock.setItem).toHaveBeenCalledWith('pve-anthropic-api-key', 'sk-ant-newkey');
	});

	it('clearApiKey removes from localStorage and resets state', async () => {
		vi.resetModules();
		const { settings } = await import('./settings.svelte');

		settings.saveApiKey('sk-ant-toremove');
		vi.clearAllMocks(); // Reset call tracking

		settings.clearApiKey();
		expect(settings.apiKey).toBe('');
		expect(settings.hasApiKey).toBe(false);
		expect(localStorageMock.removeItem).toHaveBeenCalledWith('pve-anthropic-api-key');
	});
});

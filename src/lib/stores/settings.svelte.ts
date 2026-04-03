const STORAGE_KEY = 'pve-anthropic-api-key';

function createSettingsStore() {
	let apiKey = $state(
		typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) ?? '') : ''
	);
	let dialogOpen = $state(false);

	return {
		get apiKey() {
			return apiKey;
		},
		get hasApiKey() {
			return apiKey.length > 0;
		},
		get dialogOpen() {
			return dialogOpen;
		},
		set dialogOpen(value: boolean) {
			dialogOpen = value;
		},
		saveApiKey(key: string) {
			apiKey = key;
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, key);
			}
		},
		clearApiKey() {
			apiKey = '';
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}
		},
		openDialog() {
			dialogOpen = true;
		}
	};
}

export const settings = createSettingsStore();

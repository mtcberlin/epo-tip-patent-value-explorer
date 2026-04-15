/**
 * Recently viewed patents, persisted to localStorage.
 *
 * One entry per publicationNumber - revisiting an existing entry moves it
 * to the top instead of duplicating. Bounded to MAX_ENTRIES (oldest evicted).
 */

const STORAGE_KEY = 'pve-history';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
	publicationNumber: string;
	auth: string;
	number: string;
	title: string;
	viewedAt: string;
}

interface AddInput {
	publicationNumber: string;
	auth: string;
	number: string;
	title: string;
}

function loadFromStorage(): HistoryEntry[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(e): e is HistoryEntry =>
				typeof e === 'object' &&
				e !== null &&
				typeof (e as HistoryEntry).publicationNumber === 'string' &&
				typeof (e as HistoryEntry).viewedAt === 'string'
		);
	} catch {
		return [];
	}
}

function saveToStorage(entries: HistoryEntry[]): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch {
		// quota exceeded, etc - ignore
	}
}

function createHistoryStore() {
	let entries = $state<HistoryEntry[]>(loadFromStorage());
	let sheetOpen = $state(false);

	return {
		get entries() {
			return entries;
		},
		get count() {
			return entries.length;
		},
		get sheetOpen() {
			return sheetOpen;
		},
		set sheetOpen(value: boolean) {
			sheetOpen = value;
		},
		openSheet() {
			sheetOpen = true;
		},
		add(input: AddInput): void {
			if (!input.publicationNumber) return;
			const next: HistoryEntry = {
				publicationNumber: input.publicationNumber,
				auth: input.auth,
				number: input.number,
				title: input.title,
				viewedAt: new Date().toISOString()
			};
			const deduped = entries.filter((e) => e.publicationNumber !== input.publicationNumber);
			entries = [next, ...deduped].slice(0, MAX_ENTRIES);
			saveToStorage(entries);
		},
		remove(publicationNumber: string): void {
			entries = entries.filter((e) => e.publicationNumber !== publicationNumber);
			saveToStorage(entries);
		},
		clear(): void {
			entries = [];
			saveToStorage(entries);
		}
	};
}

export const history = createHistoryStore();

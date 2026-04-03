import { describe, it, expect, beforeEach } from 'vitest';
import { getCached, setCached, cleanExpired, clearAll } from './patent-cache';

const futureDate = new Date(Date.now() + 86400000).toISOString();
const pastDate = new Date(Date.now() - 86400000).toISOString();

describe('patent-cache (in-memory Map)', () => {
	beforeEach(() => {
		clearAll();
	});

	describe('getCached', () => {
		it('returns null when no cache entry exists', async () => {
			const result = await getCached('NONEXISTENT');
			expect(result).toBeNull();
		});

		it('returns cached data when not expired', async () => {
			await setCached('EP1234567B1', {
				applnId: 100001,
				wipoFieldNumber: 6,
				dataJson: '{"test":"data"}',
				expiresAt: futureDate
			});

			const result = await getCached('EP1234567B1');
			expect(result).not.toBeNull();
			expect(result!.publicationNumber).toBe('EP1234567B1');
			expect(result!.applnId).toBe(100001);
			expect(result!.dataJson).toBe('{"test":"data"}');
		});

		it('returns null and removes entry when expired', async () => {
			await setCached('EP1234567B1', {
				applnId: 100001,
				wipoFieldNumber: 6,
				dataJson: '{"test":"data"}',
				expiresAt: pastDate
			});

			const result = await getCached('EP1234567B1');
			expect(result).toBeNull();
		});
	});

	describe('setCached', () => {
		it('stores cache data with correct fields', async () => {
			await setCached('EP1234567B1', {
				applnId: 100001,
				wipoFieldNumber: 6,
				dataJson: '{"test":"data"}',
				expiresAt: futureDate
			});

			const result = await getCached('EP1234567B1');
			expect(result).not.toBeNull();
			expect(result!.createdAt).toBeTruthy();
			expect(result!.expiresAt).toBe(futureDate);
		});

		it('overwrites existing entry (upsert)', async () => {
			await setCached('EP1234567B1', {
				applnId: 100001,
				wipoFieldNumber: 6,
				dataJson: '{"version":1}',
				expiresAt: futureDate
			});

			await setCached('EP1234567B1', {
				applnId: 100001,
				wipoFieldNumber: 6,
				dataJson: '{"version":2}',
				expiresAt: futureDate
			});

			const result = await getCached('EP1234567B1');
			expect(result!.dataJson).toBe('{"version":2}');
		});
	});

	describe('cleanExpired', () => {
		it('returns 0 when no expired entries', async () => {
			await setCached('EP1234567B1', {
				applnId: 100001,
				wipoFieldNumber: 6,
				dataJson: '{"test":"data"}',
				expiresAt: futureDate
			});

			const count = await cleanExpired();
			expect(count).toBe(0);
		});

		it('removes expired entries and returns count', async () => {
			await setCached('EXPIRED1', {
				applnId: 1,
				wipoFieldNumber: 1,
				dataJson: '{}',
				expiresAt: pastDate
			});

			await setCached('EXPIRED2', {
				applnId: 2,
				wipoFieldNumber: 2,
				dataJson: '{}',
				expiresAt: pastDate
			});

			await setCached('VALID', {
				applnId: 3,
				wipoFieldNumber: 3,
				dataJson: '{}',
				expiresAt: futureDate
			});

			const count = await cleanExpired();
			expect(count).toBe(2);

			const valid = await getCached('VALID');
			expect(valid).not.toBeNull();
		});
	});

	describe('clearAll', () => {
		it('clears all entries and returns count', async () => {
			await setCached('EP1', {
				applnId: 1,
				wipoFieldNumber: 1,
				dataJson: '{}',
				expiresAt: futureDate
			});
			await setCached('EP2', {
				applnId: 2,
				wipoFieldNumber: 2,
				dataJson: '{}',
				expiresAt: futureDate
			});

			const count = clearAll();
			expect(count).toBe(2);

			const result = await getCached('EP1');
			expect(result).toBeNull();
		});
	});
});

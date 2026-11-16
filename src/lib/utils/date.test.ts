import { describe, expect, it } from 'vitest';
import { isFutureIsoDate, isIsoDate } from '#lib/utils/date.js';

describe('isIsoDate', () => {
	it('accepts real calendar dates', () => {
		expect(isIsoDate('2026-11-15')).toBe(true);
		expect(isIsoDate('2000-02-29')).toBe(true);
	});

	it('rejects other formats and impossible dates', () => {
		expect(isIsoDate('15/11/2026')).toBe(false);
		expect(isIsoDate('2026-2-1')).toBe(false);
		expect(isIsoDate('2026-02-30')).toBe(false);
		expect(isIsoDate('2026-13-01')).toBe(false);
		expect(isIsoDate('')).toBe(false);
	});
});

describe('isFutureIsoDate', () => {
	const now = new Date('2026-11-15T23:30:00Z');

	it('allows the same UTC day and the next one for timezone tolerance', () => {
		expect(isFutureIsoDate('2026-11-15', now)).toBe(false);
		expect(isFutureIsoDate('2026-11-16', now)).toBe(false);
	});

	it('flags dates two days ahead and later, and ignores invalid input', () => {
		expect(isFutureIsoDate('2026-11-17', now)).toBe(true);
		expect(isFutureIsoDate('not-a-date', now)).toBe(false);
	});
});

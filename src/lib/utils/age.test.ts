import { describe, expect, it } from 'vitest';
import { calculateAge, formatAge } from '#lib/utils/age.js';

const now = new Date('2026-11-15T12:00:00Z');

describe('calculateAge', () => {
	it('returns null without a birth date', () => {
		expect(calculateAge(null, now)).toBeNull();
	});

	it('returns null for malformed or impossible dates', () => {
		expect(calculateAge('15/11/1990', now)).toBeNull();
		expect(calculateAge('1990-02-30', now)).toBeNull();
		expect(calculateAge('1990-13-01', now)).toBeNull();
	});

	it('returns null for a future birth date', () => {
		expect(calculateAge('2027-01-01', now)).toBeNull();
	});

	it('counts the birthday once it has passed', () => {
		expect(calculateAge('1990-11-15', now)).toBe(36);
		expect(calculateAge('1990-11-16', now)).toBe(35);
	});

	it('handles a leap-day birthday in a non-leap year', () => {
		expect(calculateAge('2000-02-29', new Date('2026-02-28T12:00:00Z'))).toBe(25);
		expect(calculateAge('2000-02-29', new Date('2026-03-01T12:00:00Z'))).toBe(26);
	});
});

describe('formatAge', () => {
	it('formats a valid age and hides invalid input', () => {
		expect(formatAge('1990-11-15', now)).toBe('36 years');
		expect(formatAge(null, now)).toBeNull();
	});
});

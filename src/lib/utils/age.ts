import { isIsoDate } from '#lib/utils/date.js';

/**
 * Age is derived from the stored birth date instead of being persisted, so a
 * crew profile never shows a stale number after a birthday.
 */
export function calculateAge(birthDate: string | null, now: Date = new Date()): number | null {
	if (!birthDate || !isIsoDate(birthDate)) return null;

	const [year, month, day] = birthDate.split('-').map(Number);
	const birth = new Date(Date.UTC(year, month - 1, day));
	const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	if (birth > today) return null;

	let age = today.getUTCFullYear() - year;
	const hadBirthday =
		today.getUTCMonth() > month - 1 ||
		(today.getUTCMonth() === month - 1 && today.getUTCDate() >= day);
	if (!hadBirthday) age -= 1;
	return age;
}

/** `null` when the date is missing or invalid, so callers can render a dash. */
export function formatAge(birthDate: string | null, now: Date = new Date()): string | null {
	const age = calculateAge(birthDate, now);
	return age === null ? null : `${age} years`;
}

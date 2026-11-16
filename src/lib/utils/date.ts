export function formatDate(iso: string): string {
	const date = new Date(`${iso}T00:00:00`);

	if (Number.isNaN(date.getTime())) return iso;

	return new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(date);
}

/**
 * Accepts `YYYY-MM-DD` only and rejects impossible dates such as 2026-02-30,
 * which `new Date` would otherwise roll over silently.
 */
export function isIsoDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

/**
 * Rejects dates beyond tomorrow in UTC. The one-day tolerance absorbs timezone
 * offsets (UTC-12 to UTC+14) so a locally "today" default is never rejected.
 */
export function isFutureIsoDate(value: string, now: Date = new Date()): boolean {
	if (!isIsoDate(value)) return false;
	const tomorrow =
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 24 * 60 * 60 * 1000;
	return Date.parse(`${value}T00:00:00Z`) > tomorrow;
}

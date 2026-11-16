import { browser } from '$app/env';
import { DEMO_STATE_COOKIE } from './mode.js';

/** A reading added during the demo, replayed on top of the snapshot. */
export interface DemoReadingDelta {
	kind: 'reading';
	astronaut_id: number;
	metric_code: string;
	value: number;
	measured_at: string;
}

export type DemoDelta = DemoReadingDelta;

/** Keeps the cookie well below the 4 KB browser limit. */
const MAX_DELTAS = 20;
const MAX_COOKIE_LENGTH = 3600;

function isDelta(value: unknown): value is DemoDelta {
	if (!value || typeof value !== 'object') return false;
	const delta = value as Record<string, unknown>;

	return (
		delta.kind === 'reading' &&
		typeof delta.astronaut_id === 'number' &&
		typeof delta.metric_code === 'string' &&
		typeof delta.value === 'number' &&
		Number.isFinite(delta.value) &&
		typeof delta.measured_at === 'string'
	);
}

/** Parses the cookie value; malformed entries are dropped instead of throwing. */
export function parseDemoDeltas(raw: string | null | undefined): DemoDelta[] {
	if (!raw) return [];

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(isDelta).slice(-MAX_DELTAS);
	} catch {
		return [];
	}
}

function serialize(deltas: readonly DemoDelta[]): string {
	let kept = deltas.slice(-MAX_DELTAS);
	let encoded = JSON.stringify(kept);

	while (encoded.length > MAX_COOKIE_LENGTH && kept.length > 0) {
		kept = kept.slice(1);
		encoded = JSON.stringify(kept);
	}

	return encoded;
}

function readCookie(name: string): string | null {
	if (!browser) return null;

	const entry = document.cookie
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`));

	return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string, maxAge: number): void {
	if (!browser) return;

	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** Deltas recorded in this browser session. */
export function readClientDeltas(): DemoDelta[] {
	return parseDemoDeltas(readCookie(DEMO_STATE_COOKIE));
}

export function appendDemoDelta(delta: DemoDelta): void {
	const next = [...readClientDeltas(), delta];
	writeCookie(DEMO_STATE_COOKIE, serialize(next), 60 * 60 * 8);
}

/** Restores the snapshot without leaving demo mode. */
export function resetDemoDeltas(): void {
	writeCookie(DEMO_STATE_COOKIE, '', 0);
}

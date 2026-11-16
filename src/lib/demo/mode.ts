import { browser } from '$app/env';
import { PUBLIC_DEMO_MODE } from '$app/env/public';

/** Marks the browser session so `?demo=1` survives navigation. */
export const DEMO_COOKIE = 'astrolife-demo';

/** Persists the demo's in-memory mutations across reloads and `invalidateAll`. */
export const DEMO_STATE_COOKIE = 'astrolife-demo-state';

function hasDemoCookie(): boolean {
	if (!browser) return false;

	return document.cookie.split(';').some((entry) => entry.trim().startsWith(`${DEMO_COOKIE}=`));
}

/**
 * The demo is either forced at build time (static demo deployments) or opted
 * into per session with `?demo=1`, which `hooks.server.ts` turns into a cookie so
 * the client and the server agree on every later request.
 */
export function isDemoMode(): boolean {
	return PUBLIC_DEMO_MODE || hasDemoCookie();
}

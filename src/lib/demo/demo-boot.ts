import { browser } from '$app/env';
import { DEMO_COOKIE, isDemoMode } from './mode.js';

/**
 * Boots the demo once the root layout is mounted: restores an interrupted tour
 * or starts a fresh one when the visitor arrived through `?demo=1`.
 *
 * The tour module (and driver.js) is imported lazily so the production bundle
 * never ships it unless the demo is actually active.
 */
export async function bootDemo(): Promise<void> {
	if (!browser || !isDemoMode()) return;

	const url = new URL(window.location.href);
	const requested = url.searchParams.get('demo') === '1';

	if (requested) {
		// The query only bootstraps the session cookie; drop it so a reload does
		// not restart the tour.
		url.searchParams.delete('demo');
		window.history.replaceState({}, '', url.pathname + url.search + url.hash);
	}

	const tour = await import('./tour.js');
	if (tour.resumeTour()) return;

	if (!requested) return;

	// The first paint is not enough: charts and posters size themselves after
	// layout, so give the page a frame to settle before highlighting it.
	requestAnimationFrame(() =>
		window.setTimeout(() => tour.startTourForPath(window.location.pathname), 350)
	);
}

/** Leaves demo mode and reloads so the server loads use the real database again. */
export function exitDemo(): void {
	document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`;
	window.location.assign('/');
}

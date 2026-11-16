import type { Handle } from '@sveltejs/kit/hooks';
import { PUBLIC_DEMO_MODE } from '$app/env/public';
import { DEMO_COOKIE } from '#lib/demo/mode.js';

/**
 * The demo is a read-only session: the client replays its own mutations on top
 * of the snapshot, and this hook makes sure a stray form submit can never reach
 * the real SQLite database.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const requested = event.url.searchParams.get('demo') === '1';
	const remembered = event.cookies.get(DEMO_COOKIE) === '1';

	event.locals.demo = PUBLIC_DEMO_MODE || requested || remembered;

	if (requested && !remembered) {
		event.cookies.set(DEMO_COOKIE, '1', {
			path: '/',
			maxAge: 60 * 60 * 8,
			httpOnly: false,
			sameSite: 'lax'
		});
	}

	if (event.locals.demo && event.request.method !== 'GET' && event.request.method !== 'HEAD') {
		return new Response('The demo is read-only. Reset it to start over.', { status: 403 });
	}

	return resolve(event);
};

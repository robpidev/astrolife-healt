import { error } from '@sveltejs/kit';
import { parseDemoDeltas } from '#lib/demo/demo-store.js';
import { DEMO_STATE_COOKIE } from '#lib/demo/mode.js';
import { demoCardiovascular } from '#lib/demo/mock-data.js';
import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import { getAreaTones } from '#lib/server/health-status.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies, locals }) => {
	const { astronaut } = await parent();

	if (locals.demo) {
		const demo = demoCardiovascular(astronaut.id, parseDemoDeltas(cookies.get(DEMO_STATE_COOKIE)));
		if (!demo) error(404, 'Astronaut not found');
		return demo;
	}

	return {
		snapshots: getAreaSnapshots(astronaut.id, 'cardiovascular'),
		tones: getAreaTones(astronaut.id, 'cardiovascular')
	};
};

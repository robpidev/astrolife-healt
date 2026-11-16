import { error } from '@sveltejs/kit';
import { parseDemoDeltas } from '#lib/demo/demo-store.js';
import { DEMO_STATE_COOKIE } from '#lib/demo/mode.js';
import { demoHeartRate } from '#lib/demo/mock-data.js';
import { getMetricReadings } from '#lib/server/health-metrics.js';
import {
	createRegisterAction,
	getCardiovascularEntryConfig
} from '#lib/server/cardiovascular-action.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies, locals }) => {
	const { astronaut } = await parent();

	if (locals.demo) {
		const demo = demoHeartRate(astronaut.id, parseDemoDeltas(cookies.get(DEMO_STATE_COOKIE)));
		if (!demo) error(404, 'Astronaut not found');
		return demo;
	}

	return {
		readings: getMetricReadings(astronaut.id, 'cardiovascular', 'heart-rate', 30),
		entry: getCardiovascularEntryConfig('heart-rate')
	};
};

export const actions: Actions = {
	register: createRegisterAction('heart_rate')
};

import { getMetricReadings } from '#lib/server/health-metrics.js';
import {
	createRegisterAction,
	getCardiovascularEntryConfig
} from '#lib/server/cardiovascular-action.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	return {
		readings: getMetricReadings(astronaut.id, 'cardiovascular', 'heart-rate', 30),
		entry: getCardiovascularEntryConfig('heart-rate')
	};
};

export const actions: Actions = {
	register: createRegisterAction('heart_rate')
};

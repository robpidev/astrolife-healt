import { getMetricReadings } from '#lib/server/health-metrics.js';
import {
	createRegisterAction,
	getCardiovascularEntryConfig
} from '#lib/server/cardiovascular-action.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	return {
		readings: getMetricReadings(astronaut.id, 'cardiovascular', 'oxygen', 30),
		entry: getCardiovascularEntryConfig('oxygen')
	};
};

export const actions: Actions = {
	register: createRegisterAction('spo2')
};

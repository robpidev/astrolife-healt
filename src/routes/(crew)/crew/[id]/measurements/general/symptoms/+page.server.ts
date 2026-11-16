import { getMetricPageData, createMetricRegisterAction } from '#lib/server/metric-route.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	return getMetricPageData(astronaut.id, 'symptoms');
};

export const actions: Actions = {
	register: createMetricRegisterAction('symptoms')
};

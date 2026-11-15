import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import { createRegisterAction } from '#lib/server/cardiovascular-action.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	const snapshot =
		getAreaSnapshots(astronaut.id, 'cardiovascular').find((item) => item.metric_id === 'oxygen') ??
		null;

	return { snapshot };
};

export const actions: Actions = {
	register: createRegisterAction('spo2')
};

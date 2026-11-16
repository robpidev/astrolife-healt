import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import { getAreaTones } from '#lib/server/health-status.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	return {
		snapshots: getAreaSnapshots(astronaut.id, 'cardiovascular'),
		tones: getAreaTones(astronaut.id, 'cardiovascular')
	};
};

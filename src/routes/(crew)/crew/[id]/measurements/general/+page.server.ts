import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	return { snapshots: getAreaSnapshots(astronaut.id, 'general') };
};

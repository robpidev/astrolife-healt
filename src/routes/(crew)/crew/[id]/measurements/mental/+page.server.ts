import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import { getSurveySummary } from '#lib/server/mental-survey.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	return {
		snapshots: getAreaSnapshots(astronaut.id, 'mental'),
		summary: getSurveySummary(astronaut.id)
	};
};

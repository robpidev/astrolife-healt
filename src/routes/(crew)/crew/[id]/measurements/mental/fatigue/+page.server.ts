import { getAreaSnapshots, getMetricReadings } from '#lib/server/health-metrics.js';
import { getTopicProgress } from '#lib/server/mental-survey.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { astronaut } = await parent();
	const snapshot =
		getAreaSnapshots(astronaut.id, 'mental').find((item) => item.metric_id === 'fatigue') ?? null;

	return {
		snapshot,
		readings: getMetricReadings(astronaut.id, 'mental', 'fatigue', 30),
		progress: getTopicProgress(astronaut.id, 'fatigue'),
		saved: url.searchParams.has('saved')
	};
};

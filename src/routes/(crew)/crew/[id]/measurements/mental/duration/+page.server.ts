import { getAreaSnapshots, getMetricReadings } from '#lib/server/health-metrics.js';
import { getTopicProgress } from '#lib/server/mental-survey.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { astronaut } = await parent();
	const snapshot =
		getAreaSnapshots(astronaut.id, 'mental').find((item) => item.metric_id === 'duration') ?? null;

	return {
		snapshot,
		readings: getMetricReadings(astronaut.id, 'mental', 'duration', 30),
		progress: getTopicProgress(astronaut.id, 'duration'),
		saved: url.searchParams.has('saved')
	};
};

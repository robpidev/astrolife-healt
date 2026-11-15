import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import { getTopicProgress } from '#lib/server/mental-survey.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { astronaut } = await parent();
	const snapshot =
		getAreaSnapshots(astronaut.id, 'mental').find((item) => item.metric_id === 'mood') ?? null;

	return {
		snapshot,
		progress: getTopicProgress(astronaut.id, 'mood'),
		saved: url.searchParams.has('saved')
	};
};

import { healthAreas } from '#lib/data/healthAreas.js';
import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	const areas = healthAreas.map((area) => {
		const snapshots = getAreaSnapshots(astronaut.id, area.id);
		const recorded = snapshots.filter((snapshot) => snapshot.latest !== null);
		const dates = recorded
			.map((snapshot) => snapshot.recorded_at)
			.filter((date): date is string => date !== null);

		return {
			id: area.id,
			label: area.label,
			total: area.metrics.length,
			recorded: recorded.length,
			lastUpdate: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null
		};
	});

	return { areas };
};

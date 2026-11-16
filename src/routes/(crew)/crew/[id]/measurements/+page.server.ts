import { error } from '@sveltejs/kit';
import { demoMeasurements } from '#lib/demo/mock-data.js';
import { healthAreas } from '#lib/data/healthAreas.js';
import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { astronaut } = await parent();

	if (locals.demo) {
		const demo = demoMeasurements(astronaut.id);
		if (!demo) error(404, 'Astronaut not found');
		return demo;
	}

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

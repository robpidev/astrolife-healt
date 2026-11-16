import { getMetricReadings } from '#lib/server/health-metrics.js';
import { getRadiationSummary } from '#lib/server/radiation.js';
import { createMetricRegisterAction } from '#lib/server/metric-route.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	const summary = getRadiationSummary(astronaut.id);

	return {
		readings: getMetricReadings(astronaut.id, 'radiation', 'career', 30),
		assessment: summary?.assessments.find((item) => item.guideline.id === 'career') ?? null,
		summary
	};
};

export const actions: Actions = {
	// Interval doses are logged through the existing `dose` metric; the career
	// total and the GCR rate are both derived from that same series.
	register: createMetricRegisterAction('dose')
};

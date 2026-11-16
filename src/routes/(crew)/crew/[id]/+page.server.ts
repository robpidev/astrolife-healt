import { error } from '@sveltejs/kit';
import { parseDemoDeltas } from '#lib/demo/demo-store.js';
import { DEMO_STATE_COOKIE } from '#lib/demo/mode.js';
import { demoSummary } from '#lib/demo/mock-data.js';
import { getAstronautAlerts } from '#lib/server/alerts.js';
import { getIndicatorTrends } from '#lib/server/health-metrics.js';
import { getAstronautHealthStatus, getKeyVitals } from '#lib/server/health-status.js';
import type { PageServerLoad } from './$types';

const VITAL_INDICATORS = ['heart-rate', 'blood-pressure', 'spo2', 'temperature'] as const;

export const load: PageServerLoad = async ({ parent, cookies, locals }) => {
	const { astronaut } = await parent();

	if (locals.demo) {
		const demo = demoSummary(astronaut.id, parseDemoDeltas(cookies.get(DEMO_STATE_COOKIE)));
		if (!demo) error(404, 'Astronaut not found');
		return demo;
	}

	const status = getAstronautHealthStatus(astronaut.id);

	return {
		astronaut,
		status,
		vitals: getKeyVitals(status),
		trends: getIndicatorTrends(astronaut.id, VITAL_INDICATORS),
		alerts: getAstronautAlerts(astronaut.id)
	};
};

import { getAstronautAlerts } from '#lib/server/alerts.js';
import { getIndicatorTrends } from '#lib/server/health-metrics.js';
import { getAstronautHealthStatus, getKeyVitals } from '#lib/server/health-status.js';
import type { PageServerLoad } from './$types';

const VITAL_INDICATORS = ['heart-rate', 'blood-pressure', 'spo2', 'temperature'] as const;

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	const status = getAstronautHealthStatus(astronaut.id);

	return {
		astronaut,
		status,
		vitals: getKeyVitals(status),
		trends: getIndicatorTrends(astronaut.id, VITAL_INDICATORS),
		alerts: getAstronautAlerts(astronaut.id)
	};
};

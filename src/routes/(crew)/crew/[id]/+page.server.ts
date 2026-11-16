import { getAstronautAlerts } from '#lib/server/alerts.js';
import { getAstronautHealthStatus, getKeyVitals } from '#lib/server/health-status.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	const status = getAstronautHealthStatus(astronaut.id);

	return {
		astronaut,
		status,
		vitals: getKeyVitals(status),
		alerts: getAstronautAlerts(astronaut.id)
	};
};

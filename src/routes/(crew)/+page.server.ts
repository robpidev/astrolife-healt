import { getCrewDashboard } from '#lib/server/crew.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { crew: getCrewDashboard() };
};

import { error } from '@sveltejs/kit';
import { getRiskAssessment, getWorstRisk } from '#lib/server/risks.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const id = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');

	const factors = getRiskAssessment(id);
	return { factors, overall: getWorstRisk(factors) };
};

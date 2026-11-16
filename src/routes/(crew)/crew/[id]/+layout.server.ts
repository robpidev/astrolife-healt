import { error } from '@sveltejs/kit';
import { demoLayout } from '#lib/demo/mock-data.js';
import { getAstronaut } from '#lib/server/crew.js';
import { getAlertSummary } from '#lib/server/alerts.js';
import { getBodyMapVitals } from '#lib/server/body-map.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params, locals }) => {
	// `/crew/12abc` must 404 instead of being coerced by `Number()`.
	const id = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;

	if (locals.demo) {
		const demo = Number.isFinite(id) ? demoLayout(id) : null;
		if (!demo) error(404, 'Astronaut not found');
		return demo;
	}

	const astronaut = Number.isFinite(id) ? getAstronaut(id) : null;

	if (!astronaut) {
		error(404, 'Astronaut not found');
	}

	return {
		astronaut,
		alertSummary: getAlertSummary(astronaut.id),
		vitals: getBodyMapVitals(astronaut.id)
	};
};

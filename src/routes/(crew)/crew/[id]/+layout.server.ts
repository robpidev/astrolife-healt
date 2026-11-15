import { error } from '@sveltejs/kit';
import { getAstronaut } from '#lib/server/crew.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params }) => {
	// `/crew/12abc` must 404 instead of being coerced by `Number()`.
	const id = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
	const astronaut = Number.isFinite(id) ? getAstronaut(id) : null;

	if (!astronaut) {
		error(404, 'Astronauta no encontrado');
	}

	return { astronaut };
};

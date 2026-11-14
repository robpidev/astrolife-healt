import { fail } from '@sveltejs/kit';
import { parseCrewPhoto } from '#lib/server/crew-photo.js';
import { deleteAstronaut, getCrewDashboard, saveAstronaut, toggleTask } from '#lib/server/crew.js';
import { parseAstronautForm, parseCrewId } from '#lib/server/crew-validation.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ crew: getCrewDashboard() });

export const actions: Actions = {
	saveAstronaut: async ({ request }) => {
		const form = await request.formData();
		const result = parseAstronautForm(form);
		const id = form.get('id') ? parseCrewId(form.get('id')) : null;
		if (form.get('id') && id === null) return fail(400, { action: 'saveAstronaut', message: 'Identificador inválido.' });
		if (!result.data) return fail(400, { action: 'saveAstronaut', values: result.values, errors: result.errors, message: 'Revisa los campos del perfil.' });
		const photo = await parseCrewPhoto(form.get('photo'));
		if (photo.error) {
			return fail(400, {
				action: 'saveAstronaut', values: result.values,
				errors: { photo: photo.error }, message: photo.error
			});
		}
		const savedId = saveAstronaut(id, result.data, photo.photo_url);
		if (savedId === null) return fail(404, { action: 'saveAstronaut', message: 'El astronauta ya no existe.' });
		return { action: 'saveAstronaut', success: true, id: savedId, message: 'Perfil guardado.' };
	},
	deleteAstronaut: async ({ request }) => {
		const form = await request.formData();
		const id = parseCrewId(form.get('id'));
		if (id === null) return fail(400, { action: 'deleteAstronaut', message: 'Identificador inválido.' });
		try {
			if (!deleteAstronaut(id)) return fail(404, { action: 'deleteAstronaut', message: 'El astronauta ya no existe.' });
		} catch (error) {
			if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
				return fail(409, { action: 'deleteAstronaut', message: 'No se puede eliminar un astronauta con historial médico o misiones asociadas.' });
			}
			throw error;
		}
		return { action: 'deleteAstronaut', success: true, message: 'Tripulante eliminado.' };
	},
	toggleTask: async ({ request }) => {
		const form = await request.formData();
		const id = parseCrewId(form.get('id'));
		const taskId = parseCrewId(form.get('task_id'));
		if (id === null || taskId === null) return fail(400, { action: 'toggleTask', message: 'Identificador inválido.' });
		if (!toggleTask(id, taskId)) return fail(404, { action: 'toggleTask', message: 'La tarea ya no existe.' });
		return { action: 'toggleTask', success: true, message: 'Tarea actualizada.' };
	}
};

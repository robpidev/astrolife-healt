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
		if (form.get('id') && id === null)
			return fail(400, { action: 'saveAstronaut', message: 'Invalid identifier.' });
		if (!result.data)
			return fail(400, {
				action: 'saveAstronaut',
				values: result.values,
				errors: result.errors,
				message: 'Check the profile fields.'
			});
		const photo = await parseCrewPhoto(form.get('photo'));
		if (photo.error) {
			return fail(400, {
				action: 'saveAstronaut',
				values: result.values,
				errors: { photo: photo.error },
				message: photo.error
			});
		}
		const savedId = saveAstronaut(id, result.data, photo.photo_url);
		if (savedId === null)
			return fail(404, { action: 'saveAstronaut', message: 'The astronaut no longer exists.' });
		return { action: 'saveAstronaut', success: true, id: savedId, message: 'Profile saved.' };
	},
	deleteAstronaut: async ({ request }) => {
		const form = await request.formData();
		const id = parseCrewId(form.get('id'));
		if (id === null)
			return fail(400, { action: 'deleteAstronaut', message: 'Invalid identifier.' });
		try {
			if (!deleteAstronaut(id))
				return fail(404, { action: 'deleteAstronaut', message: 'The astronaut no longer exists.' });
		} catch (error) {
			if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
				return fail(409, {
					action: 'deleteAstronaut',
					message: 'Cannot delete an astronaut with medical history or linked missions.'
				});
			}
			throw error;
		}
		return { action: 'deleteAstronaut', success: true, message: 'Crew member deleted.' };
	},
	toggleTask: async ({ request }) => {
		const form = await request.formData();
		const id = parseCrewId(form.get('id'));
		const taskId = parseCrewId(form.get('task_id'));
		if (id === null || taskId === null)
			return fail(400, { action: 'toggleTask', message: 'Invalid identifier.' });
		if (!toggleTask(id, taskId))
			return fail(404, { action: 'toggleTask', message: 'The task no longer exists.' });
		return { action: 'toggleTask', success: true, message: 'Task updated.' };
	}
};

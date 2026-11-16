import { error, fail } from '@sveltejs/kit';
import type { MedicalProfileInput } from '#lib/interfaces/medical-profile.js';
import { getMedicalProfile, saveMedicalProfile } from '#lib/server/medical-profile.js';
import type { Actions, PageServerLoad } from './$types';

function profileId(params: { id: string }): number {
	const id = /^\d+$/.test(params.id) ? Number(params.id) : NaN;
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');
	return id;
}

export const load: PageServerLoad = ({ params }) => ({
	profile: getMedicalProfile(profileId(params))
});

const LIMITS: [keyof MedicalProfileInput, number][] = [
	['blood_type', 10],
	['allergies', 500],
	['medications', 500],
	['medical_history', 1000],
	['baseline_notes', 1000]
];

export const actions: Actions = {
	save: async ({ params, request }) => {
		const form = await request.formData();
		const field = (key: string) => String(form.get(key) ?? '').trim();

		const values: MedicalProfileInput = {
			blood_type: field('blood_type'),
			allergies: field('allergies'),
			medications: field('medications'),
			medical_history: field('medical_history'),
			baseline_notes: field('baseline_notes')
		};

		// Mirror the SQLite CHECK constraints so an overlong field returns a
		// field-level message instead of a database error.
		const errors: Partial<Record<keyof MedicalProfileInput, string>> = {};
		for (const [key, max] of LIMITS) {
			if (values[key].length > max) {
				const label = key.charAt(0).toUpperCase() + key.slice(1).replaceAll('_', ' ');
				errors[key] = `${label} must be ${max} characters or fewer.`;
			}
		}
		if (Object.keys(errors).length > 0) {
			return fail(400, { values, errors });
		}

		const saved = saveMedicalProfile(profileId(params), values);
		if (!saved) return fail(404, { message: 'Astronaut not found.' });

		return { success: true, message: 'Medical dossier saved.' };
	}
};

import { error, fail } from '@sveltejs/kit';
import { demoMedical } from '#lib/demo/mock-data.js';
import { allergySeverities } from '#lib/data/medical.js';
import type { AllergySeverity, MedicalMarkdownField } from '#lib/interfaces/medical-profile.js';
import {
	addMedicalEntry,
	addMedicalEvaluation,
	getMedicalProfile,
	removeMedicalEntry,
	removeMedicalEvaluation,
	saveBirthDate,
	saveBloodType,
	saveMedicalMarkdown
} from '#lib/server/medical-profile.js';
import { parseBirthDate } from '#lib/server/crew-validation.js';
import { parseMedicalEvaluationForm } from '#lib/server/medical-validation.js';
import type { Actions, PageServerLoad } from './$types';

function profileId(params: { id: string }): number {
	const id = /^\d+$/.test(params.id) ? Number(params.id) : NaN;
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');
	return id;
}

export const load: PageServerLoad = ({ params, locals }) => {
	if (locals.demo) {
		const demo = demoMedical(profileId(params));
		if (!demo) error(404, 'Astronaut not found');
		return demo;
	}

	return { profile: getMedicalProfile(profileId(params)) };
};

const MARKDOWN_FIELDS: readonly MedicalMarkdownField[] = ['medical_history', 'baseline_notes'];

export const actions: Actions = {
	saveBirthDate: async ({ params, request }) => {
		const form = await request.formData();
		const raw = String(form.get('birth_date') ?? '').trim();
		const birthDate = parseBirthDate(raw);

		if (raw && birthDate === null) {
			return fail(400, { error: 'Enter a valid date of birth that is not in the future.' });
		}

		if (!saveBirthDate(profileId(params), birthDate)) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		return { success: true, message: 'Date of birth saved.' };
	},

	saveBloodType: async ({ params, request }) => {
		const form = await request.formData();
		const bloodType = String(form.get('blood_type') ?? '').trim();

		if (bloodType.length > 10) {
			return fail(400, { error: 'Blood type must be 10 characters or fewer.' });
		}

		if (!saveBloodType(profileId(params), bloodType || null)) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		return { success: true, message: 'Blood type saved.' };
	},

	addEntry: async ({ params, request }) => {
		const form = await request.formData();
		const kind = String(form.get('kind') ?? '');
		if (kind !== 'allergy' && kind !== 'medication') {
			return fail(400, { error: 'Choose a valid entry type.' });
		}

		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Enter a name.' });
		if (name.length > 120) {
			return fail(400, { error: 'Name must be 120 characters or fewer.' });
		}

		const note = String(form.get('note') ?? '').trim();
		if (note.length > 300) {
			return fail(400, { error: 'Note must be 300 characters or fewer.' });
		}

		let severity: AllergySeverity | null = null;
		let dose: string | null = null;

		if (kind === 'allergy') {
			const rawSeverity = String(form.get('severity') ?? 'unknown');
			const option = allergySeverities.find((item) => item.value === rawSeverity);
			if (!option) return fail(400, { error: 'Choose a valid severity.' });
			severity = option.value;
		} else {
			const rawDose = String(form.get('dose') ?? '').trim();
			if (rawDose.length > 80) {
				return fail(400, { error: 'Dose must be 80 characters or fewer.' });
			}
			dose = rawDose || null;
		}

		if (
			!addMedicalEntry(profileId(params), {
				kind,
				name,
				severity,
				dose,
				note: note || null
			})
		) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		return { success: true, message: 'Entry added.' };
	},

	removeEntry: async ({ params, request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing entry.' });

		if (!removeMedicalEntry(profileId(params), id)) {
			return fail(404, { error: 'Entry not found.' });
		}

		return { success: true, message: 'Entry removed.' };
	},

	addEvaluation: async ({ params, request }) => {
		const result = parseMedicalEvaluationForm(await request.formData());
		if (!result.data) {
			return fail(400, {
				error: Object.values(result.errors)[0] ?? 'Check the evaluation fields.'
			});
		}

		if (!addMedicalEvaluation(profileId(params), result.data)) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		return { success: true, message: 'Evaluation added.' };
	},

	removeEvaluation: async ({ params, request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing evaluation.' });

		if (!removeMedicalEvaluation(profileId(params), id)) {
			return fail(404, { error: 'Evaluation not found.' });
		}

		return { success: true, message: 'Evaluation removed.' };
	},

	saveMarkdown: async ({ params, request }) => {
		const form = await request.formData();
		const field = String(form.get('field') ?? '');
		if (!MARKDOWN_FIELDS.includes(field as MedicalMarkdownField)) {
			return fail(400, { error: 'Choose a valid field.' });
		}

		const value = String(form.get('value') ?? '');
		if (value.length > 1000) {
			return fail(400, { error: 'This field must be 1000 characters or fewer.' });
		}

		if (!saveMedicalMarkdown(profileId(params), field as MedicalMarkdownField, value)) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		return { success: true, message: 'Saved.' };
	}
};

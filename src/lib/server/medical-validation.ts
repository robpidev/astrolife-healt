import { evaluationKinds } from '#lib/data/medical.js';
import type {
	MedicalEvaluationInput,
	MedicalEvaluationKind
} from '#lib/interfaces/medical-profile.js';
import { isFutureIsoDate, isIsoDate } from '#lib/utils/date.js';

const VALID_KINDS = new Set(evaluationKinds.map((option) => option.value));

export function parseMedicalEvaluationForm(form: FormData): {
	values: Record<string, string>;
	errors: Record<string, string>;
	data: MedicalEvaluationInput | null;
} {
	const values = Object.fromEntries(
		['kind', 'evaluated_at', 'summary', 'notes'].map((field) => [
			field,
			String(form.get(field) ?? '').trim()
		])
	);
	const errors: Record<string, string> = {};

	if (!VALID_KINDS.has(values.kind as MedicalEvaluationKind)) {
		errors.kind = 'Choose a valid evaluation type.';
	}
	if (!isIsoDate(values.evaluated_at) || isFutureIsoDate(values.evaluated_at)) {
		errors.evaluated_at = 'Enter a valid evaluation date that is not in the future.';
	}
	if (!values.summary) {
		errors.summary = 'Enter a summary.';
	} else if (values.summary.length > 200) {
		errors.summary = 'Summary must be 200 characters or fewer.';
	}
	if (values.notes.length > 500) {
		errors.notes = 'Notes must be 500 characters or fewer.';
	}

	return {
		values,
		errors,
		data: Object.keys(errors).length
			? null
			: {
					kind: values.kind as MedicalEvaluationKind,
					evaluated_at: values.evaluated_at,
					summary: values.summary,
					notes: values.notes || null
				}
	};
}

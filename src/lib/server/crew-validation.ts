import { CREW_ROLES, type AstronautSex, type CrewTone } from '#lib/interfaces/astronaut.js';
import type { AstronautInput } from '#lib/server/crew.js';
import { isFutureIsoDate, isIsoDate } from '#lib/utils/date.js';

export function parseCrewId(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
	const number = Number(value);
	return Number.isSafeInteger(number) ? number : null;
}

export function parseBirthDate(value: string): string | null {
	if (!value) return null;
	if (!isIsoDate(value) || isFutureIsoDate(value)) return null;
	return value;
}

export function parseAstronautForm(form: FormData): {
	values: Record<string, string>;
	errors: Record<string, string>;
	data: AstronautInput | null;
} {
	const values = Object.fromEntries(
		['first_name', 'last_name', 'nationality', 'sex', 'role', 'tone', 'birth_date'].map((field) => [
			field,
			String(form.get(field) ?? '').trim()
		])
	);
	const errors: Record<string, string> = {};
	for (const field of ['first_name', 'last_name', 'nationality']) {
		if (!values[field] || values[field].length > 80)
			errors[field] = 'Enter between 1 and 80 characters.';
	}
	if (!['femenino', 'masculino', 'intersexual', 'no_especificado'].includes(values.sex))
		errors.sex = 'Select a valid sex.';
	if (!(CREW_ROLES as readonly string[]).includes(values.role))
		errors.role = 'Select a valid role.';
	if (!['indigo', 'cyan', 'violet', 'amber', 'emerald'].includes(values.tone))
		errors.tone = 'Select a valid tone.';

	const birthDate = parseBirthDate(values.birth_date);
	if (values.birth_date && birthDate === null)
		errors.birth_date = 'Enter a valid date of birth that is not in the future.';

	return {
		values,
		errors,
		data: Object.keys(errors).length
			? null
			: {
					first_name: values.first_name,
					last_name: values.last_name,
					nationality: values.nationality,
					sex: values.sex as AstronautSex,
					role: values.role,
					tone: values.tone as CrewTone,
					birth_date: birthDate
				}
	};
}

import { CREW_ROLES, type AstronautSex, type CrewTone } from '#lib/interfaces/astronaut.js';
import type { AstronautInput } from '#lib/server/crew.js';

export function parseCrewId(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
	const number = Number(value);
	return Number.isSafeInteger(number) ? number : null;
}

export function parseAstronautForm(form: FormData): {
	values: Record<string, string>;
	errors: Record<string, string>;
	data: AstronautInput | null;
} {
	const values = Object.fromEntries(['first_name', 'last_name', 'nationality', 'sex', 'role', 'tone'].map((field) => [field, String(form.get(field) ?? '').trim()]));
	const errors: Record<string, string> = {};
	for (const field of ['first_name', 'last_name', 'nationality']) {
		if (!values[field] || values[field].length > 80) errors[field] = 'Ingresa entre 1 y 80 caracteres.';
	}
	if (!['femenino', 'masculino', 'intersexual', 'no_especificado'].includes(values.sex)) errors.sex = 'Selecciona un sexo válido.';
	if (!(CREW_ROLES as readonly string[]).includes(values.role)) errors.role = 'Selecciona un rol válido.';
	if (!['indigo', 'cyan', 'violet', 'amber', 'emerald'].includes(values.tone)) errors.tone = 'Selecciona un tono válido.';
	return {
		values, errors,
		data: Object.keys(errors).length ? null : {
			first_name: values.first_name, last_name: values.last_name, nationality: values.nationality,
			sex: values.sex as AstronautSex, role: values.role, tone: values.tone as CrewTone
		}
	};
}

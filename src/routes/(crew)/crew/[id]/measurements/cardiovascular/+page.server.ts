import { error, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
	parseCardiovascularForm,
	heartRateWarning,
	bloodPressureWarning
} from '#lib/server/cardiovascular-validation.js';
import { registerCardiovascularReadings } from '#lib/server/cardiovascular.js';

export const actions: Actions = {
	register: async ({ params, request }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) error(404, 'Astronauta no encontrado');
		const result = parseCardiovascularForm(await request.formData());
		if (!result.data) return fail(400, { errors: result.errors, values: result.values });
		if (!registerCardiovascularReadings(profileId, result.data))
			error(404, 'Astronauta no encontrado');
		return {
			success: true,
			warning:
				result.data.metric_code === 'heart_rate'
					? heartRateWarning(result.data.heart_rate)
					: result.data.metric_code === 'blood_pressure'
						? bloodPressureWarning(result.data.systolic, result.data.diastolic)
						: null
		};
	}
};

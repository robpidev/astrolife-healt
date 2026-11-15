import { error, fail } from '@sveltejs/kit';
import {
	parseCardiovascularForm,
	heartRateWarning,
	bloodPressureWarning,
	type CardiovascularInput,
	type CardiovascularMetricCode
} from '#lib/server/cardiovascular-validation.js';
import { registerCardiovascularReadings } from '#lib/server/cardiovascular.js';

function warningFor(input: CardiovascularInput): string | null {
	switch (input.metric_code) {
		case 'heart_rate':
			return heartRateWarning(input.heart_rate);
		case 'blood_pressure':
			return bloodPressureWarning(input.systolic, input.diastolic);
		default:
			return null;
	}
}

/**
 * Each detail route registers only its own metric, so a hand-crafted POST to
 * `/oxygen` can never write a blood-pressure reading. The area used to host a
 * single action for all three; moving it here keeps the mental-like pages
 * self-contained.
 */
export function createRegisterAction(expectedMetric: CardiovascularMetricCode) {
	return async ({ params, request }: { params: { id: string }; request: Request }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) error(404, 'Astronaut not found');

		const result = parseCardiovascularForm(await request.formData());

		if (!result.data) {
			return fail(400, { values: result.values, errors: result.errors });
		}

		if (result.data.metric_code !== expectedMetric) {
			return fail(400, {
				values: result.values,
				errors: { metric_code: 'Choose the measurement that matches this page.' }
			});
		}

		if (!registerCardiovascularReadings(profileId, result.data)) {
			error(404, 'Astronaut not found');
		}

		return { success: true, warning: warningFor(result.data) };
	};
}

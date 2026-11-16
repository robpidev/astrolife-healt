import { error, fail } from '@sveltejs/kit';
import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
import {
	parseCardiovascularForm,
	heartRateWarning,
	bloodPressureWarning,
	type CardiovascularInput,
	type CardiovascularMetricCode
} from '#lib/server/cardiovascular-validation.js';
import { registerCardiovascularReadings } from '#lib/server/cardiovascular.js';

/**
 * Entry dialog metadata for a cardiovascular detail page. The hidden
 * `metric_code` keeps the shared dialog compatible with the existing action,
 * together with the per-page warning logic.
 */
export function getCardiovascularEntryConfig(
	metricId: 'heart-rate' | 'blood-pressure' | 'oxygen'
): MetricEntryConfig {
	if (metricId === 'blood-pressure') {
		return {
			title: 'Blood pressure',
			fields: [
				{
					name: 'systolic',
					label: 'Systolic',
					unit: 'mmHg',
					min: 40,
					max: 300,
					step: '1',
					integer: true
				},
				{
					name: 'diastolic',
					label: 'Diastolic',
					unit: 'mmHg',
					min: 20,
					max: 200,
					step: '1',
					integer: true
				}
			],
			hidden: { metric_code: 'blood_pressure' }
		};
	}

	if (metricId === 'oxygen') {
		return {
			title: 'Oxygen',
			fields: [
				{
					name: 'spo2',
					label: 'Oxygen saturation',
					unit: '%',
					min: 0,
					max: 100,
					step: '0.1',
					integer: false
				}
			],
			hidden: { metric_code: 'spo2' }
		};
	}

	return {
		title: 'Heart rate',
		fields: [
			{
				name: 'heart_rate',
				label: 'Heart rate',
				unit: 'bpm',
				min: 20,
				max: 250,
				step: '1',
				integer: true
			}
		],
		hidden: { metric_code: 'heart_rate' }
	};
}

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

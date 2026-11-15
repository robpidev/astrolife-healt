import { fail } from '@sveltejs/kit';
import type { MeasurementActionData } from '#lib/interfaces/measurement.js';
import {
	createMeasurement,
	deleteMeasurement,
	listMeasurements,
	updateMeasurement
} from '#lib/server/measurements.js';
import { localToday, parseMeasurementForm } from '#lib/server/validation.js';
import { bmiCategory, calculateBmi } from '#lib/utils/bmi.js';
import type { Actions, PageServerLoad } from './$types';

function readId(form: FormData): number | null {
	const raw = String(form.get('id') ?? '').trim();
	if (!/^\d+$/.test(raw)) return null;

	const id = Number(raw);
	return id > 0 ? id : null;
}

export const load: PageServerLoad = () => {
	const measurements = listMeasurements().map((measurement) => {
		const bmi = calculateBmi(measurement.mass_kg, measurement.height_cm);
		const category = bmiCategory(bmi);

		return {
			...measurement,
			bmi,
			bmi_label: category.label,
			bmi_tone: category.tone
		};
	});

	const [latest = null, previous = null] = measurements;

	return {
		measurements,
		today: localToday(),
		summary: {
			latest,
			previous,
			mass_delta:
				latest && previous ? Math.round((latest.mass_kg - previous.mass_kg) * 10) / 10 : null
		}
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const result = parseMeasurementForm(await request.formData());

		if (!result.data) {
			return fail(400, {
				action: 'create',
				values: result.values,
				errors: result.errors
			} satisfies MeasurementActionData);
		}

		createMeasurement(result.data);

		return {
			action: 'create',
			success: true,
			message: 'Measurement saved'
		} satisfies MeasurementActionData;
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = readId(form);
		const result = parseMeasurementForm(form);

		if (id === null) {
			return fail(400, {
				action: 'update',
				values: result.values,
				error: 'Measurement not found'
			} satisfies MeasurementActionData);
		}

		if (!result.data) {
			return fail(400, {
				action: 'update',
				id,
				values: result.values,
				errors: result.errors
			} satisfies MeasurementActionData);
		}

		if (!updateMeasurement(id, result.data)) {
			return fail(404, {
				action: 'update',
				id,
				values: result.values,
				error: 'Measurement not found'
			} satisfies MeasurementActionData);
		}

		return {
			action: 'update',
			id,
			success: true,
			message: 'Measurement updated'
		} satisfies MeasurementActionData;
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = readId(form);

		if (id === null) {
			return fail(400, {
				action: 'delete',
				error: 'Measurement not found'
			} satisfies MeasurementActionData);
		}

		if (!deleteMeasurement(id)) {
			return fail(404, {
				action: 'delete',
				error: 'Measurement not found'
			} satisfies MeasurementActionData);
		}

		return {
			action: 'delete',
			success: true,
			message: 'Measurement deleted'
		} satisfies MeasurementActionData;
	}
};

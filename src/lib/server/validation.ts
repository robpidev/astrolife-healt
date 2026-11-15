import type {
	MeasurementErrors,
	MeasurementFormValues,
	MeasurementInput
} from '#lib/interfaces/measurement.js';

const MAX_NOTES_LENGTH = 500;

type MeasurementField = keyof MeasurementFormValues;

function read(form: FormData, key: MeasurementField): string {
	return String(form.get(key) ?? '').trim();
}

function parseDecimal(value: string): number | null {
	const normalized = value.replace(',', '.');
	if (normalized === '') return null;

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string): number | null {
	if (!/^\d+$/.test(value)) return null;

	return Number(value);
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

export function localToday(): string {
	const now = new Date();
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isValidIsoDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;

	const [, year, month, day] = match;
	const date = new Date(Number(year), Number(month) - 1, Number(day));

	return (
		date.getFullYear() === Number(year) &&
		date.getMonth() === Number(month) - 1 &&
		date.getDate() === Number(day)
	);
}

function roundOne(value: number): number {
	return Math.round(value * 10) / 10;
}

export function parseMeasurementForm(form: FormData): {
	values: MeasurementFormValues;
	errors: MeasurementErrors;
	data: MeasurementInput | null;
} {
	const values: MeasurementFormValues = {
		measured_at: read(form, 'measured_at'),
		mass_kg: read(form, 'mass_kg'),
		height_cm: read(form, 'height_cm'),
		systolic: read(form, 'systolic'),
		diastolic: read(form, 'diastolic'),
		pulse: read(form, 'pulse'),
		notes: read(form, 'notes')
	};

	const errors: MeasurementErrors = {};

	if (!values.measured_at) {
		errors.measured_at = 'Date is required';
	} else if (!isValidIsoDate(values.measured_at)) {
		errors.measured_at = 'Date is not valid';
	} else if (values.measured_at > localToday()) {
		errors.measured_at = 'Date cannot be in the future';
	}

	const mass = parseDecimal(values.mass_kg);
	if (mass === null) {
		errors.mass_kg = 'Enter mass in kg';
	} else if (mass < 1 || mass > 500) {
		errors.mass_kg = 'Mass must be between 1 and 500 kg';
	}

	const height = parseDecimal(values.height_cm);
	if (height === null) {
		errors.height_cm = 'Enter height in cm';
	} else if (height < 30 || height > 300) {
		errors.height_cm = 'Height must be between 30 and 300 cm';
	}

	const hasSystolic = values.systolic !== '';
	const hasDiastolic = values.diastolic !== '';
	const systolic = hasSystolic ? parseInteger(values.systolic) : null;
	const diastolic = hasDiastolic ? parseInteger(values.diastolic) : null;

	if (hasSystolic !== hasDiastolic) {
		errors.systolic = 'Enter systolic and diastolic together';
		errors.diastolic = 'Enter systolic and diastolic together';
	} else {
		if (hasSystolic && (systolic === null || systolic < 40 || systolic > 300)) {
			errors.systolic = 'Systolic must be between 40 and 300 mmHg';
		}
		if (hasDiastolic && (diastolic === null || diastolic < 20 || diastolic > 200)) {
			errors.diastolic = 'Diastolic must be between 20 and 200 mmHg';
		}
		if (systolic !== null && diastolic !== null && systolic <= diastolic) {
			errors.systolic = 'Systolic must be greater than diastolic';
		}
	}

	const pulse = values.pulse === '' ? null : parseInteger(values.pulse);
	if (values.pulse !== '' && (pulse === null || pulse < 20 || pulse > 250)) {
		errors.pulse = 'Pulse must be between 20 and 250 bpm';
	}

	if (values.notes.length > MAX_NOTES_LENGTH) {
		errors.notes = `Maximum ${MAX_NOTES_LENGTH} characters`;
	}

	if (Object.keys(errors).length > 0 || mass === null || height === null) {
		return { values, errors, data: null };
	}

	return {
		values,
		errors,
		data: {
			measured_at: values.measured_at,
			mass_kg: roundOne(mass),
			height_cm: roundOne(height),
			systolic,
			diastolic,
			pulse,
			notes: values.notes === '' ? null : values.notes
		}
	};
}

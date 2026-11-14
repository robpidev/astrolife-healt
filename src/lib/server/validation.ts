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
		errors.measured_at = 'La fecha es obligatoria';
	} else if (!isValidIsoDate(values.measured_at)) {
		errors.measured_at = 'La fecha no es válida';
	} else if (values.measured_at > localToday()) {
		errors.measured_at = 'La fecha no puede ser futura';
	}

	const mass = parseDecimal(values.mass_kg);
	if (mass === null) {
		errors.mass_kg = 'Introduce la masa en kg';
	} else if (mass < 1 || mass > 500) {
		errors.mass_kg = 'La masa debe estar entre 1 y 500 kg';
	}

	const height = parseDecimal(values.height_cm);
	if (height === null) {
		errors.height_cm = 'Introduce la talla en cm';
	} else if (height < 30 || height > 300) {
		errors.height_cm = 'La talla debe estar entre 30 y 300 cm';
	}

	const hasSystolic = values.systolic !== '';
	const hasDiastolic = values.diastolic !== '';
	const systolic = hasSystolic ? parseInteger(values.systolic) : null;
	const diastolic = hasDiastolic ? parseInteger(values.diastolic) : null;

	if (hasSystolic !== hasDiastolic) {
		errors.systolic = 'Indica sistólica y diastólica juntas';
		errors.diastolic = 'Indica sistólica y diastólica juntas';
	} else {
		if (hasSystolic && (systolic === null || systolic < 40 || systolic > 300)) {
			errors.systolic = 'La sistólica debe estar entre 40 y 300 mmHg';
		}
		if (hasDiastolic && (diastolic === null || diastolic < 20 || diastolic > 200)) {
			errors.diastolic = 'La diastólica debe estar entre 20 y 200 mmHg';
		}
		if (systolic !== null && diastolic !== null && systolic <= diastolic) {
			errors.systolic = 'La sistólica debe ser mayor que la diastólica';
		}
	}

	const pulse = values.pulse === '' ? null : parseInteger(values.pulse);
	if (values.pulse !== '' && (pulse === null || pulse < 20 || pulse > 250)) {
		errors.pulse = 'El pulso debe estar entre 20 y 250 lpm';
	}

	if (values.notes.length > MAX_NOTES_LENGTH) {
		errors.notes = `Máximo ${MAX_NOTES_LENGTH} caracteres`;
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

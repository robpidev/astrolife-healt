export type CardiovascularMetricCode = 'heart_rate' | 'blood_pressure' | 'spo2';

export type CardiovascularInput =
	| { metric_code: 'heart_rate'; heart_rate: number }
	| { metric_code: 'blood_pressure'; systolic: number; diastolic: number }
	| { metric_code: 'spo2'; spo2: number };

export type CardiovascularField = 'heart_rate' | 'systolic' | 'diastolic' | 'spo2';
export type CardiovascularValues = Record<CardiovascularField | 'metric_code', string>;
export type CardiovascularErrors = Partial<Record<CardiovascularField | 'metric_code', string>>;

/** Result the registration action returns to its page. */
export interface CardiovascularActionData {
	success?: boolean;
	warning?: string | null;
	values?: CardiovascularValues;
	errors?: CardiovascularErrors;
}

const LIMITS: Record<CardiovascularField, [number, number]> = {
	heart_rate: [20, 250],
	systolic: [40, 300],
	diastolic: [20, 200],
	spo2: [0, 100]
};

const FIELD_LABELS: Record<CardiovascularField, string> = {
	heart_rate: 'heart rate',
	systolic: 'systolic pressure',
	diastolic: 'diastolic pressure',
	spo2: 'oxygen saturation'
};

export function parseCardiovascularForm(form: FormData): {
	values: CardiovascularValues;
	errors: CardiovascularErrors;
	data: CardiovascularInput | null;
} {
	const values: CardiovascularValues = {
		metric_code: String(form.get('metric_code') ?? '').trim(),
		heart_rate: String(form.get('heart_rate') ?? '').trim(),
		systolic: String(form.get('systolic') ?? '').trim(),
		diastolic: String(form.get('diastolic') ?? '').trim(),
		spo2: String(form.get('spo2') ?? '').trim()
	};
	const errors: CardiovascularErrors = {};
	const metricCode = values.metric_code;

	if (metricCode !== 'heart_rate' && metricCode !== 'blood_pressure' && metricCode !== 'spo2') {
		return { values, errors: { metric_code: 'Choose a valid measurement.' }, data: null };
	}

	const fields: CardiovascularField[] =
		metricCode === 'blood_pressure' ? ['systolic', 'diastolic'] : [metricCode];
	const numbers: Record<CardiovascularField, number> = {
		heart_rate: 0,
		systolic: 0,
		diastolic: 0,
		spo2: 0
	};

	for (const field of fields) {
		const value = Number(values[field].replace(',', '.'));
		numbers[field] = value;
		const [min, max] = LIMITS[field];

		if (!values[field] || !Number.isFinite(value) || value < min || value > max) {
			errors[field] = `Enter a value for ${FIELD_LABELS[field]} between ${min} and ${max}.`;
		} else if (field !== 'spo2' && !Number.isInteger(value)) {
			errors[field] = 'Enter a whole number.';
		}
	}

	if (
		metricCode === 'blood_pressure' &&
		!errors.systolic &&
		!errors.diastolic &&
		numbers.systolic <= numbers.diastolic
	) {
		errors.systolic = 'Systolic pressure must be higher than diastolic pressure.';
	}

	if (Object.keys(errors).length) return { values, errors, data: null };

	const data: CardiovascularInput =
		metricCode === 'blood_pressure'
			? { metric_code: metricCode, systolic: numbers.systolic, diastolic: numbers.diastolic }
			: metricCode === 'heart_rate'
				? { metric_code: metricCode, heart_rate: numbers.heart_rate }
				: { metric_code: metricCode, spo2: numbers.spo2 };

	return { values, errors, data };
}

export function heartRateWarning(value: number | null): string | null {
	if (value === null || !Number.isFinite(value) || (value >= 60 && value <= 100)) return null;

	return 'Outside the resting reference (60-100 bpm). If the reading was taken at rest, check the record; exercise can raise the pulse.';
}

export function bloodPressureWarning(
	systolic: number | null,
	diastolic: number | null
): string | null {
	if (
		systolic === null ||
		diastolic === null ||
		!Number.isFinite(systolic) ||
		!Number.isFinite(diastolic)
	) {
		return null;
	}

	return systolic > 120 || diastolic > 80
		? 'Exceeds the configured 120/80 mmHg reference. Check the reading.'
		: null;
}

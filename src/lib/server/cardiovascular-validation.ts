export type CardiovascularInput =
	| { metric_code: 'heart_rate'; heart_rate: number }
	| { metric_code: 'blood_pressure'; systolic: number; diastolic: number }
	| { metric_code: 'spo2'; spo2: number };

export type CardiovascularField = 'heart_rate' | 'systolic' | 'diastolic' | 'spo2';
export type CardiovascularValues = Record<CardiovascularField | 'metric_code', string>;
export type CardiovascularErrors = Partial<Record<CardiovascularField | 'metric_code', string>>;

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
		return { values, errors: { metric_code: 'Selecciona una medición válida.' }, data: null };
	}
	const fields: CardiovascularField[] = metricCode === 'blood_pressure' ? ['systolic', 'diastolic'] : [metricCode];
	const limits: Record<CardiovascularField, [number, number]> = {
		heart_rate: [20, 250], systolic: [40, 300], diastolic: [20, 200], spo2: [0, 100]
	};
	const numbers: Record<CardiovascularField, number> = { heart_rate: 0, systolic: 0, diastolic: 0, spo2: 0 };
	for (const field of fields) {
		const value = Number(values[field].replace(',', '.'));
		numbers[field] = value;
		const [min, max] = limits[field];
		if (!values[field] || !Number.isFinite(value) || value < min || value > max) {
			errors[field] = `Introduce un valor entre ${min} y ${max}.`;
		} else if (field !== 'spo2' && !Number.isInteger(value)) {
			errors[field] = 'Introduce un número entero.';
		}
	}
	if (metricCode === 'blood_pressure' && !errors.systolic && !errors.diastolic && numbers.systolic <= numbers.diastolic) {
		errors.systolic = 'La presión sistólica debe ser mayor que la diastólica.';
	}
	if (Object.keys(errors).length) return { values, errors, data: null };
	const data: CardiovascularInput = metricCode === 'blood_pressure'
		? { metric_code: metricCode, systolic: numbers.systolic, diastolic: numbers.diastolic }
		: metricCode === 'heart_rate'
			? { metric_code: metricCode, heart_rate: numbers.heart_rate }
			: { metric_code: metricCode, spo2: numbers.spo2 };
	return { values, errors, data };
}

export function heartRateWarning(value: number | null): string | null {
	if (value === null || !Number.isFinite(value) || (value >= 60 && value <= 100)) return null;
	return 'Fuera de la referencia de reposo (60–100 lpm). Si la lectura fue en reposo, revisa el registro; el ejercicio puede elevar el pulso.';
}

export function bloodPressureWarning(systolic: number | null, diastolic: number | null): string | null {
	if (systolic === null || diastolic === null || !Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
	return systolic > 120 || diastolic > 80
		? 'Supera la referencia configurada de 120/80 mmHg. Revisa la lectura.'
		: null;
}

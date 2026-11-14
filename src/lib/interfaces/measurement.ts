export type BmiTone = 'low' | 'normal' | 'high' | 'obese';

export interface Measurement {
	id: number;
	measured_at: string;
	mass_kg: number;
	height_cm: number;
	systolic: number | null;
	diastolic: number | null;
	pulse: number | null;
	notes: string | null;
	created_at: string;
}

export interface MeasurementInput {
	measured_at: string;
	mass_kg: number;
	height_cm: number;
	systolic: number | null;
	diastolic: number | null;
	pulse: number | null;
	notes: string | null;
}

export interface MeasurementFormValues {
	measured_at: string;
	mass_kg: string;
	height_cm: string;
	systolic: string;
	diastolic: string;
	pulse: string;
	notes: string;
}

export type MeasurementField = keyof MeasurementFormValues;

export type MeasurementErrors = Partial<Record<MeasurementField, string>>;

export type MeasurementAction = 'create' | 'update' | 'delete';

export interface MeasurementActionData {
	action?: MeasurementAction;
	id?: number;
	success?: boolean;
	message?: string;
	error?: string;
	values?: MeasurementFormValues;
	errors?: MeasurementErrors;
}

export interface MeasurementWithBmi extends Measurement {
	bmi: number;
	bmi_label: string;
	bmi_tone: BmiTone;
}

export interface MeasurementSummary {
	latest: MeasurementWithBmi | null;
	previous: Measurement | null;
	mass_delta: number | null;
}

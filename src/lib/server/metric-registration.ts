import { randomUUID } from 'node:crypto';
import type { HealthAreaId } from '#lib/interfaces/health-area.js';
import { getDb } from '#lib/server/db.js';

export type RegistrableMetricId =
	| 'weight'
	| 'hydration'
	| 'fasting-glucose'
	| 'respiratory-rate'
	| 'strength'
	| 'pain'
	| 'dose'
	| 'exercise'
	| 'symptoms';

export type MetricTable = 'measurements' | 'exercise' | 'symptoms';

export interface MetricExtraField {
	name: 'exercise_type' | 'symptom_type';
	label: string;
	options: readonly { value: string; label: string }[];
}

export interface MetricConfig {
	metricId: RegistrableMetricId;
	areaId: HealthAreaId;
	metricCode: string;
	label: string;
	/** Unit shown in the UI. */
	unit: string;
	min: number;
	max: number;
	step: string;
	integer: boolean;
	/** Multiplier applied before storing, e.g. litres → millilitres. */
	storageScale?: number;
	table: MetricTable;
	extra?: MetricExtraField;
}

export const EXERCISE_TYPES = [
	{ value: 'walk', label: 'Walk' },
	{ value: 'run', label: 'Run' },
	{ value: 'resistance', label: 'Resistance' },
	{ value: 'cycling', label: 'Cycling' },
	{ value: 'other', label: 'Other' }
] as const;

export const SYMPTOM_TYPES = [
	{ value: 'fatigue', label: 'Fatigue' },
	{ value: 'pain', label: 'Pain' },
	{ value: 'nausea', label: 'Nausea' },
	{ value: 'headache', label: 'Headache' },
	{ value: 'dizziness', label: 'Dizziness' },
	{ value: 'other', label: 'Other' }
] as const;

const CONFIGS: readonly MetricConfig[] = [
	{
		metricId: 'weight',
		areaId: 'general',
		metricCode: 'body_mass',
		label: 'Weight',
		unit: 'kg',
		min: 1,
		max: 500,
		step: '0.1',
		integer: false,
		table: 'measurements'
	},
	{
		metricId: 'hydration',
		areaId: 'general',
		metricCode: 'water_intake',
		label: 'Hydration',
		unit: 'L',
		min: 0.1,
		max: 10,
		step: '0.1',
		integer: false,
		storageScale: 1000,
		table: 'measurements'
	},
	{
		metricId: 'fasting-glucose',
		areaId: 'general',
		metricCode: 'fasting_glucose',
		label: 'Fasting glucose',
		unit: 'mg/dL',
		min: 20,
		max: 600,
		step: '1',
		integer: true,
		table: 'measurements'
	},
	{
		metricId: 'respiratory-rate',
		areaId: 'cardiovascular',
		metricCode: 'respiratory_rate',
		label: 'Respiratory rate',
		unit: 'breaths/min',
		min: 4,
		max: 60,
		step: '1',
		integer: true,
		table: 'measurements'
	},
	{
		metricId: 'strength',
		areaId: 'muscular',
		metricCode: 'muscle_strength',
		label: 'Strength',
		unit: 'N',
		min: 0,
		max: 500,
		step: '1',
		integer: true,
		table: 'measurements'
	},
	{
		metricId: 'pain',
		areaId: 'muscular',
		metricCode: 'muscle_pain',
		label: 'Pain',
		unit: '/10',
		min: 0,
		max: 10,
		step: '1',
		integer: true,
		table: 'measurements'
	},
	{
		metricId: 'dose',
		areaId: 'radiation',
		metricCode: 'radiation_interval',
		label: 'Radiation dose',
		unit: 'mSv',
		min: 0,
		max: 1000,
		step: '0.001',
		integer: false,
		table: 'measurements'
	},
	{
		metricId: 'exercise',
		areaId: 'muscular',
		metricCode: 'exercise_duration',
		label: 'Exercise',
		unit: 'min',
		min: 0,
		max: 600,
		step: '1',
		integer: true,
		table: 'exercise',
		extra: { name: 'exercise_type', label: 'Exercise type', options: EXERCISE_TYPES }
	},
	{
		metricId: 'symptoms',
		areaId: 'general',
		metricCode: 'symptom_intensity',
		label: 'Symptoms',
		unit: '/10',
		min: 0,
		max: 10,
		step: '1',
		integer: true,
		table: 'symptoms',
		extra: { name: 'symptom_type', label: 'Symptom', options: SYMPTOM_TYPES }
	}
];

export function getMetricConfig(metricId: string): MetricConfig | null {
	return CONFIGS.find((config) => config.metricId === metricId) ?? null;
}

export interface MetricFormValues {
	value: string;
	extra: string;
}

export interface MetricFormErrors {
	value?: string;
	extra?: string;
}

export interface MetricFormData {
	value: number;
	extra: string | null;
}

export interface ParsedMetricForm {
	values: MetricFormValues;
	errors: MetricFormErrors;
	data: MetricFormData | null;
}

export function parseMetricForm(config: MetricConfig, form: FormData): ParsedMetricForm {
	const values: MetricFormValues = {
		value: String(form.get('value') ?? '').trim(),
		extra: String(form.get('extra') ?? '').trim()
	};
	const errors: MetricFormErrors = {};

	const normalized = values.value.replace(',', '.');
	const value = Number(normalized);
	if (!values.value || !Number.isFinite(value) || value < config.min || value > config.max) {
		errors.value = `Enter a value between ${config.min} and ${config.max} ${config.unit}.`;
	} else if (config.integer && !Number.isInteger(value)) {
		errors.value = 'Enter a whole number.';
	}

	if (config.extra) {
		const allowed = config.extra.options.some((option) => option.value === values.extra);
		if (!allowed) errors.extra = `Choose a ${config.extra.label.toLowerCase()}.`;
	}

	if (Object.keys(errors).length > 0) return { values, errors, data: null };

	return {
		values,
		errors,
		data: { value, extra: config.extra ? values.extra : null }
	};
}

function astronautIdFor(profileId: number): string | null {
	const row = getDb()
		.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?')
		.get(profileId) as unknown as { astronaut_id: string } | undefined;
	return row?.astronaut_id ?? null;
}

/** Writes a manual reading to the table that owns the metric. */
export function registerMetric(
	profileId: number,
	config: MetricConfig,
	data: MetricFormData
): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	const db = getDb();
	const measuredAt = new Date().toISOString();
	const stored = data.value * (config.storageScale ?? 1);

	if (config.table === 'exercise') {
		const result = db
			.prepare(
				`INSERT INTO exercise_sessions(
				 id, astronaut_id, started_at, duration_minutes, exercise_type, source
				 ) VALUES(?,?,?,?,?,'manual')`
			)
			.run(randomUUID(), astronautId, measuredAt, Math.round(stored), data.extra ?? 'other');
		return Number(result.changes) === 1;
	}

	if (config.table === 'symptoms') {
		const result = db
			.prepare(
				`INSERT INTO symptom_records(
				 id, astronaut_id, symptom_type, intensity, recorded_at, source
				 ) VALUES(?,?,?,?,?,'manual')`
			)
			.run(randomUUID(), astronautId, data.extra ?? 'other', Math.round(stored), measuredAt);
		return Number(result.changes) === 1;
	}

	const result = db
		.prepare(
			`INSERT INTO measurements(id, astronaut_id, metric_code, value, measured_at, source)
			 VALUES(?,?,?,?,?,'manual')`
		)
		.run(randomUUID(), astronautId, config.metricCode, stored, measuredAt);
	return Number(result.changes) === 1;
}

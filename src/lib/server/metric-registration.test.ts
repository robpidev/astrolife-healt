import { beforeEach, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { getDb } = await import('#lib/server/db.js');
const { getMetricConfig, parseMetricForm, registerMetric } =
	await import('#lib/server/metric-registration.js');
const { getMetricReadings } = await import('#lib/server/health-metrics.js');

const db = getDb();

function form(entries: Record<string, string>): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.set(key, value);
	return data;
}

function reset(): void {
	db.exec(`
		DELETE FROM measurement_components;
		DELETE FROM measurements;
		DELETE FROM symptom_records;
		DELETE FROM exercise_sessions;
		DELETE FROM crew_profiles;
		DELETE FROM astronauts;
	`);
	db.prepare("INSERT INTO astronauts(id, full_name) VALUES('a1', 'Test Astronaut')").run();
	db.prepare("INSERT INTO crew_profiles(id, astronaut_id) VALUES(10, 'a1')").run();
}

describe('parseMetricForm', () => {
	const weight = getMetricConfig('weight')!;
	const exercise = getMetricConfig('exercise')!;
	const symptoms = getMetricConfig('symptoms')!;

	it('accepts a value inside the range', () => {
		const parsed = parseMetricForm(weight, form({ value: '72.5' }));
		expect(parsed.errors).toEqual({});
		expect(parsed.data).toEqual({ value: 72.5, extra: null });
	});

	it('accepts a comma as the decimal separator', () => {
		const parsed = parseMetricForm(weight, form({ value: '72,5' }));
		expect(parsed.data?.value).toBe(72.5);
	});

	it('rejects values outside the range', () => {
		expect(parseMetricForm(weight, form({ value: '0' })).errors.value).toBeTruthy();
		expect(parseMetricForm(weight, form({ value: '501' })).errors.value).toBeTruthy();
		expect(parseMetricForm(weight, form({ value: '' })).errors.value).toBeTruthy();
	});

	it('rejects non-integer values for integer metrics', () => {
		const pulse = getMetricConfig('respiratory-rate')!;
		expect(parseMetricForm(pulse, form({ value: '16.5' })).errors.value).toBe(
			'Enter a whole number.'
		);
		expect(parseMetricForm(pulse, form({ value: '16' })).data?.value).toBe(16);
	});

	it('requires a valid extra option', () => {
		expect(parseMetricForm(exercise, form({ value: '30' })).errors.extra).toBeTruthy();
		expect(parseMetricForm(exercise, form({ value: '30', extra: 'run' })).data?.extra).toBe('run');
		expect(
			parseMetricForm(symptoms, form({ value: '5', extra: 'nope' })).errors.extra
		).toBeTruthy();
	});
});

describe('registerMetric', () => {
	beforeEach(reset);

	it('stores a measurement with the scaled unit', () => {
		const hydration = getMetricConfig('hydration')!;
		const parsed = parseMetricForm(hydration, form({ value: '2.5' }));
		expect(registerMetric(10, hydration, parsed.data!)).toBe(true);

		const row = db
			.prepare("SELECT value FROM measurements WHERE metric_code = 'water_intake'")
			.get() as unknown as { value: number };
		expect(row.value).toBe(2500);
	});

	it('stores exercise sessions in their own table', () => {
		const exercise = getMetricConfig('exercise')!;
		const parsed = parseMetricForm(exercise, form({ value: '45', extra: 'cycling' }));
		expect(registerMetric(10, exercise, parsed.data!)).toBe(true);

		const row = db
			.prepare('SELECT duration_minutes, exercise_type, source FROM exercise_sessions')
			.get() as unknown as { duration_minutes: number; exercise_type: string; source: string };
		expect(row).toEqual({ duration_minutes: 45, exercise_type: 'cycling', source: 'manual' });
	});

	it('stores symptom intensity in its own table', () => {
		const symptoms = getMetricConfig('symptoms')!;
		const parsed = parseMetricForm(symptoms, form({ value: '7', extra: 'headache' }));
		expect(registerMetric(10, symptoms, parsed.data!)).toBe(true);

		const row = db
			.prepare('SELECT symptom_type, intensity, source FROM symptom_records')
			.get() as unknown as { symptom_type: string; intensity: number; source: string };
		expect(row).toEqual({ symptom_type: 'headache', intensity: 7, source: 'manual' });
	});

	it('returns false for an unknown profile', () => {
		const weight = getMetricConfig('weight')!;
		expect(registerMetric(999, weight, { value: 70, extra: null })).toBe(false);
	});
});

describe('getMetricReadings', () => {
	beforeEach(reset);

	it('returns dated readings newest first', () => {
		const weight = getMetricConfig('weight')!;
		registerMetric(10, weight, { value: 70, extra: null });
		registerMetric(10, weight, { value: 72, extra: null });

		const readings = getMetricReadings(10, 'general', 'weight');
		expect(readings).toHaveLength(2);
		expect(readings[0].value).toBe(72);
		expect(readings[1].value).toBe(70);
	});

	it('keeps exercise and symptom detail on each reading', () => {
		const exercise = getMetricConfig('exercise')!;
		const symptoms = getMetricConfig('symptoms')!;
		registerMetric(10, exercise, { value: 30, extra: 'run' });
		registerMetric(10, symptoms, { value: 4, extra: 'nausea' });

		expect(getMetricReadings(10, 'muscular', 'exercise')[0].detail).toBe('run');
		expect(getMetricReadings(10, 'general', 'symptoms')[0].detail).toBe('nausea');
	});
});

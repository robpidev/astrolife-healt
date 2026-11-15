import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { getLatestHealthReadings } = await import('#lib/server/health-reference.js');
const { getDb } = await import('#lib/server/db.js');
const { assessHealthIndicator } = await import('#lib/utils/health-assessment.js');

beforeAll(() => {
	const db = getDb();
	db.prepare('INSERT INTO astronauts(id,full_name) VALUES(?,?)').run('health-a', 'Health A');
	db.prepare('INSERT INTO astronauts(id,full_name) VALUES(?,?)').run('health-b', 'Health B');
	db.prepare('INSERT INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(903, 'health-a');
	db.prepare('INSERT INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(904, 'health-b');
	db.prepare(
		`INSERT OR IGNORE INTO metric_definitions(code, category, label, unit, value_kind)
		VALUES ('fasting_glucose', 'general', 'Fasting blood glucose', 'mg/dL', 'numeric')`
	).run();

	const insert =
		db.prepare(`INSERT INTO measurements(id,astronaut_id,metric_code,value,measured_at,source)
		VALUES(?,?,?,?,?,?)`);
	insert.run('pulse-a', 'health-a', 'heart_rate', 72, '2026-11-14T10:00:00Z', 'manual');
	insert.run('pulse-a-sim', 'health-a', 'heart_rate', 145, '2026-11-15T11:00:00Z', 'simulated');
	insert.run('pulse-b', 'health-b', 'heart_rate', 109, '2026-11-15T12:00:00Z', 'sensor');
	insert.run('sleep-a', 'health-a', 'sleep_duration', 6, '2026-11-14T08:00:00Z', 'sensor');
	insert.run('glucose-a', 'health-a', 'fasting_glucose', 105, '2026-11-14T09:00:00Z', 'manual');
	insert.run('bp-a', 'health-a', 'blood_pressure', null, '2026-11-15T10:00:00Z', 'manual');
	db.prepare(
		'INSERT INTO measurement_components(measurement_id,component_code,value,unit) VALUES(?,?,?,?)'
	).run('bp-a', 'systolic', 128, 'mmHg');
	db.prepare(
		'INSERT INTO measurement_components(measurement_id,component_code,value,unit) VALUES(?,?,?,?)'
	).run('bp-a', 'diastolic', 76, 'mmHg');
});

describe('actual clinical comparisons', () => {
	it('returns only the selected astronaut’s real, unsimulated readings', () => {
		const readings = getLatestHealthReadings(903);
		expect(readings.heartRate).toMatchObject({ value: 72, source: 'manual' });
		expect(readings.sleepDuration).toMatchObject({ value: 6, source: 'sensor' });
		expect(readings.fastingGlucose).toMatchObject({ value: 105, source: 'manual' });
		expect(readings.bloodPressure).toMatchObject({ systolic: 128, diastolic: 76 });
		expect(getLatestHealthReadings(904).heartRate?.value).toBe(109);
		expect(getLatestHealthReadings(9999).heartRate).toBeNull();
	});
	it('never invents measurements for missing indicators', () => {
		expect(getLatestHealthReadings(904).fastingGlucose).toBeNull();
		expect(getLatestHealthReadings(904).bloodPressure).toBeNull();
	});
	it('classifies clinical thresholds without making diagnoses', () => {
		expect(assessHealthIndicator('temperature', null).tone).toBe('unavailable');
		expect(assessHealthIndicator('temperature', 36.8).tone).toBe('normal');
		expect(assessHealthIndicator('temperature', 38.5).label).toContain('Fever-range');
		expect(assessHealthIndicator('temperature', 34.6).tone).toBe('urgent');
		expect(assessHealthIndicator('blood-pressure', null, 128, 76).label).toContain('Elevated');
		expect(assessHealthIndicator('blood-glucose', 105).label).toContain('Prediabetes screening');
		expect(assessHealthIndicator('sleep', 6).tone).toBe('low');
	});
});

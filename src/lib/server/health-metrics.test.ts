import { beforeEach, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { getDb } = await import('#lib/server/db.js');
const { getAreaSnapshots } = await import('#lib/server/health-metrics.js');

const db = getDb();

const insertMeasurement = db.prepare(`INSERT INTO measurements
	(id, astronaut_id, metric_code, value, measured_at, source)
	VALUES (?, 'a1', ?, ?, ?, 'manual')`);
const insertComponent = db.prepare(`INSERT INTO measurement_components
	(measurement_id, component_code, value, unit)
	VALUES (?, ?, ?, 'mmHg')`);

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

describe('getAreaSnapshots', () => {
	beforeEach(reset);

	it('returns oldest-first points and the latest formatted value', () => {
		insertMeasurement.run('t1', 'body_temperature', 36.5, '2026-11-01');
		insertMeasurement.run('t2', 'body_temperature', 36.8, '2026-11-02');
		insertMeasurement.run('t3', 'body_temperature', 37, '2026-11-03');

		const temperature = getAreaSnapshots(10, 'general').find(
			(snapshot) => snapshot.metric_id === 'temperature'
		);

		expect(temperature).toMatchObject({
			latest: 37,
			display: '37',
			points: [36.5, 36.8, 37],
			recorded_at: '2026-11-03'
		});
	});

	it('caps the series and keeps the most recent readings', () => {
		for (let index = 0; index < 15; index += 1) {
			const day = String(index + 1).padStart(2, '0');
			insertMeasurement.run(`t${index}`, 'body_temperature', 36 + index / 10, `2026-01-${day}`);
		}

		const points = getAreaSnapshots(10, 'general').find(
			(snapshot) => snapshot.metric_id === 'temperature'
		)?.points;

		expect(points).toHaveLength(12);
		expect(points?.[0]).toBe(36.3);
		expect(points?.at(-1)).toBe(37.4);
	});

	it('converts stored units to the displayed unit', () => {
		insertMeasurement.run('h1', 'water_intake', 2500, '2026-11-01');
		insertMeasurement.run('h2', 'water_intake', 1750, '2026-11-02');

		const hydration = getAreaSnapshots(10, 'general').find(
			(snapshot) => snapshot.metric_id === 'hydration'
		);

		expect(hydration).toMatchObject({ latest: 1.75, display: '1.8', points: [2.5, 1.75] });
	});

	it('reads symptoms and exercise from their own tables', () => {
		db.prepare(
			`INSERT INTO symptom_records
			(id, astronaut_id, symptom_type, intensity, recorded_at, source)
			VALUES ('s1', 'a1', 'headache', 4, '2026-11-01', 'manual')`
		).run();
		db.prepare(
			`INSERT INTO symptom_records
			(id, astronaut_id, symptom_type, intensity, recorded_at, source)
			VALUES ('s2', 'a1', 'nausea', 6, '2026-11-02', 'manual')`
		).run();
		db.prepare(
			`INSERT INTO exercise_sessions
			(id, astronaut_id, started_at, duration_minutes, exercise_type, source)
			VALUES ('e1', 'a1', '2026-11-01', 30, 'cycle', 'manual')`
		).run();
		db.prepare(
			`INSERT INTO exercise_sessions
			(id, astronaut_id, started_at, duration_minutes, exercise_type, source)
			VALUES ('e2', 'a1', '2026-11-03', 45, 'treadmill', 'manual')`
		).run();

		const general = getAreaSnapshots(10, 'general');
		const muscular = getAreaSnapshots(10, 'muscular');

		expect(general.find((snapshot) => snapshot.metric_id === 'symptoms')).toMatchObject({
			latest: 6,
			display: '6',
			points: [4, 6],
			recorded_at: '2026-11-02'
		});
		expect(muscular.find((snapshot) => snapshot.metric_id === 'exercise')).toMatchObject({
			latest: 45,
			display: '45',
			points: [30, 45]
		});
	});

	it('formats composite blood pressure from its components', () => {
		insertMeasurement.run('bp1', 'blood_pressure', null, '2026-11-03');
		insertComponent.run('bp1', 'systolic', 120);
		insertComponent.run('bp1', 'diastolic', 80);

		const pressure = getAreaSnapshots(10, 'cardiovascular').find(
			(snapshot) => snapshot.metric_id === 'blood-pressure'
		);

		expect(pressure).toMatchObject({
			latest: 120,
			display: '120/80',
			points: [120],
			recorded_at: '2026-11-03'
		});
	});

	it('keeps the configured decimals for small values', () => {
		insertMeasurement.run('r1', 'radiation_interval', 0.041, '2026-11-01');
		insertMeasurement.run('r2', 'radiation_interval', 0.057, '2026-11-02');

		const dose = getAreaSnapshots(10, 'radiation')[0];

		expect(dose).toMatchObject({
			latest: 0.057,
			display: '0.057',
			points: [0.041, 0.057]
		});
	});

	it('reports a scalar blood pressure without a mismatched series', () => {
		insertMeasurement.run('bp2', 'blood_pressure', 122, '2026-11-04');

		const pressure = getAreaSnapshots(10, 'cardiovascular').find(
			(snapshot) => snapshot.metric_id === 'blood-pressure'
		);

		expect(pressure).toMatchObject({ latest: 122, display: '122', points: [] });
	});

	it('ignores a composite row without components', () => {
		insertMeasurement.run('bp3', 'blood_pressure', null, '2026-11-05');

		const pressure = getAreaSnapshots(10, 'cardiovascular').find(
			(snapshot) => snapshot.metric_id === 'blood-pressure'
		);

		expect(pressure).toMatchObject({
			latest: null,
			display: null,
			points: [],
			recorded_at: '2026-11-05'
		});
	});

	it('returns empty snapshots for a profile without readings or an unknown one', () => {
		const general = getAreaSnapshots(10, 'general');
		const missing = getAreaSnapshots(999, 'general');

		expect(general).toHaveLength(4);
		expect(
			general.every((snapshot) => snapshot.display === null && snapshot.points.length === 0)
		).toBe(true);
		expect(missing.every((snapshot) => snapshot.display === null)).toBe(true);
	});
});

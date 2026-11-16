import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { acknowledgeAlert, getAlertSummary, getAstronautAlerts } =
	await import('#lib/server/alerts.js');
const { getDb } = await import('#lib/server/db.js');

const insert = (id: string, value: number, measuredAt: string) => {
	getDb()
		.prepare(
			`INSERT INTO measurements(id,astronaut_id,metric_code,value,measured_at,source)
			 VALUES(?,?,?,?,?,'manual')`
		)
		.run(id, 'alert-a', 'heart_rate', value, measuredAt);
};

beforeAll(() => {
	const db = getDb();
	db.prepare('INSERT INTO astronauts(id,full_name) VALUES(?,?)').run('alert-a', 'Alert A');
	db.prepare('INSERT INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(905, 'alert-a');
	insert('alert-high', 128, '2026-11-15T09:00:00Z');
});

describe('derived health alerts', () => {
	it('opens a warning from the latest abnormal reading', () => {
		const alerts = getAstronautAlerts(905);
		expect(alerts).toHaveLength(1);
		expect(alerts[0]).toMatchObject({
			indicator: 'heart-rate',
			severity: 'red',
			acknowledged: false
		});
		expect(getAlertSummary(905)).toMatchObject({ red: 1, total: 1, overall: 'red' });
	});

	it('keeps an acknowledgement scoped to that reading', () => {
		expect(acknowledgeAlert(905, 'heart-rate', 'alert-high')).toBe(true);
		expect(getAstronautAlerts(905)[0].acknowledged).toBe(true);
		expect(getAlertSummary(905)).toMatchObject({ red: 0, total: 0 });
	});

	it('reopens the warning when a newer reading arrives', () => {
		insert('alert-newer', 132, '2026-11-15T10:00:00Z');
		const alerts = getAstronautAlerts(905);
		expect(alerts[0]).toMatchObject({ reading_id: 'alert-newer', acknowledged: false });
	});

	it('closes the warning when the latest reading is normal', () => {
		insert('alert-normal', 74, '2026-11-15T11:00:00Z');
		expect(getAstronautAlerts(905)).toEqual([]);
		expect(getAlertSummary(905)).toMatchObject({ total: 0, overall: 'green' });
	});
});

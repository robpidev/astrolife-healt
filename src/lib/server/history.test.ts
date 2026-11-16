import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { getHealthHistory, historyToCsv } = await import('#lib/server/history.js');
const { getDb } = await import('#lib/server/db.js');

beforeAll(() => {
	const db = getDb();
	db.prepare('INSERT INTO astronauts(id,full_name) VALUES(?,?)').run('history-a', 'History A');
	db.prepare('INSERT INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(906, 'history-a');
	db.prepare(
		`INSERT INTO measurements(id,astronaut_id,metric_code,value,measured_at,source)
		 VALUES('bp-history','history-a','blood_pressure',NULL,'2026-11-15T09:00:00Z','manual')`
	).run();
	const component = db.prepare(
		'INSERT INTO measurement_components(measurement_id,component_code,value,unit) VALUES(?,?,?,?)'
	);
	component.run('bp-history', 'systolic', 128, 'mmHg');
	component.run('bp-history', 'diastolic', 76, 'mmHg');
});

describe('mission log history', () => {
	it('formats blood pressure from its components', () => {
		const entries = getHealthHistory(906);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			metric_code: 'blood_pressure',
			area_id: 'cardiovascular',
			display: '128/76 mmHg'
		});
	});

	it('exports the blood pressure value without duplicating the unit', () => {
		const csv = historyToCsv(getHealthHistory(906));
		expect(csv).toContain('"128/76","mmHg"');
	});
});

import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { getBodyMapVitals } = await import('#lib/server/body-map.js');
const { getDb } = await import('#lib/server/db.js');

beforeAll(() => {
	const db = getDb();
	db.prepare('INSERT INTO astronauts(id,full_name) VALUES(?,?)').run('body-a', 'Body A');
	db.prepare('INSERT INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(901, 'body-a');

	const insert = db.prepare(
		`INSERT INTO measurements(id,astronaut_id,metric_code,value,measured_at,source)
		VALUES(?,?,?,?,?,?)`
	);
	insert.run('body-hr-old', 'body-a', 'heart_rate', 72, '2026-11-14T10:00:00Z', 'manual');
	insert.run('body-hr-new', 'body-a', 'heart_rate', 88, '2026-11-15T10:00:00Z', 'sensor');
	insert.run('body-hr-null', 'body-a', 'heart_rate', null, '2026-11-16T10:00:00Z', 'manual');
	insert.run('body-stress', 'body-a', 'stress', 6, '2026-11-15T09:00:00Z', 'manual');
	insert.run('body-fatigue', 'body-a', 'fatigue', 4, '2026-11-15T09:00:00Z', 'manual');
});

describe('body map vitals', () => {
	it('returns the newest reading for each metric', () => {
		expect(getBodyMapVitals(901)).toEqual({ heart_rate: 88, stress: 6, fatigue: 4 });
	});

	it('ignores null readings and unknown profiles', () => {
		expect(getBodyMapVitals(9999)).toEqual({ heart_rate: null, stress: null, fatigue: null });
	});

	it('never mixes astronauts', () => {
		const db = getDb();
		db.prepare('INSERT INTO astronauts(id,full_name) VALUES(?,?)').run('body-b', 'Body B');
		db.prepare('INSERT INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(902, 'body-b');
		db.prepare(
			`INSERT INTO measurements(id,astronaut_id,metric_code,value,measured_at,source)
			VALUES('body-b-stress','body-b','stress',9,'2026-11-15T12:00:00Z','manual')`
		).run();

		expect(getBodyMapVitals(902).stress).toBe(9);
		expect(getBodyMapVitals(901).stress).toBe(6);
	});
});

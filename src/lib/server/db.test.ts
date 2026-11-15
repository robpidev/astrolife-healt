import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeSchema } from '#lib/server/db.js';

describe('health schema migration', () => {
	it('preserves legacy personal measurements and initializes idempotently', () => {
		const db = new DatabaseSync(':memory:');
		db.exec(`CREATE TABLE measurements (
			id INTEGER PRIMARY KEY AUTOINCREMENT, measured_at TEXT NOT NULL,
			mass_kg REAL NOT NULL, height_cm REAL NOT NULL, systolic INTEGER,
			diastolic INTEGER, pulse INTEGER, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		); INSERT INTO measurements(measured_at,mass_kg,height_cm) VALUES('2026-11-14',70,175);`);
		initializeSchema(db);
		initializeSchema(db);
		expect(db.prepare('SELECT mass_kg FROM personal_measurements').get()?.mass_kg).toBe(70);
		expect(db.prepare('SELECT count(*) AS total FROM metric_definitions').get()?.total).toBe(16);
		expect(db.prepare('PRAGMA table_info(measurements)').all().some((column) => column.name === 'astronaut_id')).toBe(true);
		db.close();
	});
	it('adds nullable demographics to existing astronauts', () => {
		const db = new DatabaseSync(':memory:');
		db.exec("CREATE TABLE astronauts(id TEXT PRIMARY KEY,full_name TEXT NOT NULL,photo_path TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO astronauts(id,full_name) VALUES('existing','Nombre Existente');");
		initializeSchema(db);
		expect(db.prepare('SELECT full_name,nationality,sex FROM astronauts').get()).toMatchObject({full_name:'Nombre Existente',nationality:null,sex:null});
		expect(() => db.prepare('UPDATE astronauts SET sex = ?').run('invalid')).toThrow();
		db.close();
	});
});

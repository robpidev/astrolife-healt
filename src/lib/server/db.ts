import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import healthSchema from '../../../bd.sql?raw';

const SCHEMA = `
	CREATE TABLE IF NOT EXISTS personal_measurements (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		measured_at TEXT NOT NULL,
		mass_kg REAL NOT NULL CHECK (mass_kg BETWEEN 1 AND 500),
		height_cm REAL NOT NULL CHECK (height_cm BETWEEN 30 AND 300),
		systolic INTEGER CHECK (systolic IS NULL OR systolic BETWEEN 40 AND 300),
		diastolic INTEGER CHECK (diastolic IS NULL OR diastolic BETWEEN 20 AND 200),
		pulse INTEGER CHECK (pulse IS NULL OR pulse BETWEEN 20 AND 250),
		notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		CHECK (systolic IS NULL OR diastolic IS NULL OR systolic > diastolic)
	);

	CREATE INDEX IF NOT EXISTS idx_personal_measurements_measured_at
		ON personal_measurements (measured_at DESC, id DESC);
`;

const globalForDb = globalThis as unknown as { __astrolifeDb?: DatabaseSync };

function createDatabase(): DatabaseSync {
	const file = process.env.DATABASE_PATH ?? 'data/astrolife.db';
	const path = file === ':memory:' ? file : resolve(process.cwd(), file);

	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

	const database = new DatabaseSync(path);
	database.exec('PRAGMA journal_mode = WAL;');
	database.exec('PRAGMA foreign_keys = ON;');

	return database;
}

export function initializeSchema(database: DatabaseSync): void {
	// The previous personal log and the supplied health schema use the same table
	// name with different columns. Rename only the legacy table, keeping its rows.
	const columns = database.prepare('PRAGMA table_info(measurements)').all();
	database.exec('BEGIN IMMEDIATE');
	try {
		if (columns.some((column) => column.name === 'mass_kg')) {
			database.exec('ALTER TABLE measurements RENAME TO personal_measurements');
		}
		database.exec(SCHEMA);
		database.exec(healthSchema);
		const astronautColumns = database.prepare('PRAGMA table_info(astronauts)').all();
		if (!astronautColumns.some((column) => column.name === 'nationality')) {
			database.exec(`ALTER TABLE astronauts ADD COLUMN nationality TEXT
				CHECK(nationality IS NULL OR length(nationality) BETWEEN 1 AND 80)`);
		}
		if (!astronautColumns.some((column) => column.name === 'sex')) {
			database.exec(`ALTER TABLE astronauts ADD COLUMN sex TEXT
				CHECK(sex IS NULL OR sex IN ('femenino','masculino','intersexual','no_especificado'))`);
		}
		database.exec('COMMIT');
	} catch (error) {
		database.exec('ROLLBACK');
		throw error;
	}
}

let initializedDatabase: DatabaseSync | null = null;

/**
 * Opens the database on first use. Keeping it lazy avoids creating
 * `data/` when SvelteKit imports server modules during a build.
 */
export function getDb(): DatabaseSync {
	if (!globalForDb.__astrolifeDb) {
		globalForDb.__astrolifeDb = createDatabase();
	}

	if (initializedDatabase !== globalForDb.__astrolifeDb) {
		initializeSchema(globalForDb.__astrolifeDb);
		initializedDatabase = globalForDb.__astrolifeDb;
	}

	return globalForDb.__astrolifeDb;
}

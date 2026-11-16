import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
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
		if (!astronautColumns.some((column) => column.name === 'birth_date')) {
			database.exec(`ALTER TABLE astronauts ADD COLUMN birth_date TEXT
				CHECK(birth_date IS NULL OR birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`);
		}
		migrateLegacyMedicalLists(database);
		database.exec('COMMIT');
	} catch (error) {
		database.exec('ROLLBACK');
		throw error;
	}
}

/**
 * The old dossier stored allergies and medications as free text. Move each
 * non-empty line into the new entry table once, then clear the legacy columns
 * so deleted entries cannot reappear on the next startup.
 */
function migrateLegacyMedicalLists(database: DatabaseSync): void {
	const rows = database
		.prepare(
			`SELECT astronaut_id, allergies, medications FROM crew_medical_profiles
			 WHERE (allergies IS NOT NULL AND trim(allergies) <> '')
			    OR (medications IS NOT NULL AND trim(medications) <> '')`
		)
		.all() as unknown as {
		astronaut_id: string;
		allergies: string | null;
		medications: string | null;
	}[];

	if (rows.length === 0) return;

	const hasEntry = database.prepare(
		'SELECT 1 FROM crew_medical_entries WHERE astronaut_id = ? AND kind = ? LIMIT 1'
	);
	const insert = database.prepare(
		`INSERT INTO crew_medical_entries(id, astronaut_id, kind, name)
		 VALUES(?,?,?,?)`
	);
	const clear = database.prepare(
		'UPDATE crew_medical_profiles SET allergies = NULL, medications = NULL WHERE astronaut_id = ?'
	);

	for (const row of rows) {
		const legacy: ['allergy' | 'medication', string | null][] = [
			['allergy', row.allergies],
			['medication', row.medications]
		];

		for (const [kind, text] of legacy) {
			if (!text || hasEntry.get(row.astronaut_id, kind)) continue;
			const names = text
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean);
			for (const name of names) {
				insert.run(randomUUID(), row.astronaut_id, kind, name.slice(0, 120));
			}
		}

		clear.run(row.astronaut_id);
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

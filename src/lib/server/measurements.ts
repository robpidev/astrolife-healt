import type { StatementSync } from 'node:sqlite';
import type { Measurement, MeasurementInput } from '#lib/interfaces/measurement.js';
import { getDb } from '#lib/server/db.js';

interface MeasurementRow {
	id: number;
	measured_at: string;
	mass_kg: number;
	height_cm: number;
	systolic: number | null;
	diastolic: number | null;
	pulse: number | null;
	notes: string | null;
	created_at: string;
}

interface Statements {
	list: StatementSync;
	get: StatementSync;
	insert: StatementSync;
	update: StatementSync;
	remove: StatementSync;
}

const COLUMNS =
	'id, measured_at, mass_kg, height_cm, systolic, diastolic, pulse, notes, created_at';

let statements: Statements | null = null;

function getStatements(): Statements {
	if (statements) return statements;

	const db = getDb();

	statements = {
		list: db.prepare(`SELECT ${COLUMNS} FROM personal_measurements ORDER BY measured_at DESC, id DESC`),
		get: db.prepare(`SELECT ${COLUMNS} FROM personal_measurements WHERE id = ?`),
		insert: db.prepare(
			`INSERT INTO personal_measurements (measured_at, mass_kg, height_cm, systolic, diastolic, pulse, notes)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		),
		update: db.prepare(
			`UPDATE personal_measurements
			 SET measured_at = ?, mass_kg = ?, height_cm = ?, systolic = ?, diastolic = ?, pulse = ?, notes = ?
			 WHERE id = ?`
		),
		remove: db.prepare('DELETE FROM personal_measurements WHERE id = ?')
	};

	return statements;
}

function toMeasurement(row: MeasurementRow): Measurement {
	return {
		id: row.id,
		measured_at: row.measured_at,
		mass_kg: row.mass_kg,
		height_cm: row.height_cm,
		systolic: row.systolic,
		diastolic: row.diastolic,
		pulse: row.pulse,
		notes: row.notes,
		created_at: row.created_at
	};
}

export function listMeasurements(): Measurement[] {
	return (getStatements().list.all() as unknown as MeasurementRow[]).map(toMeasurement);
}

export function getMeasurement(id: number): Measurement | null {
	const row = getStatements().get.get(id) as unknown as MeasurementRow | undefined;

	return row ? toMeasurement(row) : null;
}

export function createMeasurement(input: MeasurementInput): number {
	const result = getStatements().insert.run(
		input.measured_at,
		input.mass_kg,
		input.height_cm,
		input.systolic,
		input.diastolic,
		input.pulse,
		input.notes
	);

	return Number(result.lastInsertRowid);
}

export function updateMeasurement(id: number, input: MeasurementInput): boolean {
	const result = getStatements().update.run(
		input.measured_at,
		input.mass_kg,
		input.height_cm,
		input.systolic,
		input.diastolic,
		input.pulse,
		input.notes,
		id
	);

	return Number(result.changes) > 0;
}

export function deleteMeasurement(id: number): boolean {
	const result = getStatements().remove.run(id);

	return Number(result.changes) > 0;
}

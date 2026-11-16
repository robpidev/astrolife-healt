import { randomUUID } from 'node:crypto';
import type {
	MedicalEntry,
	MedicalEntryInput,
	MedicalMarkdownField,
	MedicalProfile
} from '#lib/interfaces/medical-profile.js';
import { getDb } from '#lib/server/db.js';

interface ProfileRow {
	astronaut_id: string;
	blood_type: string | null;
	medical_history: string | null;
	baseline_notes: string | null;
	updated_at: string | null;
}

function astronautIdFor(profileId: number): string | null {
	const row = getDb()
		.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?')
		.get(profileId) as unknown as { astronaut_id: string } | undefined;
	return row?.astronaut_id ?? null;
}

function ensureProfile(astronautId: string): void {
	getDb()
		.prepare(
			`INSERT INTO crew_medical_profiles(astronaut_id)
			 VALUES(?)
			 ON CONFLICT(astronaut_id) DO NOTHING`
		)
		.run(astronautId);
}

function touchProfile(astronautId: string): void {
	getDb()
		.prepare(
			'UPDATE crew_medical_profiles SET updated_at = CURRENT_TIMESTAMP WHERE astronaut_id = ?'
		)
		.run(astronautId);
}

export function getMedicalProfile(profileId: number): MedicalProfile | null {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return null;

	const row = getDb()
		.prepare(
			`SELECT astronaut_id, blood_type, medical_history, baseline_notes, updated_at
			 FROM crew_medical_profiles WHERE astronaut_id = ?`
		)
		.get(astronautId) as unknown as ProfileRow | undefined;

	const entries = getDb()
		.prepare(
			`SELECT id, kind, name, severity, dose, note, created_at
			 FROM crew_medical_entries
			 WHERE astronaut_id = ?
			 ORDER BY created_at ASC, rowid ASC`
		)
		.all(astronautId) as unknown as MedicalEntry[];

	return {
		astronaut_id: astronautId,
		blood_type: row?.blood_type ?? null,
		medical_history: row?.medical_history ?? null,
		baseline_notes: row?.baseline_notes ?? null,
		updated_at: row?.updated_at ?? null,
		allergies: entries.filter((entry) => entry.kind === 'allergy'),
		medications: entries.filter((entry) => entry.kind === 'medication')
	};
}

export function saveBloodType(profileId: number, bloodType: string | null): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	ensureProfile(astronautId);
	getDb()
		.prepare(
			`UPDATE crew_medical_profiles
			 SET blood_type = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE astronaut_id = ?`
		)
		.run(bloodType, astronautId);
	return true;
}

export function saveMedicalMarkdown(
	profileId: number,
	field: MedicalMarkdownField,
	value: string
): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	ensureProfile(astronautId);
	// The column name is a whitelisted union, never raw user input.
	const column = field === 'medical_history' ? 'medical_history' : 'baseline_notes';
	getDb()
		.prepare(
			`UPDATE crew_medical_profiles
			 SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE astronaut_id = ?`
		)
		.run(value || null, astronautId);
	return true;
}

export function addMedicalEntry(profileId: number, input: MedicalEntryInput): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	ensureProfile(astronautId);
	getDb()
		.prepare(
			`INSERT INTO crew_medical_entries(id, astronaut_id, kind, name, severity, dose, note)
			 VALUES(?,?,?,?,?,?,?)`
		)
		.run(randomUUID(), astronautId, input.kind, input.name, input.severity, input.dose, input.note);
	touchProfile(astronautId);
	return true;
}

export function removeMedicalEntry(profileId: number, entryId: string): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	const result = getDb()
		.prepare('DELETE FROM crew_medical_entries WHERE id = ? AND astronaut_id = ?')
		.run(entryId, astronautId);

	if (Number(result.changes) === 0) return false;
	touchProfile(astronautId);
	return true;
}

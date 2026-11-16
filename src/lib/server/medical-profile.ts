import type { MedicalProfile, MedicalProfileInput } from '#lib/interfaces/medical-profile.js';
import { getDb } from '#lib/server/db.js';

const EMPTY: MedicalProfile = {
	astronaut_id: '',
	blood_type: null,
	allergies: null,
	medications: null,
	medical_history: null,
	baseline_notes: null,
	updated_at: null
};

function astronautIdFor(profileId: number): string | null {
	const row = getDb()
		.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?')
		.get(profileId) as unknown as { astronaut_id: string } | undefined;
	return row?.astronaut_id ?? null;
}

export function getMedicalProfile(profileId: number): MedicalProfile | null {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return null;

	const row = getDb()
		.prepare(
			`SELECT astronaut_id, blood_type, allergies, medications, medical_history,
			        baseline_notes, updated_at
			 FROM crew_medical_profiles WHERE astronaut_id = ?`
		)
		.get(astronautId) as unknown as MedicalProfile | undefined;

	return row ?? { ...EMPTY, astronaut_id: astronautId };
}

export function saveMedicalProfile(
	profileId: number,
	input: MedicalProfileInput
): MedicalProfile | null {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return null;

	getDb()
		.prepare(
			`INSERT INTO crew_medical_profiles(
			 astronaut_id, blood_type, allergies, medications, medical_history, baseline_notes, updated_at
			 ) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)
			 ON CONFLICT(astronaut_id) DO UPDATE SET
			 blood_type = excluded.blood_type,
			 allergies = excluded.allergies,
			 medications = excluded.medications,
			 medical_history = excluded.medical_history,
			 baseline_notes = excluded.baseline_notes,
			 updated_at = CURRENT_TIMESTAMP`
		)
		.run(
			astronautId,
			input.blood_type || null,
			input.allergies || null,
			input.medications || null,
			input.medical_history || null,
			input.baseline_notes || null
		);

	return getMedicalProfile(profileId);
}

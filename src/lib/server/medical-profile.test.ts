import { beforeEach, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { getDb, initializeSchema } = await import('#lib/server/db.js');
const {
	addMedicalEntry,
	addMedicalEvaluation,
	getMedicalProfile,
	removeMedicalEntry,
	removeMedicalEvaluation,
	saveBirthDate,
	saveBloodType,
	saveMedicalMarkdown
} = await import('#lib/server/medical-profile.js');

const db = getDb();

function reset(): void {
	db.exec(`
		DELETE FROM crew_medical_evaluations;
		DELETE FROM crew_medical_entries;
		DELETE FROM health_baselines;
		DELETE FROM crew_medical_profiles;
		DELETE FROM crew_profiles;
		DELETE FROM astronauts;
	`);
	db.prepare("INSERT INTO astronauts(id, full_name) VALUES('a1', 'Test Astronaut')").run();
	db.prepare("INSERT INTO crew_profiles(id, astronaut_id) VALUES(10, 'a1')").run();
}

describe('medical profile', () => {
	beforeEach(reset);

	it('returns an empty dossier for a new astronaut', () => {
		expect(getMedicalProfile(10)).toMatchObject({
			blood_type: null,
			allergies: [],
			medications: [],
			evaluations: [],
			baselines: [],
			medical_history: null,
			baseline_notes: null
		});
	});

	it('saves the blood type and markdown fields', () => {
		expect(saveBloodType(10, 'O+')).toBe(true);
		expect(saveMedicalMarkdown(10, 'medical_history', '# History\n- asthma')).toBe(true);
		expect(saveMedicalMarkdown(10, 'baseline_notes', 'Resting HR 58')).toBe(true);

		expect(getMedicalProfile(10)).toMatchObject({
			blood_type: 'O+',
			medical_history: '# History\n- asthma',
			baseline_notes: 'Resting HR 58'
		});
	});

	it('adds and removes allergy and medication entries', () => {
		expect(
			addMedicalEntry(10, {
				kind: 'allergy',
				name: 'Penicillin',
				severity: 'severe',
				dose: null,
				note: 'Rash'
			})
		).toBe(true);
		expect(
			addMedicalEntry(10, {
				kind: 'medication',
				name: 'Ibuprofen',
				severity: null,
				dose: '200 mg',
				note: 'After meals'
			})
		).toBe(true);

		const profile = getMedicalProfile(10)!;
		expect(profile.allergies[0]).toMatchObject({
			name: 'Penicillin',
			severity: 'severe',
			note: 'Rash'
		});
		expect(profile.medications[0]).toMatchObject({
			name: 'Ibuprofen',
			dose: '200 mg',
			note: 'After meals'
		});

		expect(removeMedicalEntry(10, profile.allergies[0].id)).toBe(true);
		expect(getMedicalProfile(10)?.allergies).toHaveLength(0);
		expect(getMedicalProfile(10)?.medications).toHaveLength(1);
	});

	it('saves and clears the birth date through the dossier', () => {
		expect(saveBirthDate(10, '1990-04-12')).toBe(true);
		expect(getMedicalProfile(10)?.birth_date).toBe('1990-04-12');
		expect(saveBirthDate(10, null)).toBe(true);
		expect(getMedicalProfile(10)?.birth_date).toBeNull();
		expect(saveBirthDate(999, '1990-04-12')).toBe(false);
	});

	it('adds, orders and removes medical evaluations', () => {
		expect(
			addMedicalEvaluation(10, {
				kind: 'pre-mission',
				evaluated_at: '2026-01-10',
				summary: 'Cleared for long-duration flight',
				notes: null
			})
		).toBe(true);
		expect(
			addMedicalEvaluation(10, {
				kind: 'periodic',
				evaluated_at: '2026-06-01',
				summary: 'Annual check',
				notes: 'No findings'
			})
		).toBe(true);

		const profile = getMedicalProfile(10)!;
		expect(profile.evaluations.map((item) => item.summary)).toEqual([
			'Annual check',
			'Cleared for long-duration flight'
		]);

		expect(removeMedicalEvaluation(10, profile.evaluations[0].id)).toBe(true);
		expect(getMedicalProfile(10)?.evaluations).toHaveLength(1);
		expect(removeMedicalEvaluation(10, 'missing-id')).toBe(false);
	});

	it('reads the active health baselines with metric labels', () => {
		db.prepare(
			`INSERT INTO health_baselines(id, astronaut_id, metric_code, baseline_value, valid_from, valid_until)
			 VALUES('b1', 'a1', 'heart_rate', 58, '2026-01-01', NULL)`
		).run();
		db.prepare(
			`INSERT INTO health_baselines(id, astronaut_id, metric_code, baseline_value, valid_from, valid_until)
			 VALUES('b2', 'a1', 'heart_rate', 70, '2025-01-01', '2025-12-31')`
		).run();

		const profile = getMedicalProfile(10)!;
		expect(profile.baselines).toHaveLength(1);
		expect(profile.baselines[0]).toMatchObject({
			metric_code: 'heart_rate',
			baseline_value: 58
		});
		expect(profile.baselines[0].label).toBeTruthy();
	});

	it('migrates legacy free-text lists once', () => {
		db.prepare(
			`INSERT INTO crew_medical_profiles(astronaut_id, allergies, medications)
			 VALUES('a1', 'Penicillin\nPeanuts', 'Ibuprofen')`
		).run();

		initializeSchema(db);

		const profile = getMedicalProfile(10)!;
		expect(profile.allergies.map((entry) => entry.name)).toEqual(['Penicillin', 'Peanuts']);
		expect(profile.medications.map((entry) => entry.name)).toEqual(['Ibuprofen']);

		const legacy = db
			.prepare('SELECT allergies, medications FROM crew_medical_profiles WHERE astronaut_id = ?')
			.get('a1') as unknown as { allergies: string | null; medications: string | null };
		expect(legacy).toEqual({ allergies: null, medications: null });
	});
});

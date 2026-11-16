import { describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';
const { getCrewDashboard, saveAstronaut, deleteAstronaut, toggleTask } =
	await import('#lib/server/crew.js');
const { getDb } = await import('#lib/server/db.js');
const { parseAstronautForm, parseCrewId } = await import('#lib/server/crew-validation.js');

const input = {
	first_name: 'Nadia',
	last_name: 'Vega',
	nationality: 'Mexican',
	sex: 'femenino' as const,
	role: 'Mission Specialist',
	tone: 'cyan' as const,
	birth_date: null
};

describe('persisted crew', () => {
	it('seeds once with diverse nationalities and sexes', () => {
		const first = getCrewDashboard();
		expect(first.astronauts).toHaveLength(6);
		expect(new Set(first.astronauts.map((astronaut) => astronaut.nationality)).size).toBe(6);
		expect(new Set(first.astronauts.map((astronaut) => astronaut.sex)).size).toBeGreaterThan(1);
		expect(getCrewDashboard()).toEqual(first);
	});
	it('seeds initial-condition baselines for demo astronauts', () => {
		const db = getDb();
		const total = db
			.prepare("SELECT count(*) AS total FROM health_baselines WHERE astronaut_id LIKE 'demo-%'")
			.get() as unknown as { total: number };
		expect(total.total).toBe(getCrewDashboard().astronauts.length * 2);
	});

	it('persists edits, task XP round trips and deletion without reseeding', () => {
		const photo = 'data:image/png;base64,dGVzdA==';
		const id = saveAstronaut(null, input, photo)!;
		let astronaut = getCrewDashboard().astronauts.find((row) => row.id === id)!;
		expect(astronaut).toMatchObject({ ...input, avatar_url: photo });
		expect(astronaut.tasks).toHaveLength(3);
		const task = astronaut.tasks[0];
		expect(toggleTask(id, task.id)).toBe(true);
		astronaut = getCrewDashboard().astronauts.find((row) => row.id === id)!;
		expect(astronaut.xp_total).toBe(task.xp);
		expect(astronaut.tasks[0].done).toBe(true);
		expect(toggleTask(id, task.id)).toBe(true);
		expect(getCrewDashboard().astronauts.find((row) => row.id === id)?.xp_total).toBe(0);
		expect(saveAstronaut(id, { ...input, nationality: 'Chilean' })).toBe(id);
		expect(getCrewDashboard().astronauts.find((row) => row.id === id)?.nationality).toBe('Chilean');
		expect(getCrewDashboard().astronauts.find((row) => row.id === id)?.avatar_url).toBe(photo);
		expect(saveAstronaut(id, input, 'data:image/png;base64,bmV3')).toBe(id);
		expect(getCrewDashboard().astronauts.find((row) => row.id === id)?.avatar_url).toBe(
			'data:image/png;base64,bmV3'
		);
		expect(deleteAstronaut(id)).toBe(true);
		expect(getCrewDashboard().astronauts.find((row) => row.id === id)).toBeUndefined();
		const demoId = getCrewDashboard().astronauts[0].id;
		expect(deleteAstronaut(demoId)).toBe(true);
		expect(getCrewDashboard().astronauts.find((row) => row.id === demoId)).toBeUndefined();
	});
	it('rejects tasks belonging to another astronaut and preserves linked health history', () => {
		const [first, second] = getCrewDashboard().astronauts;
		expect(toggleTask(first.id, second.tasks[0].id)).toBe(false);
		const db = getDb();
		const row = db.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?').get(first.id)!;
		db.prepare(
			"INSERT INTO symptom_records(id,astronaut_id,symptom_type,intensity,recorded_at,source) VALUES(?,?,'fatiga',2,'2026-11-14','simulated')"
		).run('test-symptom', row.astronaut_id);
		expect(() => deleteAstronaut(first.id)).toThrow();
		expect(getCrewDashboard().astronauts.some((astronaut) => astronaut.id === first.id)).toBe(true);
	});
});

describe('crew validation', () => {
	it('validates IDs without accepting partial or unsafe numbers', () => {
		expect(parseCrewId('12')).toBe(12);
		for (const value of ['1x', '0', '-1', '1.5', '9007199254740992', ''])
			expect(parseCrewId(value)).toBeNull();
	});
	it('validates names, nationality, sex, role and tone', () => {
		const form = new FormData();
		for (const [key, value] of Object.entries(input)) form.set(key, String(value ?? ''));
		expect(parseAstronautForm(form).data).toEqual(input);
		form.set('nationality', '');
		form.set('sex', 'invalid');
		form.set('tone', 'invalid');
		const invalid = parseAstronautForm(form);
		expect(invalid.data).toBeNull();
		expect(Object.keys(invalid.errors)).toEqual(['nationality', 'sex', 'tone']);
	});
	it('round-trips a birth date through save and edit', () => {
		const withBirthDate = { ...input, birth_date: '1990-04-12' };
		const id = saveAstronaut(null, withBirthDate)!;
		expect(getCrewDashboard().astronauts.find((row) => row.id === id)?.birth_date).toBe(
			'1990-04-12'
		);
		expect(saveAstronaut(id, { ...withBirthDate, birth_date: null })).toBe(id);
		expect(getCrewDashboard().astronauts.find((row) => row.id === id)?.birth_date).toBeNull();
	});

	it('accepts a past birth date and rejects impossible or future ones', () => {
		const form = new FormData();
		for (const [key, value] of Object.entries(input)) form.set(key, String(value ?? ''));
		form.set('birth_date', '1990-04-12');
		expect(parseAstronautForm(form).data?.birth_date).toBe('1990-04-12');

		form.set('birth_date', '2026-02-30');
		expect(parseAstronautForm(form).errors.birth_date).toBe(
			'Enter a valid date of birth that is not in the future.'
		);

		form.set('birth_date', '2999-01-01');
		expect(parseAstronautForm(form).errors.birth_date).toBeTruthy();
	});
});

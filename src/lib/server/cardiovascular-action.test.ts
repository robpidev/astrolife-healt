import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

process.env.DATABASE_PATH = ':memory:';

const { getDb } = await import('#lib/server/db.js');
const { createRegisterAction } = await import('#lib/server/cardiovascular-action.js');

const db = getDb();

function createProfile(): { profileId: number; astronautId: string } {
	const astronautId = randomUUID();
	db.prepare('INSERT INTO astronauts(id, full_name) VALUES(?, ?)').run(astronautId, 'Test Person');
	const profileId = Number(
		db.prepare('INSERT INTO crew_profiles(astronaut_id) VALUES(?)').run(astronautId).lastInsertRowid
	);

	return { profileId, astronautId };
}

function request(values: Record<string, string>): Request {
	const form = new FormData();
	for (const [key, value] of Object.entries(values)) form.set(key, value);

	return new Request('http://localhost/measurements/cardiovascular', {
		method: 'POST',
		body: form
	});
}

function readings(astronautId: string): { metric_code: string; value: number | null }[] {
	return db
		.prepare('SELECT metric_code, value FROM measurements WHERE astronaut_id = ? ORDER BY id')
		.all(astronautId) as unknown as { metric_code: string; value: number | null }[];
}

describe('cardiovascular detail action', () => {
	beforeEach(() => {
		db.exec(
			'DELETE FROM measurement_components; DELETE FROM measurements; DELETE FROM crew_profiles; DELETE FROM astronauts;'
		);
	});

	it('registers the metric owned by the page', async () => {
		const { profileId, astronautId } = createProfile();
		const result = await createRegisterAction('spo2')({
			params: { id: String(profileId) },
			request: request({ metric_code: 'spo2', spo2: '98' })
		});

		expect(result).toMatchObject({ success: true, warning: null });
		expect(readings(astronautId)).toEqual([{ metric_code: 'spo2', value: 98 }]);
	});

	it('rejects a different metric than the one owning the page', async () => {
		const { profileId } = createProfile();
		const result = await createRegisterAction('heart_rate')({
			params: { id: String(profileId) },
			request: request({ metric_code: 'spo2', spo2: '98' })
		});

		expect(result).toMatchObject({ status: 400 });
		expect(result).toHaveProperty('data.errors.metric_code');
		expect(db.prepare('SELECT count(*) AS total FROM measurements').get()).toEqual({ total: 0 });
	});

	it('returns field errors without writing', async () => {
		const { profileId } = createProfile();
		const result = await createRegisterAction('blood_pressure')({
			params: { id: String(profileId) },
			request: request({ metric_code: 'blood_pressure', systolic: '70', diastolic: '80' })
		});

		expect(result).toMatchObject({ status: 400 });
		expect(result).toHaveProperty('data.errors.systolic');
		expect(db.prepare('SELECT count(*) AS total FROM measurements').get()).toEqual({ total: 0 });
	});

	it('rejects unknown profiles', async () => {
		await expect(
			createRegisterAction('heart_rate')({
				params: { id: '999999' },
				request: request({ metric_code: 'heart_rate', heart_rate: '72' })
			})
		).rejects.toMatchObject({ status: 404 });
	});
});

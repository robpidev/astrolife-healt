import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { createBodyTemperatureReading, listBodyTemperatureReadings, parseBodyTemperature } =
	await import('#lib/server/body-temperature.js');
const { getDb } = await import('#lib/server/db.js');

beforeAll(() => {
	const db = getDb();
	db.prepare('INSERT OR IGNORE INTO astronauts(id,full_name) VALUES(?,?)').run(
		'temp-user-a',
		'Temp A'
	);
	db.prepare('INSERT OR IGNORE INTO astronauts(id,full_name) VALUES(?,?)').run(
		'temp-user-b',
		'Temp B'
	);
	db.prepare('INSERT OR IGNORE INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(
		901,
		'temp-user-a'
	);
	db.prepare('INSERT OR IGNORE INTO crew_profiles(id,astronaut_id) VALUES(?,?)').run(
		902,
		'temp-user-b'
	);
});

describe('temperature input validation', () => {
	it('accepts valid Celsius values with decimal point or comma', () => {
		expect(parseBodyTemperature('36.5')).toBe(36.5);
		expect(parseBodyTemperature('37,2')).toBe(37.2);
		expect(parseBodyTemperature('38')).toBe(38);
	});

	it('rejects invalid and out-of-range inputs', () => {
		for (const input of ['NaN', '35.55', '29.9', '45.1', '36abc', '', '0', '36.5.1']) {
			expect(parseBodyTemperature(input)).toBeNull();
		}
		expect(parseBodyTemperature(null)).toBeNull();
	});
});

describe('temperature persistence', () => {
	it('stores actual readings under the selected crew profile', () => {
		expect(createBodyTemperatureReading(901, 36.6)).toBe(true);
		expect(createBodyTemperatureReading(902, 38.2)).toBe(true);
		const readings = listBodyTemperatureReadings(901);
		expect(readings[0]).toMatchObject({ value: 36.6 });
		expect(listBodyTemperatureReadings(902)[0]?.value).toBe(38.2);
		expect(readings.some((reading) => reading.value === 38.2)).toBe(false);
		expect(
			getDb()
				.prepare('SELECT source,metric_code FROM measurements WHERE id = ?')
				.get(readings[0].id)
		).toMatchObject({ source: 'manual', metric_code: 'body_temperature' });
	});

	it('does not store readings for invalid profiles or values', () => {
		expect(createBodyTemperatureReading(0, 36)).toBe(false);
		expect(createBodyTemperatureReading(9999, 36)).toBe(false);
		expect(createBodyTemperatureReading(901, Number.NaN)).toBe(false);
		expect(createBodyTemperatureReading(901, 100)).toBe(false);
	});
});

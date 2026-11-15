import { randomUUID } from 'node:crypto';
import { getDb } from '#lib/server/db.js';

export interface BodyTemperatureReading {
	id: string;
	value: number;
	measured_at: string;
	source: 'manual' | 'sensor';
}

/** Readings belong to the real astronaut linked to the current crew profile. */
export function listBodyTemperatureReadings(profileId: number): BodyTemperatureReading[] {
	return getDb()
		.prepare(
			`SELECT m.id, m.value, m.measured_at, m.source
			 FROM measurements m
			 JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
			 WHERE p.id = ? AND m.metric_code = 'body_temperature' AND m.value IS NOT NULL
			   AND m.source IN ('manual', 'sensor')
			 ORDER BY m.measured_at DESC, m.rowid DESC
			 LIMIT 90`
		)
		.all(profileId) as unknown as BodyTemperatureReading[];
}

/** The input is a temperature in Celsius, never a simulated sensor reading. */
export function parseBodyTemperature(raw: FormDataEntryValue | null): number | null {
	if (typeof raw !== 'string') return null;
	const normalized = raw.trim().replace(',', '.');
	if (!/^\d{2}(?:\.\d)?$/.test(normalized)) return null;
	const value = Number(normalized);
	return Number.isFinite(value) && value >= 30 && value <= 45 ? value : null;
}

export function createBodyTemperatureReading(profileId: number, value: number): boolean {
	if (
		!Number.isInteger(profileId) ||
		profileId <= 0 ||
		!Number.isFinite(value) ||
		value < 30 ||
		value > 45
	) {
		return false;
	}

	const result = getDb()
		.prepare(
			`INSERT INTO measurements (id, astronaut_id, metric_code, value, measured_at, source)
			 SELECT ?, p.astronaut_id, 'body_temperature', ?, ?, 'manual'
			 FROM crew_profiles p WHERE p.id = ?`
		)
		.run(randomUUID(), value, new Date().toISOString(), profileId);
	return Number(result.changes) === 1;
}

import { getDb } from '#lib/server/db.js';

export interface ReferenceReading {
	value: number | null;
	systolic: number | null;
	diastolic: number | null;
	measured_at: string;
	source: 'manual' | 'sensor';
}

export interface LatestHealthReadings {
	bloodPressure: ReferenceReading | null;
	heartRate: ReferenceReading | null;
	fastingGlucose: ReferenceReading | null;
	sleepDuration: ReferenceReading | null;
}

interface ReadingRow {
	id: string;
	value: number | null;
	measured_at: string;
	source: 'manual' | 'sensor';
}

/**
 * Latest *recorded* astronaut-linked health measurements only.
 * Never use the global personal log, demo values or simulated telemetry.
 * Glucose requires a fasting-specific metric code; random glucose cannot be
 * evaluated against fasting screening ranges.
 */
export function getLatestHealthReadings(profileId: number): LatestHealthReadings {
	const db = getDb();
	const latest = db.prepare(`
		SELECT m.id, m.value, m.measured_at, m.source
		FROM measurements m
		JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
		WHERE p.id = ? AND m.metric_code = ? AND m.source IN ('manual', 'sensor')
		AND (m.metric_code = 'blood_pressure' OR m.value IS NOT NULL)
		ORDER BY m.measured_at DESC, m.rowid DESC LIMIT 1
	`);

	function read(code: string): ReferenceReading | null {
		const row = latest.get(profileId, code) as ReadingRow | undefined;
		if (!row) return null;
		return {
			value: row.value,
			systolic: null,
			diastolic: null,
			measured_at: row.measured_at,
			source: row.source
		};
	}

	const pressure = read('blood_pressure');
	if (pressure) {
		const parts = db
			.prepare(
				`SELECT component_code, value
				 FROM measurement_components
				 WHERE measurement_id = (
					SELECT m.id FROM measurements m
					JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
					WHERE p.id = ? AND m.metric_code = 'blood_pressure'
					AND m.source IN ('manual', 'sensor')
					ORDER BY m.measured_at DESC, m.rowid DESC LIMIT 1
				)`
			)
			.all(profileId) as { component_code: string; value: number }[];
		pressure.systolic = parts.find((part) => part.component_code === 'systolic')?.value ?? null;
		pressure.diastolic = parts.find((part) => part.component_code === 'diastolic')?.value ?? null;
	}

	return {
		bloodPressure: pressure,
		heartRate: read('heart_rate'),
		fastingGlucose: read('fasting_glucose'),
		sleepDuration: read('sleep_duration')
	};
}

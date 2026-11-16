import { randomUUID } from 'node:crypto';
import { radiationMetricCodes } from '#lib/data/radiation.js';
import type {
	RadiationEnvironment,
	RadiationProfile,
	RadiationSummary
} from '#lib/interfaces/radiation.js';
import { getDb } from '#lib/server/db.js';
import {
	buildRadiationSummary,
	isRadiationOrgan,
	type OrganReading,
	type RadiationInput,
	type RadiationReading
} from '#lib/utils/radiation.js';

interface ProfileRow {
	environment: RadiationEnvironment | null;
	habitat_shielding: string | null;
	spe_alert_active: number;
	spe_alert_started_at: string | null;
	updated_at: string | null;
}

interface ValueRow {
	value: number;
	measured_at: string;
}

interface OrganRow extends ValueRow {
	organ: string | null;
}

function astronautIdFor(profileId: number): string | null {
	const row = getDb()
		.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?')
		.get(profileId) as unknown as { astronaut_id: string } | undefined;
	return row?.astronaut_id ?? null;
}

function emptyProfile(): RadiationProfile {
	return {
		environment: null,
		habitat_shielding: null,
		spe_alert_active: false,
		spe_alert_started_at: null,
		updated_at: null
	};
}

function readProfile(astronautId: string): RadiationProfile {
	const row = getDb()
		.prepare(
			`SELECT environment, habitat_shielding, spe_alert_active, spe_alert_started_at, updated_at
			 FROM crew_radiation_profiles WHERE astronaut_id = ?`
		)
		.get(astronautId) as unknown as ProfileRow | undefined;

	if (!row) return emptyProfile();

	return {
		environment: row.environment,
		habitat_shielding: row.habitat_shielding,
		spe_alert_active: row.spe_alert_active === 1,
		spe_alert_started_at: row.spe_alert_started_at,
		updated_at: row.updated_at
	};
}

function intervalReadings(astronautId: string): RadiationReading[] {
	const rows = getDb()
		.prepare(
			`SELECT value, measured_at FROM measurements
			 WHERE astronaut_id = ? AND metric_code = ? AND value IS NOT NULL
			 ORDER BY measured_at ASC`
		)
		.all(astronautId, radiationMetricCodes.interval) as unknown as ValueRow[];

	return rows.map((row) => ({ value: row.value, measured_at: row.measured_at }));
}

/**
 * Organ readings store the organ in `measurement_components`, because one row
 * can carry several organs from the same dosimetry snapshot.
 */
function organReadings(astronautId: string): OrganReading[] {
	const rows = getDb()
		.prepare(
			`SELECT mc.component_code AS organ, mc.value AS value, m.measured_at AS measured_at
			 FROM measurements m
			 JOIN measurement_components mc ON mc.measurement_id = m.id
			 WHERE m.astronaut_id = ? AND m.metric_code = ?
			 ORDER BY m.measured_at ASC`
		)
		.all(astronautId, radiationMetricCodes.organ) as unknown as OrganRow[];

	const readings: OrganReading[] = [];
	for (const row of rows) {
		// Unknown organ codes came from another composite metric; skip them
		// instead of counting them towards every limit.
		if (!row.organ || !isRadiationOrgan(row.organ)) continue;
		readings.push({ organ: row.organ, value: row.value, measured_at: row.measured_at });
	}

	return readings;
}

function speReadings(astronautId: string): RadiationReading[] {
	const rows = getDb()
		.prepare(
			`SELECT value, measured_at FROM measurements
			 WHERE astronaut_id = ? AND metric_code = ? AND value IS NOT NULL
			 ORDER BY measured_at ASC`
		)
		.all(astronautId, radiationMetricCodes.speEvent) as unknown as ValueRow[];

	return rows.map((row) => ({ value: row.value, measured_at: row.measured_at }));
}

function inputFor(astronautId: string, profile: RadiationProfile): RadiationInput {
	return {
		intervals: intervalReadings(astronautId),
		organs: organReadings(astronautId),
		speEvents: speReadings(astronautId),
		environment: profile.environment ?? 'space',
		environmentSet: profile.environment !== null,
		speAlertActive: profile.spe_alert_active,
		profile
	};
}

/** Every radiation guideline assessed against the logged readings. */
export function getRadiationSummary(profileId: number): RadiationSummary | null {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return null;

	const profile = readProfile(astronautId);

	return buildRadiationSummary({ ...inputFor(astronautId, profile), profile });
}

function ensureProfile(astronautId: string): void {
	getDb()
		.prepare(
			`INSERT INTO crew_radiation_profiles(astronaut_id)
			 VALUES(?)
			 ON CONFLICT(astronaut_id) DO NOTHING`
		)
		.run(astronautId);
}

export function saveRadiationEnvironment(
	profileId: number,
	environment: RadiationEnvironment | null,
	shielding: string | null
): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	ensureProfile(astronautId);
	getDb()
		.prepare(
			`UPDATE crew_radiation_profiles
			 SET environment = ?, habitat_shielding = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE astronaut_id = ?`
		)
		.run(environment, shielding, astronautId);

	return true;
}

/**
 * Opening the alert also opens a new event row, so each event sums from its own
 * start instead of mixing with the previous one.
 */
export function startSpeAlert(
	profileId: number,
	startedAt: string
): 'started' | 'already-open' | 'missing' {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return 'missing';

	const db = getDb();
	ensureProfile(astronautId);

	// A double submit must not open a second event: that would reset the
	// per-event total while the earlier segments still count towards the career.
	if (readProfile(astronautId).spe_alert_active) return 'already-open';

	db.exec('BEGIN IMMEDIATE');
	try {
		db.prepare(
			`UPDATE crew_radiation_profiles
			 SET spe_alert_active = 1, spe_alert_started_at = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE astronaut_id = ?`
		).run(startedAt, astronautId);
		db.prepare(
			`INSERT INTO measurements(id, astronaut_id, metric_code, value, measured_at, source, notes)
			 VALUES(?,?,?,?,?,?,?)`
		).run(
			randomUUID(),
			astronautId,
			radiationMetricCodes.speEvent,
			0,
			startedAt,
			'manual',
			'spe-open'
		);
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return 'started';
}

/**
 * Closing the alert keeps the accumulated event dose in the career total; the
 * `spe-closed` note marks it as history.
 */
export function closeSpeAlert(profileId: number): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	const db = getDb();
	const row = readProfile(astronautId);
	if (!row.spe_alert_active) return false;

	db.exec('BEGIN IMMEDIATE');
	try {
		db.prepare(
			`UPDATE crew_radiation_profiles
			 SET spe_alert_active = 0, spe_alert_started_at = NULL, updated_at = CURRENT_TIMESTAMP
			 WHERE astronaut_id = ?`
		).run(astronautId);
		db.prepare(
			`UPDATE measurements SET notes = 'spe-closed'
			 WHERE astronaut_id = ? AND metric_code = ? AND notes = 'spe-open'
			   AND measured_at = ?`
		).run(astronautId, radiationMetricCodes.speEvent, row.spe_alert_started_at);
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return true;
}

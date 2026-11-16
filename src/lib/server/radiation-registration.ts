import { randomUUID } from 'node:crypto';
import { radiationMetricCodes, radiationOrganLabels } from '#lib/data/radiation.js';
import type { RadiationEnvironment, RadiationOrgan } from '#lib/interfaces/radiation.js';
import { getDb } from '#lib/server/db.js';
import { isRadiationEnvironment, isRadiationOrgan } from '#lib/utils/radiation.js';

export type RadiationEntryKind = 'environment' | 'organ' | 'spe';

export interface RadiationFormValues {
	kind: string;
	environment: string;
	shielding: string;
	organ: string;
	value: string;
}

export type RadiationFormErrors = Partial<Record<keyof RadiationFormValues | 'kind', string>>;

export interface RadiationEntryData {
	kind: RadiationEntryKind;
	environment: RadiationEnvironment | null;
	shielding: string | null;
	organ: RadiationOrgan | null;
	value: number | null;
}

export interface ParsedRadiationForm {
	values: RadiationFormValues;
	errors: RadiationFormErrors;
	data: RadiationEntryData | null;
}

const MAX_SHIELDING = 120;
const ORGAN_MAX = 5000;
const SPE_MAX = 1000;

function readForm(form: FormData): RadiationFormValues {
	return {
		kind: String(form.get('kind') ?? '').trim(),
		environment: String(form.get('environment') ?? '').trim(),
		shielding: String(form.get('shielding') ?? '').trim(),
		organ: String(form.get('organ') ?? '').trim(),
		value: String(form.get('value') ?? '').trim()
	};
}

/** Same comma/point tolerance as the other numeric forms, and never NaN. */
function parseNumber(raw: string): number | null {
	const value = Number(raw.replace(',', '.'));
	return raw === '' || !Number.isFinite(value) ? null : value;
}

export function parseRadiationForm(form: FormData): ParsedRadiationForm {
	const values = readForm(form);
	const errors: RadiationFormErrors = {};

	if (values.kind === 'environment') {
		if (!isRadiationEnvironment(values.environment)) {
			errors.environment = 'Choose the habitat the crew member is exposed in.';
		}
		if (values.shielding.length > MAX_SHIELDING) {
			errors.shielding = `Keep the shielding description under ${MAX_SHIELDING} characters.`;
		}

		if (Object.keys(errors).length) return { values, errors, data: null };

		return {
			values,
			errors,
			data: {
				kind: 'environment',
				environment: values.environment as RadiationEnvironment,
				shielding: values.shielding || null,
				organ: null,
				value: null
			}
		};
	}

	if (values.kind === 'organ') {
		if (!isRadiationOrgan(values.organ)) {
			errors.organ = 'Choose a monitored organ.';
		}

		const value = parseNumber(values.value);
		if (value === null || value < 0 || value > ORGAN_MAX) {
			errors.value = `Enter an organ dose between 0 and ${ORGAN_MAX} mGy-Eq.`;
		}

		if (Object.keys(errors).length) return { values, errors, data: null };

		return {
			values,
			errors,
			data: {
				kind: 'organ',
				environment: null,
				shielding: null,
				organ: values.organ as RadiationOrgan,
				value
			}
		};
	}

	if (values.kind === 'spe') {
		const value = parseNumber(values.value);
		if (value === null || value <= 0 || value > SPE_MAX) {
			errors.value = `Enter the effective dose of this segment above 0 and at most ${SPE_MAX} mSv.`;
		}

		if (Object.keys(errors).length) return { values, errors, data: null };

		return {
			values,
			errors,
			data: { kind: 'spe', environment: null, shielding: null, organ: null, value }
		};
	}

	return { values, errors: { kind: 'Choose an entry type.' }, data: null };
}

function astronautIdFor(profileId: number): string | null {
	const row = getDb()
		.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?')
		.get(profileId) as unknown as { astronaut_id: string } | undefined;
	return row?.astronaut_id ?? null;
}

/** Label shown in the history row, so the organ is readable without a join. */
export function organLabel(organ: RadiationOrgan): string {
	return radiationOrganLabels[organ];
}

/**
 * Writes a manual organ dose. The organ rides in `measurement_components`,
 * the same mechanism blood pressure uses, so one snapshot can carry several
 * organs without adding a column to `measurements`.
 */
export function registerOrganDose(
	profileId: number,
	organ: RadiationOrgan,
	value: number
): boolean {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return false;

	const db = getDb();
	const measurementId = randomUUID();
	const measuredAt = new Date().toISOString();

	db.exec('BEGIN IMMEDIATE');
	try {
		db.prepare(
			`INSERT INTO measurements(id, astronaut_id, metric_code, value, measured_at, source)
			 VALUES(?,?,?,?,?,'manual')`
		).run(measurementId, astronautId, radiationMetricCodes.organ, value, measuredAt);
		db.prepare(
			`INSERT INTO measurement_components(measurement_id, component_code, value, unit)
			 VALUES(?,?,?,?)`
		).run(measurementId, organ, value, organ === 'cns' ? 'mGy' : 'mGy-Eq');
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return true;
}

/**
 * Adds one segment to the open solar particle event. Segments are timestamped
 * apart so the event total is the sum of everything inside the alert.
 */
export function registerSpeSegment(
	profileId: number,
	value: number
): 'saved' | 'no-alert' | 'missing' {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return 'missing';

	const profile = getDb()
		.prepare('SELECT spe_alert_active FROM crew_radiation_profiles WHERE astronaut_id = ?')
		.get(astronautId) as unknown as { spe_alert_active: number } | undefined;

	if (!profile || profile.spe_alert_active !== 1) return 'no-alert';

	// A segment is only meaningful inside an event, and the event is delimited by
	// its zero-value opening row. Without it the segment would be dropped by the
	// event grouping, so refuse instead of writing an orphan.
	const opening = getDb()
		.prepare(
			`SELECT 1 FROM measurements
			 WHERE astronaut_id = ? AND metric_code = ? AND notes = 'spe-open' LIMIT 1`
		)
		.get(astronautId, radiationMetricCodes.speEvent);

	if (!opening) return 'no-alert';

	getDb()
		.prepare(
			`INSERT INTO measurements(id, astronaut_id, metric_code, value, measured_at, source, notes)
			 VALUES(?,?,?,?,?,'manual','spe-segment')`
		)
		.run(randomUUID(), astronautId, radiationMetricCodes.speEvent, value, new Date().toISOString());

	return 'saved';
}

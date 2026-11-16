import { beforeEach, describe, expect, it } from 'vitest';
import type { RadiationOrgan } from '#lib/interfaces/radiation.js';

process.env.DATABASE_PATH = ':memory:';

const { getDb } = await import('#lib/server/db.js');
const { closeSpeAlert, getRadiationSummary, saveRadiationEnvironment, startSpeAlert } =
	await import('#lib/server/radiation.js');
const { parseRadiationForm, registerOrganDose, registerSpeSegment } =
	await import('#lib/server/radiation-registration.js');
const { getOrganReadings } = await import('#lib/server/health-metrics.js');

const db = getDb();

function reset(): void {
	db.exec(`
		DELETE FROM crew_radiation_profiles;
		DELETE FROM measurement_components;
		DELETE FROM measurements;
		DELETE FROM crew_profiles;
		DELETE FROM astronauts;
	`);
	db.prepare("INSERT INTO astronauts(id, full_name) VALUES('a1', 'Test Astronaut')").run();
	db.prepare("INSERT INTO astronauts(id, full_name) VALUES('a2', 'Other Astronaut')").run();
	db.prepare("INSERT INTO crew_profiles(id, astronaut_id) VALUES(10, 'a1')").run();
	db.prepare("INSERT INTO crew_profiles(id, astronaut_id) VALUES(20, 'a2')").run();
}

function insertInterval(astronautId: string, value: number, measuredAt: string): void {
	db.prepare(
		`INSERT INTO measurements(id, astronaut_id, metric_code, value, measured_at, source)
		 VALUES(?,?,?,?,?,'simulated')`
	).run(
		`interval-${astronautId}-${measuredAt}`,
		astronautId,
		'radiation_interval',
		value,
		measuredAt
	);
}

function form(entries: Record<string, string>): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.set(key, value);
	return data;
}

describe('radiation persistence', () => {
	beforeEach(reset);

	it('accounts every guideline for an astronaut without readings', () => {
		const summary = getRadiationSummary(10);

		expect(summary?.environment_set).toBe(false);
		expect(summary?.assessments).toHaveLength(7);
		expect(summary?.overall).toBe('unknown');
	});

	it('returns null for an unknown profile', () => {
		expect(getRadiationSummary(99)).toBeNull();
	});

	it('saves the habitat and evaluates GCR with its tighter limit', () => {
		insertInterval('a1', 1.1, new Date().toISOString());

		expect(saveRadiationEnvironment(10, 'space', '10 g/cm² aluminium')).toBe(true);
		expect(getRadiationSummary(10)?.profile).toMatchObject({
			environment: 'space',
			habitat_shielding: '10 g/cm² aluminium'
		});

		expect(saveRadiationEnvironment(10, 'planetary_surface', null)).toBe(true);
		const surface = getRadiationSummary(10)?.assessments.find(
			(item) => item.guideline.id === 'gcr'
		);

		expect(surface).toMatchObject({ applied_limit: 0.9, status: 'red' });
		expect(getRadiationSummary(10)?.overall).toBe('red');
	});

	it('evaluates GCR once a habitat is saved', () => {
		insertInterval('a1', 0.5, new Date().toISOString());

		// Regression: the summary used to hardcode `environmentSet: false`, so
		// a saved habitat never reached the evaluator.
		expect(
			getRadiationSummary(10)?.assessments.find((item) => item.guideline.id === 'gcr')
		).toMatchObject({ status: 'unknown' });

		expect(saveRadiationEnvironment(10, 'space', null)).toBe(true);

		const gcr = getRadiationSummary(10)?.assessments.find((item) => item.guideline.id === 'gcr');
		expect(gcr).toMatchObject({ status: 'green', measured: 0.5, applied_limit: 1.3 });
		expect(getRadiationSummary(10)?.environment_set).toBe(true);
	});

	it('sums SPE segments into one event and keeps them after closing', () => {
		expect(startSpeAlert(10, '2026-11-15T08:00:00.000Z')).toBe('started');
		expect(startSpeAlert(20, '2026-11-15T09:00:00.000Z')).toBe('started');
		// A double submit must not reset the per-event total.
		expect(startSpeAlert(10, '2026-11-15T08:05:00.000Z')).toBe('already-open');

		expect(registerSpeSegment(10, 120)).toBe('saved');
		expect(registerSpeSegment(10, 60)).toBe('saved');
		expect(registerSpeSegment(20, 999)).toBe('saved');

		const open = getRadiationSummary(10)?.assessments.find((item) => item.guideline.id === 'spe');
		expect(open).toMatchObject({ measured: 180, status: 'green' });

		// The other astronaut's event never leaks into this profile.
		expect(open?.reading_count).toBe(2);

		expect(closeSpeAlert(10)).toBe(true);
		expect(getRadiationSummary(10)?.profile.spe_alert_active).toBe(false);

		// A closed event stays in the career total.
		const career = getRadiationSummary(10)?.assessments.find(
			(item) => item.guideline.id === 'career'
		);
		expect(career?.measured).toBe(180);
	});

	it('refuses a segment when no event is open', () => {
		expect(registerSpeSegment(10, 50)).toBe('no-alert');
		expect(closeSpeAlert(10)).toBe(false);
	});

	it('refuses a segment when the opening row is missing', () => {
		expect(startSpeAlert(10, '2026-11-15T08:00:00.000Z')).toBe('started');
		db.prepare("DELETE FROM measurements WHERE astronaut_id = 'a1' AND notes = 'spe-open'").run();

		// The alert flag alone is not enough: without the boundary row the
		// segment would be dropped by the event grouping.
		expect(registerSpeSegment(10, 50)).toBe('no-alert');
	});

	it('lists organ readings with their organ code', () => {
		expect(registerOrganDose(10, 'lens', 250)).toBe(true);
		expect(registerOrganDose(10, 'cns', 40)).toBe(true);

		const readings = getOrganReadings(10);
		expect(readings).toHaveLength(2);
		expect(readings.map((reading) => reading.detail).sort()).toEqual(['cns', 'lens']);
		expect(getOrganReadings(20)).toEqual([]);
	});

	it('stores each organ dose as its own component row', () => {
		expect(registerOrganDose(10, 'lens', 250)).toBe(true);
		expect(registerOrganDose(10, 'skin', 400)).toBe(true);

		const components = db
			.prepare(
				`SELECT count(*) AS total FROM measurement_components
				 WHERE measurement_id IN (SELECT id FROM measurements WHERE astronaut_id = 'a1')`
			)
			.get() as unknown as { total: number };
		expect(components.total).toBe(2);

		const summary = getRadiationSummary(10);
		const lens = summary?.assessments.find((item) => item.guideline.id === 'lens');
		const skin = summary?.assessments.find((item) => item.guideline.id === 'skin');

		expect(lens).toMatchObject({ measured: 250, status: 'green' });
		expect(skin).toMatchObject({ measured: 400, status: 'green' });

		// Writes must never cross into another astronaut.
		expect(getRadiationSummary(20)?.assessments[0].measured).toBeNull();
	});

	it('rejects an unknown organ instead of counting it everywhere', () => {
		db.prepare(
			`INSERT INTO measurements(id, astronaut_id, metric_code, value, measured_at, source)
			 VALUES('stray','a1','radiation_organ',500,?,'manual')`
		).run(new Date().toISOString());
		db.prepare(
			`INSERT INTO measurement_components(measurement_id, component_code, value, unit)
			 VALUES('stray','systolic',500,'mGy-Eq')`
		).run();

		const summary = getRadiationSummary(10);
		expect(
			summary?.assessments
				.filter((item) => item.guideline.organ !== null)
				.every((item) => item.measured === null)
		).toBe(true);
	});
});

describe('radiation form parsing', () => {
	it('accepts a comma decimal separator', () => {
		const parsed = parseRadiationForm(form({ kind: 'organ', organ: 'lens', value: '12,5' }));

		expect(parsed.errors).toEqual({});
		expect(parsed.data?.organ).toBe('lens' satisfies RadiationOrgan);
		expect(parsed.data?.value).toBe(12.5);
	});

	it('rejects an out-of-range organ dose', () => {
		const parsed = parseRadiationForm(form({ kind: 'organ', organ: 'skin', value: '9000' }));

		expect(parsed.data).toBeNull();
		expect(parsed.errors.value).toContain('between 0 and 5000');
	});

	it('requires a valid habitat', () => {
		const parsed = parseRadiationForm(form({ kind: 'environment', environment: 'moon' }));

		expect(parsed.data).toBeNull();
		expect(parsed.errors.environment).toBeDefined();
	});

	it('rejects an empty SPE segment', () => {
		const parsed = parseRadiationForm(form({ kind: 'spe', value: '0' }));

		expect(parsed.data).toBeNull();
		expect(parsed.errors.value).toBeDefined();
	});

	it('rejects an unknown entry kind', () => {
		const parsed = parseRadiationForm(form({ kind: 'whatever' }));

		expect(parsed.data).toBeNull();
		expect(parsed.errors.kind).toBeDefined();
	});
});

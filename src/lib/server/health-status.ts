import type { StatementSync } from 'node:sqlite';
import {
	assessHealthIndicator,
	type HealthIndicatorId,
	type HealthSeverity,
	type ReadingAssessment
} from '#lib/utils/health-assessment.js';
import { getDb } from '#lib/server/db.js';

export interface LatestReading {
	reading_id: string;
	indicator: HealthIndicatorId;
	metric_code: string;
	value: number | null;
	systolic: number | null;
	diastolic: number | null;
	display: string;
	unit: string;
	measured_at: string;
	source: string;
	assessment: ReadingAssessment;
}

export interface AstronautHealthStatus {
	overall: HealthSeverity;
	readings: LatestReading[];
	counts: { green: number; yellow: number; red: number };
	lastUpdate: string | null;
}

interface IndicatorDefinition {
	id: HealthIndicatorId;
	metric: string;
	unit: string;
	decimals: number;
}

interface ReadingRow {
	id: string;
	metric_code: string;
	value: number | null;
	measured_at: string;
	source: string;
}

interface ComponentRow {
	component_code: string;
	value: number;
}

const INDICATORS: readonly IndicatorDefinition[] = [
	{ id: 'heart-rate', metric: 'heart_rate', unit: 'bpm', decimals: 0 },
	{ id: 'blood-pressure', metric: 'blood_pressure', unit: 'mmHg', decimals: 0 },
	{ id: 'spo2', metric: 'spo2', unit: '%', decimals: 0 },
	{ id: 'temperature', metric: 'body_temperature', unit: '°C', decimals: 1 },
	{ id: 'blood-glucose', metric: 'fasting_glucose', unit: 'mg/dL', decimals: 0 },
	{ id: 'sleep', metric: 'sleep_duration', unit: 'h', decimals: 1 },
	{ id: 'respiratory-rate', metric: 'respiratory_rate', unit: 'breaths/min', decimals: 0 }
];

let statements: {
	latest: StatementSync;
	components: StatementSync;
} | null = null;

function getStatements() {
	if (statements) return statements;

	const db = getDb();
	statements = {
		latest: db.prepare(`SELECT m.id, m.metric_code, m.value, m.measured_at, m.source
			FROM measurements m
			JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
			WHERE p.id = ? AND m.metric_code = ? AND m.source IN ('manual', 'sensor', 'simulated')
			ORDER BY m.measured_at DESC, m.rowid DESC
			LIMIT 1`),
		components: db.prepare(
			'SELECT component_code, value FROM measurement_components WHERE measurement_id = ?'
		)
	};

	return statements;
}

function formatValue(value: number, decimals: number): string {
	return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

function severityFor(
	value: number | null,
	systolic: number | null,
	diastolic: number | null,
	indicator: HealthIndicatorId
) {
	return assessHealthIndicator(indicator, value, systolic, diastolic);
}

function readIndicator(profileId: number, indicator: IndicatorDefinition): LatestReading | null {
	const row = getStatements().latest.get(profileId, indicator.metric) as unknown as
		ReadingRow | undefined;
	if (!row) return null;

	let systolic: number | null = null;
	let diastolic: number | null = null;

	if (indicator.metric === 'blood_pressure') {
		const parts = getStatements().components.all(row.id) as unknown as ComponentRow[];
		systolic = parts.find((part) => part.component_code === 'systolic')?.value ?? null;
		diastolic = parts.find((part) => part.component_code === 'diastolic')?.value ?? null;
	}

	const assessment = severityFor(row.value, systolic, diastolic, indicator.id);

	const display =
		indicator.metric === 'blood_pressure'
			? systolic !== null && diastolic !== null
				? `${formatValue(systolic, 0)}/${formatValue(diastolic, 0)}`
				: 'No complete reading'
			: row.value === null
				? 'No recorded data'
				: formatValue(row.value, indicator.decimals);

	return {
		reading_id: row.id,
		indicator: indicator.id,
		metric_code: row.metric_code,
		value: row.value,
		systolic,
		diastolic,
		display,
		unit: indicator.unit,
		measured_at: row.measured_at,
		source: row.source,
		assessment
	};
}

/** Latest real reading per monitored indicator; unknown indicators are omitted. */
export function getAstronautHealthStatus(profileId: number): AstronautHealthStatus {
	const readings = INDICATORS.map((indicator) => readIndicator(profileId, indicator)).filter(
		(reading): reading is LatestReading => reading !== null
	);

	const counts = { green: 0, yellow: 0, red: 0 };
	for (const reading of readings) {
		if (reading.assessment.severity === 'green') counts.green += 1;
		if (reading.assessment.severity === 'yellow') counts.yellow += 1;
		if (reading.assessment.severity === 'red') counts.red += 1;
	}

	const overall: HealthSeverity =
		counts.red > 0 ? 'red' : counts.yellow > 0 ? 'yellow' : counts.green > 0 ? 'green' : 'unknown';

	const lastUpdate =
		readings.length === 0
			? null
			: readings.reduce(
					(latest, reading) => (reading.measured_at > latest ? reading.measured_at : latest),
					readings[0].measured_at
				);

	return { overall, readings, counts, lastUpdate };
}

export function getKeyVitals(status: AstronautHealthStatus): LatestReading[] {
	const preferred: HealthIndicatorId[] = ['heart-rate', 'blood-pressure', 'spo2', 'temperature'];
	return preferred
		.map((indicator) => status.readings.find((reading) => reading.indicator === indicator))
		.filter((reading): reading is LatestReading => reading !== undefined);
}

export interface CrewHealthOverview {
	green: number;
	yellow: number;
	red: number;
	unknown: number;
	overall: HealthSeverity;
	byAstronaut: Record<number, HealthSeverity>;
}

/** One query per profile keeps the dashboard honest without duplicating thresholds. */
export function getCrewHealthOverview(): CrewHealthOverview {
	const profiles = getDb().prepare('SELECT id FROM crew_profiles ORDER BY id').all() as unknown as {
		id: number;
	}[];

	const overview: CrewHealthOverview = {
		green: 0,
		yellow: 0,
		red: 0,
		unknown: 0,
		overall: 'unknown',
		byAstronaut: {}
	};

	for (const profile of profiles) {
		const severity = getAstronautHealthStatus(profile.id).overall;
		overview.byAstronaut[profile.id] = severity;
		overview[severity] += 1;
		if (severity === 'red') overview.overall = 'red';
		else if (severity === 'yellow' && overview.overall !== 'red') overview.overall = 'yellow';
		else if (severity === 'green' && overview.overall === 'unknown') overview.overall = 'green';
	}

	return overview;
}

import type { StatementSync } from 'node:sqlite';
import { healthAreas } from '#lib/data/healthAreas.js';
import { radiationMetricCodes } from '#lib/data/radiation.js';
import type {
	HealthAreaId,
	HealthMetric,
	MetricReading,
	MetricSnapshot
} from '#lib/interfaces/health-area.js';
import type { HealthIndicatorId } from '#lib/utils/health-assessment.js';
import { getDb } from '#lib/server/db.js';

/** Cards only need the shape of the recent trend, not the full history. */
const SERIES_LIMIT = 12;

interface ReadingRow {
	measured_at: string;
	value: number;
}

interface LatestRow {
	id: string;
	measured_at: string;
	value: number | null;
}

interface ComponentRow {
	component_code: string;
	value: number;
}

interface Statements {
	astronautId: StatementSync;
	series: StatementSync;
	latest: StatementSync;
	components: StatementSync;
	componentSeries: StatementSync;
	symptomSeries: StatementSync;
	exerciseSeries: StatementSync;
}

let statements: Statements | null = null;

function getStatements(): Statements {
	if (statements) return statements;

	const db = getDb();

	statements = {
		astronautId: db.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?'),
		series: db.prepare(`SELECT measured_at, value FROM (
				SELECT m.id AS id, m.measured_at AS measured_at, m.value AS value
				FROM measurements m
				WHERE m.astronaut_id = ? AND m.metric_code = ? AND m.value IS NOT NULL
				ORDER BY m.measured_at DESC, m.id DESC
				LIMIT ?
			) ORDER BY measured_at ASC, id ASC`),
		latest: db.prepare(`SELECT m.id AS id, m.measured_at AS measured_at, m.value AS value
			FROM measurements m
			WHERE m.astronaut_id = ? AND m.metric_code = ?
			ORDER BY m.measured_at DESC, m.id DESC
			LIMIT 1`),
		components: db.prepare(
			'SELECT component_code, value FROM measurement_components WHERE measurement_id = ?'
		),
		componentSeries: db.prepare(`SELECT mc.value AS value FROM measurement_components mc
			JOIN measurements m ON m.id = mc.measurement_id
			WHERE m.astronaut_id = ? AND m.metric_code = ? AND mc.component_code = ?
			ORDER BY m.measured_at DESC, m.id DESC
			LIMIT ?`),
		symptomSeries: db.prepare(`SELECT recorded_at AS measured_at, intensity AS value
			FROM symptom_records
			WHERE astronaut_id = ?
			ORDER BY recorded_at DESC, id DESC
			LIMIT ?`),
		exerciseSeries: db.prepare(`SELECT started_at AS measured_at, duration_minutes AS value
			FROM exercise_sessions
			WHERE astronaut_id = ?
			ORDER BY started_at DESC, id DESC
			LIMIT ?`)
	};

	return statements;
}

/** Values are stored in `metric_definitions` units; cards may display another. */
function scaleValue(metric: HealthMetric, value: number): number {
	return value * (metric.unit_scale ?? 1);
}

function formatValue(value: number, decimals?: number): string {
	if (decimals !== undefined) return value.toFixed(decimals);

	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function emptySnapshot(metric: HealthMetric): MetricSnapshot {
	return { metric_id: metric.id, latest: null, display: null, points: [], recorded_at: null };
}

/** Oldest first, so `points.at(-1)` is always the latest reading. */
function toSnapshot(metric: HealthMetric, readings: readonly ReadingRow[]): MetricSnapshot {
	if (readings.length === 0) return emptySnapshot(metric);

	const points = readings.map((reading) => scaleValue(metric, reading.value));
	const latest = points[points.length - 1];

	return {
		metric_id: metric.id,
		latest,
		display: formatValue(latest, metric.decimals),
		points,
		recorded_at: readings[readings.length - 1].measured_at
	};
}

function measurementSnapshot(metric: HealthMetric, astronautId: string): MetricSnapshot {
	const rows = getStatements().series.all(
		astronautId,
		metric.metric_code,
		SERIES_LIMIT
	) as unknown as ReadingRow[];

	return toSnapshot(metric, rows);
}

function bloodPressureSnapshot(metric: HealthMetric, astronautId: string): MetricSnapshot {
	const statementsForQuery = getStatements();
	const latest = statementsForQuery.latest.get(astronautId, metric.metric_code) as unknown as
		LatestRow | undefined;

	if (!latest) return emptySnapshot(metric);

	const components = statementsForQuery.components.all(latest.id) as unknown as ComponentRow[];
	const systolic = components.find((component) => component.component_code === 'systolic');
	const diastolic = components.find((component) => component.component_code === 'diastolic');

	// A complete composite reading drives both the displayed value and the
	// series, so the chart can never show readings the card is not summarizing.
	if (systolic && diastolic) {
		const systolicRows = statementsForQuery.componentSeries.all(
			astronautId,
			metric.metric_code,
			'systolic',
			SERIES_LIMIT
		) as unknown as { value: number }[];

		return {
			metric_id: metric.id,
			latest: scaleValue(metric, systolic.value),
			display: `${formatValue(systolic.value, metric.decimals)}/${formatValue(diastolic.value, metric.decimals)}`,
			points: systolicRows.map((row) => scaleValue(metric, row.value)).reverse(),
			recorded_at: latest.measured_at
		};
	}

	// Older rows may only store the scalar column. Report it without a trend so
	// `display` and `points` cannot disagree.
	const scalar = latest.value === null ? null : scaleValue(metric, latest.value);

	return {
		metric_id: metric.id,
		latest: scalar,
		display: scalar === null ? null : formatValue(scalar, metric.decimals),
		points: [],
		recorded_at: latest.measured_at
	};
}

// Symptoms aggregate every symptom type into one card, so `metric_code` is not
// part of the filter; a per-type metric would need its own source branch.
function symptomSnapshot(metric: HealthMetric, astronautId: string): MetricSnapshot {
	const rows = getStatements().symptomSeries.all(
		astronautId,
		SERIES_LIMIT
	) as unknown as ReadingRow[];

	return toSnapshot(metric, rows.reverse());
}

// Exercise sessions are independent rows without a metric code; the card shows
// session duration, so `metric_code` is informational only.
function exerciseSnapshot(metric: HealthMetric, astronautId: string): MetricSnapshot {
	const rows = getStatements().exerciseSeries.all(
		astronautId,
		SERIES_LIMIT
	) as unknown as ReadingRow[];

	return toSnapshot(metric, rows.reverse());
}

/** Latest reading and recent series for every metric in an area. */
export function getAreaSnapshots(profileId: number, areaId: HealthAreaId): MetricSnapshot[] {
	const area = healthAreas.find((item) => item.id === areaId);
	if (!area) return [];

	const row = getStatements().astronautId.get(profileId) as unknown as
		{ astronaut_id: string } | undefined;
	const astronautId = row?.astronaut_id ?? null;

	// The `as const` literal keeps required props only, so widen the metrics to
	// reach optional fields such as `source`.
	const metrics: readonly HealthMetric[] = area.metrics;

	if (!astronautId) return metrics.map(emptySnapshot);

	return metrics.map((metric) => {
		if (metric.source === 'symptoms') return symptomSnapshot(metric, astronautId);
		if (metric.source === 'exercise') return exerciseSnapshot(metric, astronautId);
		if (metric.metric_code === 'blood_pressure') {
			return bloodPressureSnapshot(metric, astronautId);
		}

		return measurementSnapshot(metric, astronautId);
	});
}

/**
 * Recent series for the requested indicators, keyed by indicator id. The
 * summary reuses the same 12-point window as the area cards.
 */
export function getIndicatorTrends(
	profileId: number,
	indicators: readonly HealthIndicatorId[]
): Record<string, number[]> {
	const wanted = new Set(indicators);
	const trends: Record<string, number[]> = Object.fromEntries(
		indicators.map((indicator) => [indicator, []])
	);

	for (const area of healthAreas) {
		const metrics = area.metrics.filter(
			(metric) =>
				'indicator' in metric && metric.indicator !== undefined && wanted.has(metric.indicator)
		);
		if (metrics.length === 0) continue;

		const snapshots = getAreaSnapshots(profileId, area.id);
		for (const metric of metrics) {
			if (!('indicator' in metric) || metric.indicator === undefined) continue;
			trends[metric.indicator] =
				snapshots.find((snapshot) => snapshot.metric_id === metric.id)?.points ?? [];
		}
	}

	return trends;
}

export interface OrganReadingEntry {
	value: number;
	secondary: null;
	measured_at: string;
	source: string;
	/** Organ code (`lens`, `skin`, `bfo`, `cns`), so the organ page can filter. */
	detail: string;
}

/** Every organ dose for an astronaut, newest first, across all organs. */
export function getOrganReadings(profileId: number, limit = 120): OrganReadingEntry[] {
	const row = getStatements().astronautId.get(profileId) as unknown as
		{ astronaut_id: string } | undefined;
	if (!row?.astronaut_id) return [];

	const capped = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 120;

	const rows = getDb()
		.prepare(
			`SELECT m.measured_at, m.source, mc.component_code AS detail, mc.value AS value
			 FROM measurements m
			 JOIN measurement_components mc ON mc.measurement_id = m.id
			 WHERE m.astronaut_id = ? AND m.metric_code = ?
			 ORDER BY m.measured_at DESC, m.rowid DESC LIMIT ?`
		)
		.all(row.astronaut_id, radiationMetricCodes.organ, capped) as unknown as {
		detail: string;
		value: number;
		measured_at: string;
		source: string;
	}[];

	return rows.map((reading) => ({
		value: reading.value,
		secondary: null,
		measured_at: reading.measured_at,
		source: reading.source,
		detail: reading.detail
	}));
}

export interface SpeReadingEntry {
	value: number;
	measured_at: string;
	source: string;
	/** `spe-open`, `spe-segment` or `spe-closed`; `null` for legacy rows. */
	notes: string | null;
}

/**
 * Every solar particle event row for an astronaut, newest first. The zero-value
 * `spe-open` rows are event boundaries, so the page can tell an event start
 * from a dose segment without re-deriving it.
 */
export function getSpeReadings(profileId: number, limit = 60): SpeReadingEntry[] {
	const row = getStatements().astronautId.get(profileId) as unknown as
		{ astronaut_id: string } | undefined;
	if (!row?.astronaut_id) return [];

	const capped = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 60;

	const rows = getDb()
		.prepare(
			`SELECT value, measured_at, source, notes FROM measurements
			 WHERE astronaut_id = ? AND metric_code = ? AND value IS NOT NULL
			 ORDER BY measured_at DESC, rowid DESC LIMIT ?`
		)
		.all(row.astronaut_id, radiationMetricCodes.speEvent, capped) as unknown as {
		value: number;
		measured_at: string;
		source: string;
		notes: string | null;
	}[];

	return rows.map((reading) => ({
		value: reading.value,
		measured_at: reading.measured_at,
		source: reading.source,
		notes: reading.notes
	}));
}

interface DatedRow {
	value: number;
	measured_at: string;
	source: string;
	detail?: string | null;
}

function scaleReading(metric: HealthMetric, value: number): number {
	return scaleValue(metric, value);
}

/** Dated readings for a metric, used by detail charts, statistics and history. */
export function getMetricReadings(
	profileId: number,
	areaId: HealthAreaId,
	metricId: string,
	limit = 30
): MetricReading[] {
	const area = healthAreas.find((item) => item.id === areaId);
	const metric: HealthMetric | undefined = area?.metrics.find((item) => item.id === metricId);
	if (!metric) return [];

	const row = getStatements().astronautId.get(profileId) as unknown as
		{ astronaut_id: string } | undefined;
	const astronautId = row?.astronaut_id ?? null;
	if (!astronautId) return [];

	const capped = Math.min(Math.max(limit, 1), 90);

	if (metric.source === 'symptoms') {
		const rows = getDb()
			.prepare(
				`SELECT intensity AS value, recorded_at AS measured_at, source, symptom_type AS detail
				 FROM symptom_records WHERE astronaut_id = ?
				 ORDER BY recorded_at DESC, rowid DESC LIMIT ?`
			)
			.all(astronautId, capped) as unknown as DatedRow[];
		return rows.map((reading) => ({
			value: scaleReading(metric, reading.value),
			secondary: null,
			measured_at: reading.measured_at,
			source: reading.source,
			detail: reading.detail ?? null
		}));
	}

	if (metric.source === 'exercise') {
		const rows = getDb()
			.prepare(
				`SELECT duration_minutes AS value, started_at AS measured_at, source, exercise_type AS detail
				 FROM exercise_sessions WHERE astronaut_id = ?
				 ORDER BY started_at DESC, rowid DESC LIMIT ?`
			)
			.all(astronautId, capped) as unknown as DatedRow[];
		return rows.map((reading) => ({
			value: scaleReading(metric, reading.value),
			secondary: null,
			measured_at: reading.measured_at,
			source: reading.source,
			detail: reading.detail ?? null
		}));
	}

	if (metric.metric_code === 'blood_pressure') {
		const rows = getDb()
			.prepare(
				`SELECT m.measured_at, m.source,
				        (SELECT value FROM measurement_components
				         WHERE measurement_id = m.id AND component_code = 'systolic') AS value,
				        (SELECT value FROM measurement_components
				         WHERE measurement_id = m.id AND component_code = 'diastolic') AS secondary
				 FROM measurements m WHERE m.astronaut_id = ? AND m.metric_code = 'blood_pressure'
				 ORDER BY m.measured_at DESC, m.rowid DESC LIMIT ?`
			)
			.all(astronautId, capped) as unknown as {
			value: number | null;
			secondary: number | null;
			measured_at: string;
			source: string;
		}[];

		return rows
			.filter((reading) => reading.value !== null)
			.map((reading) => ({
				value: scaleReading(metric, reading.value as number),
				secondary: reading.secondary === null ? null : scaleReading(metric, reading.secondary),
				measured_at: reading.measured_at,
				source: reading.source,
				detail: null
			}));
	}

	const rows = getDb()
		.prepare(
			`SELECT value, measured_at, source FROM measurements
			 WHERE astronaut_id = ? AND metric_code = ? AND value IS NOT NULL
			 ORDER BY measured_at DESC, rowid DESC LIMIT ?`
		)
		.all(astronautId, metric.metric_code, capped) as unknown as DatedRow[];

	return rows.map((reading) => ({
		value: scaleReading(metric, reading.value),
		secondary: null,
		measured_at: reading.measured_at,
		source: reading.source,
		detail: null
	}));
}

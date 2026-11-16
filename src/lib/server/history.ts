import { healthAreas } from '#lib/data/healthAreas.js';
import type { HealthAreaId } from '#lib/interfaces/health-area.js';
import { getDb } from '#lib/server/db.js';

export interface HistoryEntry {
	id: string;
	metric_code: string;
	area_id: string | null;
	label: string;
	unit: string;
	value: number | null;
	display: string;
	measured_at: string;
	source: string;
}

export interface HistoryFilters {
	area?: HealthAreaId | null;
	metric?: string | null;
	from?: string | null;
	to?: string | null;
	limit?: number;
}

interface HistoryRow {
	id: string;
	metric_code: string;
	label: string;
	unit: string;
	value: number | null;
	systolic: number | null;
	diastolic: number | null;
	measured_at: string;
	source: string;
}

function areaForMetric(metricCode: string): string | null {
	const area = healthAreas.find((item) =>
		item.metrics.some((metric) => metric.metric_code === metricCode)
	);
	return area?.id ?? null;
}

function metricCodesForArea(areaId: HealthAreaId): string[] {
	const area = healthAreas.find((item) => item.id === areaId);
	return area?.metrics.map((metric) => metric.metric_code) ?? [];
}

function formatValue(row: HistoryRow): string {
	// Blood pressure stores its components separately, so the row value is null.
	if (row.metric_code === 'blood_pressure') {
		if (row.systolic === null || row.diastolic === null) return 'Incomplete reading';
		return `${Math.round(row.systolic)}/${Math.round(row.diastolic)} ${row.unit}`.trim();
	}
	if (row.value === null) return 'No recorded data';
	const decimals = Number.isInteger(row.value) ? 0 : 1;
	return `${row.value.toFixed(decimals)}${row.unit ? ' ' + row.unit : ''}`;
}

export function getHealthHistory(profileId: number, filters: HistoryFilters = {}): HistoryEntry[] {
	const conditions = [
		`p.id = ?`,
		`m.source IN ('manual', 'sensor', 'simulated')`,
		`(m.value IS NOT NULL OR m.metric_code = 'blood_pressure')`
	];
	const values: (string | number)[] = [profileId];

	if (filters.area) {
		const codes = metricCodesForArea(filters.area);
		if (codes.length === 0) return [];
		conditions.push(`m.metric_code IN (${codes.map(() => '?').join(',')})`);
		values.push(...codes);
	}
	if (filters.metric) {
		conditions.push('m.metric_code = ?');
		values.push(filters.metric);
	}
	if (filters.from) {
		conditions.push('date(m.measured_at) >= date(?)');
		values.push(filters.from);
	}
	if (filters.to) {
		conditions.push('date(m.measured_at) <= date(?)');
		values.push(filters.to);
	}

	const limit = Math.min(Math.max(filters.limit ?? 120, 1), 500);
	values.push(limit);

	const rows = getDb()
		.prepare(
			`SELECT m.id, m.metric_code, m.value, m.measured_at, m.source,
			        COALESCE(d.label, m.metric_code) AS label,
			        COALESCE(d.unit, '') AS unit,
			        (SELECT value FROM measurement_components
			         WHERE measurement_id = m.id AND component_code = 'systolic') AS systolic,
			        (SELECT value FROM measurement_components
			         WHERE measurement_id = m.id AND component_code = 'diastolic') AS diastolic
			 FROM measurements m
			 JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
			 LEFT JOIN metric_definitions d ON d.code = m.metric_code
			 WHERE ${conditions.join(' AND ')}
			 ORDER BY m.measured_at DESC, m.rowid DESC
			 LIMIT ?`
		)
		.all(...values) as unknown as HistoryRow[];

	return rows.map((row) => ({
		...row,
		area_id: areaForMetric(row.metric_code),
		display: formatValue(row)
	}));
}

/** Only the metric codes that actually have readings, for the filter menu. */
export function getRecordedMetrics(profileId: number): { code: string; label: string }[] {
	return getDb()
		.prepare(
			`SELECT DISTINCT m.metric_code AS code, COALESCE(d.label, m.metric_code) AS label
			 FROM measurements m
			 JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
			 LEFT JOIN metric_definitions d ON d.code = m.metric_code
			 WHERE p.id = ? AND m.source IN ('manual', 'sensor', 'simulated')
			 ORDER BY label`
		)
		.all(profileId) as unknown as { code: string; label: string }[];
}

export function historyToCsv(entries: readonly HistoryEntry[]): string {
	const header = ['date', 'metric', 'value', 'unit', 'source'];
	const lines = entries.map((entry) =>
		[
			entry.measured_at,
			entry.label,
			entry.value === null ? entry.display.replace(` ${entry.unit}`, '') : String(entry.value),
			entry.unit,
			entry.source
		]
			.map((field) => `"${String(field).replaceAll('"', '""')}"`)
			.join(',')
	);

	return [header.join(','), ...lines].join('\n');
}

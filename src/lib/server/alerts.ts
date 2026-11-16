import type { HealthIndicatorId, HealthSeverity } from '#lib/utils/health-assessment.js';
import {
	getAstronautHealthStatus,
	type AstronautHealthStatus,
	type LatestReading
} from '#lib/server/health-status.js';
import { getDb } from '#lib/server/db.js';

export interface HealthAlert {
	indicator: HealthIndicatorId;
	reading_id: string;
	label: string;
	value: string;
	unit: string;
	severity: Exclude<HealthSeverity, 'green' | 'unknown'>;
	protocol: string;
	measured_at: string;
	acknowledged: boolean;
}

export interface AlertSummary {
	red: number;
	yellow: number;
	total: number;
	overall: HealthSeverity;
}

interface AckRow {
	indicator_id: string;
	reading_id: string;
}

function acknowledgedKeys(profileId: number): Set<string> {
	const rows = getDb()
		.prepare(
			`SELECT a.indicator_id, a.reading_id
			 FROM alert_acknowledgements a
			 JOIN crew_profiles p ON p.astronaut_id = a.astronaut_id
			 WHERE p.id = ?`
		)
		.all(profileId) as unknown as AckRow[];

	return new Set(rows.map((row) => `${row.indicator_id}:${row.reading_id}`));
}

function toAlert(reading: LatestReading, acknowledged: Set<string>): HealthAlert | null {
	const { severity } = reading.assessment;
	if (severity !== 'yellow' && severity !== 'red') return null;

	return {
		indicator: reading.indicator,
		reading_id: reading.reading_id,
		label: reading.assessment.label,
		value: reading.display,
		unit: reading.unit,
		severity,
		protocol: reading.assessment.protocol,
		measured_at: reading.measured_at,
		acknowledged: acknowledged.has(`${reading.indicator}:${reading.reading_id}`)
	};
}

function alertsFromStatus(status: AstronautHealthStatus, acknowledged: Set<string>): HealthAlert[] {
	return status.readings
		.map((reading) => toAlert(reading, acknowledged))
		.filter((alert): alert is HealthAlert => alert !== null)
		.sort((left, right) => {
			if (left.severity !== right.severity) return left.severity === 'red' ? -1 : 1;
			return right.measured_at.localeCompare(left.measured_at);
		});
}

/** Warnings are derived from the latest reading, so a new reading reopens them. */
export function getAstronautAlerts(profileId: number): HealthAlert[] {
	return alertsFromStatus(getAstronautHealthStatus(profileId), acknowledgedKeys(profileId));
}

export function getAlertSummary(profileId: number): AlertSummary {
	const status = getAstronautHealthStatus(profileId);
	const alerts = alertsFromStatus(status, acknowledgedKeys(profileId)).filter(
		(alert) => !alert.acknowledged
	);

	return {
		red: alerts.filter((alert) => alert.severity === 'red').length,
		yellow: alerts.filter((alert) => alert.severity === 'yellow').length,
		total: alerts.length,
		overall: status.overall
	};
}

export function acknowledgeAlert(
	profileId: number,
	indicatorId: HealthIndicatorId,
	readingId: string
): boolean {
	const result = getDb()
		.prepare(
			`INSERT OR IGNORE INTO alert_acknowledgements(astronaut_id, indicator_id, reading_id)
			 SELECT p.astronaut_id, ?, ?
			 FROM crew_profiles p WHERE p.id = ?`
		)
		.run(indicatorId, readingId, profileId);

	return Number(result.changes) > 0;
}

/** Unacknowledged alerts for every astronaut, used by the crew dashboard. */
export function getCrewAlertSummary(): AlertSummary {
	const rows = getDb().prepare('SELECT id FROM crew_profiles ORDER BY id').all() as unknown as {
		id: number;
	}[];

	return rows.reduce<AlertSummary>(
		(summary, row) => {
			const current = getAlertSummary(row.id);
			return {
				red: summary.red + current.red,
				yellow: summary.yellow + current.yellow,
				total: summary.total + current.total,
				overall:
					summary.overall === 'red' || current.overall === 'red'
						? 'red'
						: summary.overall === 'yellow' || current.overall === 'yellow'
							? 'yellow'
							: summary.overall === 'green' || current.overall === 'green'
								? 'green'
								: 'unknown'
			};
		},
		{ red: 0, yellow: 0, total: 0, overall: 'unknown' }
	);
}

import { assessHealthIndicator } from '#lib/utils/health-assessment.js';
import type { Astronaut, CrewDashboard } from '#lib/interfaces/astronaut.js';
import type { BodyMapVitals } from '#lib/interfaces/body-map.js';
import type { MetricReading, MetricSnapshot, HealthAreaId } from '#lib/interfaces/health-area.js';
import type {
	AlertSummary,
	AstronautHealthStatus,
	HealthAlert,
	HealthSeverity,
	LatestReading
} from '#lib/interfaces/health.js';
import type { MedicalProfile } from '#lib/interfaces/medical-profile.js';
import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
import type { RadiationSummary } from '#lib/interfaces/radiation.js';
import type { DemoDelta } from './demo-store.js';
import snapshot from './mock-data.json';

/** Mirrors `CrewHealthOverview`, which only lives in the server module. */
export interface DemoCrewHealth {
	green: number;
	yellow: number;
	red: number;
	unknown: number;
	overall: HealthSeverity;
	byAstronaut: Record<number, HealthSeverity>;
}

interface AreaOverview {
	id: HealthAreaId;
	label: string;
	total: number;
	recorded: number;
	lastUpdate: string | null;
}

interface DemoAstronaut {
	layout: {
		astronaut: Astronaut;
		alertSummary: AlertSummary;
		vitals: BodyMapVitals;
	};
	summary: {
		astronaut: Astronaut;
		status: AstronautHealthStatus;
		vitals: LatestReading[];
		trends: Record<string, number[]>;
		alerts: HealthAlert[];
	};
	measurements: { areas: AreaOverview[] };
	cardiovascular: {
		snapshots: MetricSnapshot[];
		tones: Record<string, 'green' | 'yellow' | 'red' | null>;
	};
	heartRate: { readings: MetricReading[]; entry: MetricEntryConfig };
	radiation: { snapshots: MetricSnapshot[]; summary: RadiationSummary };
	medical: { profile: MedicalProfile | null };
}

interface DemoSnapshot {
	generated_at: string;
	crew: { crew: CrewDashboard; health: DemoCrewHealth };
	astronauts: Record<string, DemoAstronaut>;
}

// The JSON was produced by `scripts/snapshot-demo-data.ts` from the real load
// functions, so the shapes match even though JSON widens literal unions.
const data = snapshot as unknown as DemoSnapshot;

/** Readings added during the demo, oldest first. */
function extraReadings(astronautId: number, deltas: readonly DemoDelta[]): MetricReading[] {
	return deltas
		.filter((delta) => delta.astronaut_id === astronautId && delta.metric_code === 'heart_rate')
		.map((delta) => ({
			value: delta.value,
			secondary: null,
			measured_at: delta.measured_at,
			source: 'manual',
			detail: null
		}));
}

/** `MetricReading` lists newest first, so the extra readings are reversed. */
function heartRateReadings(astronautId: number, deltas: readonly DemoDelta[]): MetricReading[] {
	const profile = data.astronauts[String(astronautId)];
	if (!profile) return [];

	return [...extraReadings(astronautId, deltas).reverse(), ...profile.heartRate.readings];
}

function toneFor(severity: HealthSeverity): 'green' | 'yellow' | 'red' | null {
	return severity === 'unknown' ? null : severity;
}

/** Recomputes the summary from the newest heart rate so the demo stays coherent. */
function withLatestHeartRate(
	profile: DemoAstronaut,
	latest: MetricReading
): Pick<DemoAstronaut['summary'], 'status' | 'vitals' | 'trends'> {
	const current = profile.summary.status.readings.find(
		(reading) => reading.indicator === 'heart-rate'
	);
	const assessment = assessHealthIndicator('heart-rate', latest.value, latest.value, null);
	const reading: LatestReading = {
		reading_id: current?.reading_id ?? `demo-heart-rate-${profile.summary.astronaut.id}`,
		indicator: 'heart-rate',
		metric_code: 'heart_rate',
		value: latest.value,
		systolic: null,
		diastolic: null,
		display: String(latest.value),
		unit: current?.unit ?? 'bpm',
		measured_at: latest.measured_at,
		source: 'manual',
		assessment
	};

	const readings = current
		? profile.summary.status.readings.map((item) =>
				item.indicator === 'heart-rate' ? reading : item
			)
		: [...profile.summary.status.readings, reading];

	const counts = { green: 0, yellow: 0, red: 0 };
	for (const item of readings) {
		if (item.assessment.severity === 'green') counts.green += 1;
		else if (item.assessment.severity === 'yellow') counts.yellow += 1;
		else if (item.assessment.severity === 'red') counts.red += 1;
	}

	const overall: HealthSeverity =
		counts.red > 0 ? 'red' : counts.yellow > 0 ? 'yellow' : counts.green > 0 ? 'green' : 'unknown';

	return {
		status: {
			...profile.summary.status,
			readings,
			counts,
			overall,
			lastUpdate:
				latest.measured_at > (profile.summary.status.lastUpdate ?? '')
					? latest.measured_at
					: profile.summary.status.lastUpdate
		},
		vitals: profile.summary.vitals.map((item) =>
			item.indicator === 'heart-rate' ? reading : item
		),
		trends: {
			...profile.summary.trends,
			'heart-rate': [...(profile.summary.trends['heart-rate'] ?? []), latest.value].slice(-12)
		}
	};
}

export function demoCrew(): { crew: CrewDashboard; health: DemoCrewHealth } {
	return data.crew;
}

export function demoLayout(astronautId: number): DemoAstronaut['layout'] | null {
	return data.astronauts[String(astronautId)]?.layout ?? null;
}

export function demoSummary(astronautId: number, deltas: readonly DemoDelta[]) {
	const profile = data.astronauts[String(astronautId)];
	if (!profile) return null;

	const readings = extraReadings(astronautId, deltas);
	const latest = readings.at(-1);
	if (!latest) return profile.summary;

	return { ...profile.summary, ...withLatestHeartRate(profile, latest) };
}

export function demoMeasurements(astronautId: number): { areas: AreaOverview[] } | null {
	return data.astronauts[String(astronautId)]?.measurements ?? null;
}

export function demoCardiovascular(astronautId: number, deltas: readonly DemoDelta[]) {
	const profile = data.astronauts[String(astronautId)];
	if (!profile) return null;

	const latest = heartRateReadings(astronautId, deltas)[0];
	if (!latest) return profile.cardiovascular;

	const snapshots = profile.cardiovascular.snapshots.map((item) =>
		item.metric_id === 'heart-rate'
			? {
					...item,
					latest: latest.value,
					display: String(latest.value),
					points: [...item.points, latest.value].slice(-12),
					recorded_at: latest.measured_at
				}
			: item
	);
	const assessment = assessHealthIndicator('heart-rate', latest.value, latest.value, null);

	return {
		snapshots,
		tones: { ...profile.cardiovascular.tones, 'heart-rate': toneFor(assessment.severity) }
	};
}

export function demoHeartRate(astronautId: number, deltas: readonly DemoDelta[]) {
	const profile = data.astronauts[String(astronautId)];
	if (!profile) return null;

	return {
		readings: heartRateReadings(astronautId, deltas),
		entry: profile.heartRate.entry
	};
}

export function demoRadiation(astronautId: number) {
	return data.astronauts[String(astronautId)]?.radiation ?? null;
}

export function demoMedical(astronautId: number): { profile: MedicalProfile | null } | null {
	return data.astronauts[String(astronautId)]?.medical ?? null;
}

/** Smallest astronaut id in the snapshot, used by the tour's first navigation. */
export const DEMO_ASTRONAUT_ID = Number(Object.keys(data.astronauts)[0] ?? 1);
export const DEMO_GENERATED_AT = data.generated_at;

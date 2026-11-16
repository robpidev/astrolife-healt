/**
 * Regenerates `src/lib/demo/mock-data.json` from the local SQLite database.
 *
 * The demo build has no server and no database, so the mock dataset is a
 * snapshot of the real load results. Keeping the snapshot in the repository
 * means the demo stays realistic and every route keeps the exact shape its
 * page expects. Run with `bun scripts/snapshot-demo-data.ts` after changing
 * the seed data.
 */
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { getAlertSummary, getAstronautAlerts } from '#lib/server/alerts.js';
import { getBodyMapVitals } from '#lib/server/body-map.js';
import { getCardiovascularEntryConfig } from '#lib/server/cardiovascular-action.js';
import { getAstronaut, getCrewDashboard } from '#lib/server/crew.js';
import {
	getAreaSnapshots,
	getIndicatorTrends,
	getMetricReadings
} from '#lib/server/health-metrics.js';
import {
	getAreaTones,
	getAstronautHealthStatus,
	getCrewHealthOverview,
	getKeyVitals
} from '#lib/server/health-status.js';
import { getMedicalProfile } from '#lib/server/medical-profile.js';
import { getRadiationSummary } from '#lib/server/radiation.js';
import { healthAreas } from '#lib/data/healthAreas.js';

const VITAL_INDICATORS = ['heart-rate', 'blood-pressure', 'spo2', 'temperature'] as const;

function measurementsOverview(profileId: number) {
	return healthAreas.map((area) => {
		const snapshots = getAreaSnapshots(profileId, area.id);
		const recorded = snapshots.filter((snapshot) => snapshot.latest !== null);
		const dates = recorded
			.map((snapshot) => snapshot.recorded_at)
			.filter((date): date is string => date !== null);

		return {
			id: area.id,
			label: area.label,
			total: area.metrics.length,
			recorded: recorded.length,
			lastUpdate: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null
		};
	});
}

const astronauts: Record<string, unknown> = {};

for (let id = 1; id <= 6; id += 1) {
	const astronaut = getAstronaut(id);
	if (!astronaut) continue;

	const status = getAstronautHealthStatus(id);

	astronauts[String(id)] = {
		layout: {
			astronaut,
			alertSummary: getAlertSummary(id),
			vitals: getBodyMapVitals(id)
		},
		summary: {
			astronaut,
			status,
			vitals: getKeyVitals(status),
			trends: getIndicatorTrends(id, VITAL_INDICATORS),
			alerts: getAstronautAlerts(id)
		},
		measurements: { areas: measurementsOverview(id) },
		cardiovascular: {
			snapshots: getAreaSnapshots(id, 'cardiovascular'),
			tones: getAreaTones(id, 'cardiovascular')
		},
		heartRate: {
			readings: getMetricReadings(id, 'cardiovascular', 'heart-rate', 30),
			entry: getCardiovascularEntryConfig('heart-rate')
		},
		radiation: {
			snapshots: getAreaSnapshots(id, 'radiation'),
			summary: getRadiationSummary(id)
		},
		medical: { profile: getMedicalProfile(id) }
	};
}

const snapshot = {
	generated_at: new Date().toISOString(),
	crew: { crew: getCrewDashboard(), health: getCrewHealthOverview() },
	astronauts
};

const target = new URL('../src/lib/demo/mock-data.json', import.meta.url);
writeFileSync(target, `${JSON.stringify(snapshot, null, '\t')}\n`);

// The snapshot is committed, so keep it formatted like the rest of the repo.
const formatted = spawnSync('bunx', ['prettier', '--write', target.pathname], {
	stdio: 'inherit'
});
if (formatted.status !== 0) process.exit(formatted.status ?? 1);

console.log(`Wrote ${target.pathname}`);

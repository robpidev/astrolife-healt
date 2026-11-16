import type { StatementSync } from 'node:sqlite';
import type { BodyMapVitals } from '#lib/interfaces/body-map.js';
import { getDb } from '#lib/server/db.js';

let statements: { latest: StatementSync } | null = null;

function getStatements() {
	if (statements) return statements;

	statements = {
		// One prepared statement serves the three codes; the profile join keeps
		// the layout from having to resolve the astronaut id itself.
		latest: getDb().prepare(`SELECT m.value
			FROM measurements m
			JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
			WHERE p.id = ? AND m.metric_code = ? AND m.value IS NOT NULL
			  AND m.source IN ('manual', 'sensor', 'simulated')
			ORDER BY m.measured_at DESC, m.rowid DESC
			LIMIT 1`)
	};

	return statements;
}

/** Latest heart rate, stress and fatigue for the 3D body map. */
export function getBodyMapVitals(profileId: number): BodyMapVitals {
	const statement = getStatements().latest;

	const read = (metricCode: string): number | null => {
		const row = statement.get(profileId, metricCode) as unknown as
			{ value: number | null } | undefined;
		return typeof row?.value === 'number' ? row.value : null;
	};

	return {
		heart_rate: read('heart_rate'),
		stress: read('stress'),
		fatigue: read('fatigue')
	};
}

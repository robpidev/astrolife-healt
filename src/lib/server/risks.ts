import type { HealthSeverity } from '#lib/utils/health-assessment.js';
import { getAstronautHealthStatus } from '#lib/server/health-status.js';
import {
	getMentalMetricTones,
	getSurveyTone,
	getSurveySummary
} from '#lib/server/mental-survey.js';
import { getRadiationSummary } from '#lib/server/radiation.js';
import { getDb } from '#lib/server/db.js';

export interface RiskFactor {
	id: string;
	label: string;
	severity: HealthSeverity;
	evidence: string[];
	protocol: string;
}

interface LatestValue {
	value: number;
	measured_at: string;
}

const SEVERITY_RANK: Record<HealthSeverity, number> = {
	unknown: 0,
	green: 1,
	yellow: 2,
	red: 3
};

function worst(severities: readonly HealthSeverity[]): HealthSeverity {
	return severities.reduce<HealthSeverity>(
		(current, severity) => (SEVERITY_RANK[severity] > SEVERITY_RANK[current] ? severity : current),
		'unknown'
	);
}

function latestMetric(profileId: number, metricCode: string): LatestValue | null {
	const row = getDb()
		.prepare(
			`SELECT m.value, m.measured_at
			 FROM measurements m
			 JOIN crew_profiles p ON p.astronaut_id = m.astronaut_id
			 WHERE p.id = ? AND m.metric_code = ? AND m.value IS NOT NULL
			   AND m.source IN ('manual', 'sensor', 'simulated')
			 ORDER BY m.measured_at DESC, m.rowid DESC
			 LIMIT 1`
		)
		.get(profileId, metricCode) as unknown as LatestValue | undefined;

	return row ?? null;
}

function latestExercise(profileId: number): LatestValue | null {
	const row = getDb()
		.prepare(
			`SELECT s.duration_minutes AS value, s.started_at AS measured_at
			 FROM exercise_sessions s
			 JOIN crew_profiles p ON p.astronaut_id = s.astronaut_id
			 WHERE p.id = ?
			 ORDER BY s.started_at DESC, s.rowid DESC
			 LIMIT 1`
		)
		.get(profileId) as unknown as LatestValue | undefined;

	return row ?? null;
}

function format(value: number, unit = ''): string {
	const decimals = Number.isInteger(value) ? 0 : 1;
	return `${value.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
}

export function getRiskAssessment(profileId: number): RiskFactor[] {
	const status = getAstronautHealthStatus(profileId);
	const reading = (indicator: string) =>
		status.readings.find((item) => item.indicator === indicator) ?? null;

	const cardioReadings = ['heart-rate', 'blood-pressure', 'spo2']
		.map((indicator) => reading(indicator))
		.filter((item) => item !== null);
	const cardioSeverity = worst(cardioReadings.map((item) => item.assessment.severity));

	const sleep = reading('sleep');
	const fatigue = latestMetric(profileId, 'fatigue');
	const sleepSeverity = worst([
		sleep?.assessment.severity ?? 'unknown',
		fatigue === null
			? 'unknown'
			: fatigue.value >= 7
				? 'red'
				: fatigue.value > 3
					? 'yellow'
					: 'green'
	]);

	const strength = latestMetric(profileId, 'muscle_strength');
	const exercise = latestExercise(profileId);
	const muscularSeverity: HealthSeverity =
		strength === null && exercise === null
			? 'unknown'
			: worst([
					strength === null ? 'unknown' : strength.value < 100 ? 'yellow' : 'green',
					exercise === null ? 'unknown' : exercise.value < 20 ? 'yellow' : 'green'
				]);

	// One aggregation feeds both the severity and the evidence lines.
	const radiationSummary = getRadiationSummary(profileId);
	const radiationSeverity: HealthSeverity = radiationSummary?.overall ?? 'unknown';
	const radiationEvidence = (radiationSummary?.assessments ?? [])
		.filter((assessment) => assessment.status !== 'unknown')
		.slice(0, 2)
		.map(
			(assessment) =>
				`${assessment.guideline.label} ${assessment.display} / ${assessment.applied_limit} ${assessment.guideline.unit}`
		);

	const mentalTones = Object.values(getMentalMetricTones(profileId)).filter(
		(tone): tone is 'green' | 'yellow' | 'red' => tone !== null
	);
	const surveyTone = getSurveyTone(getSurveySummary(profileId));
	const mentalSeverity = worst([...mentalTones, surveyTone ?? 'unknown']);

	const water = latestMetric(profileId, 'water_intake');
	const mass = latestMetric(profileId, 'body_mass');
	const nutritionSeverity: HealthSeverity =
		water === null && mass === null
			? 'unknown'
			: worst([
					water === null ? 'unknown' : water.value < 1500 ? 'yellow' : 'green',
					mass === null ? 'unknown' : 'green'
				]);

	return [
		{
			id: 'cardiovascular',
			label: 'Cardiovascular',
			severity: cardioSeverity,
			evidence:
				cardioReadings.length === 0
					? []
					: cardioReadings.map((item) => `${item.display} ${item.unit}`),
			protocol:
				cardioSeverity === 'red'
					? 'Repeat the abnormal reading and notify the flight surgeon.'
					: cardioSeverity === 'yellow'
						? 'Rest, repeat the reading, and monitor symptoms.'
						: 'Continue routine cardiovascular monitoring.'
		},
		{
			id: 'microgravity',
			label: 'Microgravity deconditioning',
			severity: muscularSeverity,
			evidence: [
				strength === null ? null : `Strength ${format(strength.value, 'N')}`,
				exercise === null ? null : `Exercise ${format(exercise.value, 'min')}`
			].filter((item): item is string => item !== null),
			protocol:
				muscularSeverity === 'yellow'
					? 'Schedule the daily resistance and aerobic session.'
					: 'Maintain the prescribed exercise countermeasure.'
		},
		{
			id: 'sleep',
			label: 'Sleep and fatigue',
			severity: sleepSeverity,
			evidence: [
				sleep === null ? null : `Sleep ${sleep.display} h`,
				fatigue === null ? null : `Fatigue ${format(fatigue.value, '/10')}`
			].filter((item): item is string => item !== null),
			protocol:
				sleepSeverity === 'red'
					? 'Protect a recovery sleep period before critical tasks.'
					: 'Keep the sleep schedule and monitor daytime fatigue.'
		},
		{
			id: 'radiation',
			label: 'Radiation exposure',
			severity: radiationSeverity,
			evidence: radiationEvidence,
			protocol:
				radiationSeverity === 'red'
					? 'Limit reached. Shelter in the most shielded zone and notify the flight surgeon.'
					: radiationSeverity === 'yellow'
						? 'Review shielding, log a fresh reading, and close any stale limits.'
						: 'Keep the current radiation monitoring routine.'
		},
		{
			id: 'mental',
			label: 'Isolation and mental load',
			severity: mentalSeverity,
			evidence:
				mentalTones.length === 0 && surveyTone === null ? [] : [`Survey state: ${mentalSeverity}`],
			protocol:
				mentalSeverity === 'red'
					? 'Schedule a private check-in and reduce non-critical workload.'
					: 'Continue the SMIA check-ins and crew contact schedule.'
		},
		{
			id: 'nutrition',
			label: 'Nutrition and hydration',
			severity: nutritionSeverity,
			evidence: [
				water === null ? null : `Water ${format(water.value, 'mL')}`,
				mass === null ? null : `Mass ${format(mass.value, 'kg')}`
			].filter((item): item is string => item !== null),
			protocol:
				nutritionSeverity === 'yellow'
					? 'Increase fluid intake and review the nutrition plan.'
					: 'Maintain the planned intake and hydration schedule.'
		}
	];
}

export function getWorstRisk(factors: readonly RiskFactor[]): HealthSeverity {
	return worst(factors.map((factor) => factor.severity));
}

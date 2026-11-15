import type { HealthArea } from '#lib/interfaces/health-area.js';

/**
 * Health navigation metadata; clinical values are loaded separately.
 * `metric_code` links each card to `metric_definitions` so the overview can
 * query the series that backs it.
 */
export const healthAreas = [
	{
		id: 'cardiovascular',
		label: 'Cardiovascular',
		metrics: [
			{
				id: 'heart-rate',
				label: 'Heart rate',
				unit: 'bpm',
				metric_code: 'heart_rate'
			},
			{
				id: 'blood-pressure',
				label: 'Blood pressure',
				unit: 'mmHg',
				metric_code: 'blood_pressure'
			},
			{
				id: 'oxygen',
				label: 'Oxygen',
				unit: '%',
				metric_code: 'spo2'
			}
		]
	},
	{
		id: 'muscular',
		label: 'Muscular health',
		metrics: [
			{
				id: 'exercise',
				label: 'Exercise',
				unit: 'min',
				metric_code: 'exercise_duration',
				source: 'exercise'
			},
			{
				id: 'strength',
				label: 'Strength',
				unit: 'N',
				metric_code: 'muscle_strength'
			},
			{
				id: 'pain',
				label: 'Pain',
				unit: '',
				metric_code: 'muscle_pain'
			}
		]
	},
	{
		id: 'mental',
		label: 'Mental health',
		metrics: [
			{
				id: 'stress',
				label: 'Stress',
				unit: '',
				metric_code: 'stress'
			},
			{
				id: 'mood',
				label: 'Mood',
				unit: '',
				metric_code: 'mood'
			},
			{
				id: 'concentration',
				label: 'Concentration',
				unit: '%',
				metric_code: 'cognitive_accuracy'
			},
			{
				id: 'duration',
				label: 'Duration',
				unit: 'h',
				metric_code: 'sleep_duration'
			},
			{
				id: 'fatigue',
				label: 'Fatigue',
				unit: '',
				metric_code: 'fatigue'
			}
		]
	},
	{
		id: 'radiation',
		label: 'Radiation',
		metrics: [
			{
				id: 'dose',
				label: 'Dose',
				unit: 'mSv',
				metric_code: 'radiation_interval',
				decimals: 3
			}
		]
	},
	{
		id: 'general',
		label: 'General health',
		metrics: [
			{
				id: 'temperature',
				label: 'Body temperature',
				unit: '°C',
				metric_code: 'body_temperature'
			},
			{
				id: 'hydration',
				label: 'Hydration',
				unit: 'L',
				metric_code: 'water_intake',
				unit_scale: 0.001
			},
			{
				id: 'weight',
				label: 'Weight',
				unit: 'kg',
				metric_code: 'body_mass'
			},
			{
				id: 'symptoms',
				label: 'Symptoms',
				unit: '',
				metric_code: 'symptom_intensity',
				source: 'symptoms'
			}
		]
	}
] as const satisfies readonly HealthArea[];

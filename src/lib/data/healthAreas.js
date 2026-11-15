/** Health navigation metadata; clinical values are loaded separately. */
export const healthAreas = [
	{
		id: 'cardiovascular',
		label: 'Cardiovascular',
		metrics: [
			{
				id: 'heart-rate',
				label: 'Heart rate',
				unit: 'bpm'
			},
			{
				id: 'blood-pressure',
				label: 'Blood pressure',
				unit: 'mmHg'
			},
			{
				id: 'oxygen',
				label: 'Oxygen',
				unit: '%'
			}
		]
	},
	{
		id: 'sleep',
		label: 'Sleep',
		metrics: [
			{
				id: 'duration',
				label: 'Duration',
				unit: 'h'
			},
			{
				id: 'fatigue',
				label: 'Fatigue',
				unit: ''
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
				unit: 'min'
			},
			{
				id: 'strength',
				label: 'Strength',
				unit: ''
			},
			{
				id: 'pain',
				label: 'Pain',
				unit: ''
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
				unit: ''
			},
			{
				id: 'mood',
				label: 'Mood',
				unit: ''
			},
			{
				id: 'concentration',
				label: 'Concentration',
				unit: ''
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
				unit: 'mSv'
			}
		]
	},
	{
		id: 'general',
		label: 'General health',
		metrics: [
			{
				id: 'temperature',
				label: 'Temperature',
				unit: '°C'
			},
			{
				id: 'hydration',
				label: 'Hydration',
				unit: 'L'
			},
			{
				id: 'weight',
				label: 'Weight',
				unit: 'kg'
			},
			{
				id: 'symptoms',
				label: 'Symptoms',
				unit: ''
			}
		]
	}
];

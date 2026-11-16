export type HealthIndicatorId =
	| 'blood-pressure'
	| 'heart-rate'
	| 'blood-glucose'
	| 'temperature'
	| 'sleep'
	| 'spo2'
	| 'respiratory-rate';

export type HealthSeverity = 'green' | 'yellow' | 'red' | 'unknown';

export type ReadingAssessment = {
	label: string;
	tone: 'normal' | 'caution' | 'high' | 'low' | 'urgent' | 'unavailable';
	severity: HealthSeverity;
	/** Short, non-prescriptive action shown next to an alert. */
	protocol: string;
};

/** These are educational screening labels, not individual medical diagnoses. */
export function assessHealthIndicator(
	indicator: HealthIndicatorId,
	value: number | null,
	systolic: number | null = null,
	diastolic: number | null = null
): ReadingAssessment {
	const assessment = (
		label: string,
		tone: ReadingAssessment['tone'],
		severity: HealthSeverity,
		protocol: string
	): ReadingAssessment => ({ label, tone, severity, protocol });

	const unavailable = (label = 'No recorded data') =>
		assessment(label, 'unavailable', 'unknown', 'Record a reading to enable screening.');

	if (indicator === 'blood-pressure') {
		if (systolic === null || diastolic === null)
			return unavailable(
				systolic === null && diastolic === null ? 'No complete reading' : 'Incomplete reading'
			);
		if (systolic > 180 || diastolic > 120)
			return assessment(
				'Severely elevated — seek medical advice',
				'urgent',
				'red',
				'Repeat after 5 minutes and notify the flight surgeon.'
			);
		if (systolic >= 140 || diastolic >= 90)
			return assessment(
				'Stage 2 range (single reading)',
				'high',
				'red',
				'Repeat after 5 minutes rest and notify the flight surgeon.'
			);
		if (systolic >= 130 || diastolic >= 80)
			return assessment(
				'Stage 1 range (single reading)',
				'high',
				'yellow',
				'Repeat after 5 minutes rest and monitor symptoms.'
			);
		if (systolic >= 120)
			return assessment(
				'Elevated range (single reading)',
				'caution',
				'yellow',
				'Rest, hydrate, and repeat the reading.'
			);
		if (systolic < 90 || diastolic < 60)
			return assessment(
				'Potentially low — consider symptoms',
				'low',
				'yellow',
				'Sit down, hydrate, and repeat if symptoms appear.'
			);
		return assessment('Within normal reference', 'normal', 'green', 'Continue routine monitoring.');
	}

	if (value === null || !Number.isFinite(value)) return unavailable();

	switch (indicator) {
		case 'temperature':
			if (value < 35)
				return assessment(
					'Hypothermia threshold — emergency',
					'urgent',
					'red',
					'Warm the astronaut and notify the flight surgeon immediately.'
				);
			if (value >= 38)
				return assessment(
					'Fever-range reading',
					'high',
					'red',
					'Hydrate, isolate, and recheck temperature in 30 minutes.'
				);
			if (value < 36.5)
				return assessment(
					'Below typical resting range',
					'low',
					'yellow',
					'Warm up and recheck before the next activity.'
				);
			if (value > 37.3)
				return assessment(
					'Above typical resting range',
					'caution',
					'yellow',
					'Rest, hydrate, and recheck temperature.'
				);
			return assessment(
				'Within typical resting range',
				'normal',
				'green',
				'Continue routine monitoring.'
			);
		case 'heart-rate':
			if (value < 50)
				return assessment(
					'Markedly slow resting pulse',
					'low',
					'red',
					'Check for dizziness or weakness and notify the flight surgeon.'
				);
			if (value > 120)
				return assessment(
					'Markedly fast resting pulse',
					'high',
					'red',
					'Rest, repeat in 5 minutes, and notify the flight surgeon if it persists.'
				);
			if (value < 60)
				return assessment(
					'Below usual resting range',
					'low',
					'yellow',
					'Check symptoms and repeat after rest.'
				);
			if (value > 100)
				return assessment(
					'Above usual resting range',
					'high',
					'yellow',
					'Rest and repeat in 5 minutes.'
				);
			return assessment(
				'Within usual resting range',
				'normal',
				'green',
				'Continue routine monitoring.'
			);
		case 'blood-glucose':
			if (value < 70)
				return assessment(
					'Low fasting glucose',
					'low',
					'red',
					'Treat low glucose promptly and notify the flight surgeon.'
				);
			if (value >= 126)
				return assessment(
					'Diabetes screening range — confirm with clinician',
					'high',
					'red',
					'Hydrate and notify the flight surgeon for confirmatory testing.'
				);
			if (value >= 100)
				return assessment(
					'Prediabetes screening range',
					'caution',
					'yellow',
					'Review nutrition and repeat fasting glucose.'
				);
			return assessment(
				'Within fasting reference range',
				'normal',
				'green',
				'Continue routine monitoring.'
			);
		case 'sleep':
			if (value < 5)
				return assessment(
					'Severe sleep deficit',
					'low',
					'red',
					'Prioritize a protected rest period before critical tasks.'
				);
			if (value < 7)
				return assessment(
					'Below recommended duration',
					'low',
					'yellow',
					'Schedule recovery rest and reduce non-critical workload.'
				);
			if (value > 9)
				return assessment(
					'Above typical recommendation — may be appropriate',
					'caution',
					'yellow',
					'Check for fatigue or circadian disruption.'
				);
			return assessment(
				'Within recommended duration',
				'normal',
				'green',
				'Maintain the sleep schedule.'
			);
		case 'spo2':
			if (value < 90)
				return assessment(
					'Low oxygen saturation',
					'urgent',
					'red',
					'Sit upright, check sensor placement, and notify the flight surgeon.'
				);
			if (value < 95)
				return assessment(
					'Below usual oxygen range',
					'low',
					'yellow',
					'Rest, check sensor placement, and repeat the reading.'
				);
			return assessment(
				'Within usual oxygen range',
				'normal',
				'green',
				'Continue routine monitoring.'
			);
		case 'respiratory-rate':
			if (value < 10 || value > 28)
				return assessment(
					'Markedly abnormal respiratory rate',
					'urgent',
					'red',
					'Check airway and breathing, and notify the flight surgeon.'
				);
			if (value < 12)
				return assessment(
					'Below usual respiratory rate',
					'low',
					'yellow',
					'Rest and repeat the count.'
				);
			if (value > 20)
				return assessment(
					'Above usual respiratory rate',
					'high',
					'yellow',
					'Rest, check oxygen saturation, and repeat.'
				);
			return assessment(
				'Within usual respiratory range',
				'normal',
				'green',
				'Continue routine monitoring.'
			);
	}
}

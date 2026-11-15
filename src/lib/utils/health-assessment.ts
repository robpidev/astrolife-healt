export type HealthIndicatorId =
	'blood-pressure' | 'heart-rate' | 'blood-glucose' | 'temperature' | 'sleep';
export type ReadingAssessment = {
	label: string;
	tone: 'normal' | 'caution' | 'high' | 'low' | 'urgent' | 'unavailable';
};

/** These are educational screening labels, not individual medical diagnoses. */
export function assessHealthIndicator(
	indicator: HealthIndicatorId,
	value: number | null,
	systolic: number | null = null,
	diastolic: number | null = null
): ReadingAssessment {
	const normal = (label: string): ReadingAssessment => ({ label, tone: 'normal' });
	const caution = (label: string): ReadingAssessment => ({ label, tone: 'caution' });
	const high = (label: string): ReadingAssessment => ({ label, tone: 'high' });
	const low = (label: string): ReadingAssessment => ({ label, tone: 'low' });
	const urgent = (label: string): ReadingAssessment => ({ label, tone: 'urgent' });
	const unavailable = (label = 'No recorded data'): ReadingAssessment => ({
		label,
		tone: 'unavailable'
	});

	if (indicator === 'blood-pressure') {
		if (systolic === null || diastolic === null)
			return unavailable(
				systolic === null && diastolic === null ? 'No complete reading' : 'Incomplete reading'
			);
		if (systolic > 180 || diastolic > 120) return urgent('Severely elevated — seek medical advice');
		if (systolic >= 140 || diastolic >= 90) return high('Stage 2 range (single reading)');
		if (systolic >= 130 || diastolic >= 80) return high('Stage 1 range (single reading)');
		if (systolic >= 120) return caution('Elevated range (single reading)');
		if (systolic < 90 || diastolic < 60) return low('Potentially low — consider symptoms');
		return normal('Within normal reference');
	}

	if (value === null || !Number.isFinite(value)) return unavailable();
	switch (indicator) {
		case 'temperature':
			if (value < 35) return urgent('Hypothermia threshold — emergency');
			if (value >= 38) return high('Fever-range reading');
			if (value < 36.5) return low('Below typical resting range');
			if (value > 37.3) return caution('Above typical resting range');
			return normal('Within typical resting range');
		case 'heart-rate':
			if (value < 60) return low('Below usual resting range');
			if (value > 100) return high('Above usual resting range');
			return normal('Within usual resting range');
		case 'blood-glucose':
			if (value < 70) return low('Low fasting glucose');
			if (value >= 126) return high('Diabetes screening range — confirm with clinician');
			if (value >= 100) return caution('Prediabetes screening range');
			return normal('Within fasting reference range');
		case 'sleep':
			if (value < 7) return low('Below recommended duration');
			if (value > 9) return caution('Above typical recommendation — may be appropriate');
			return normal('Within recommended duration');
	}
}

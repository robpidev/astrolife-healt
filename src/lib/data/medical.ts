import type { AllergySeverity } from '#lib/interfaces/medical-profile.js';

export const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

export const allergySeverities = [
	{ value: 'mild', label: 'Mild' },
	{ value: 'moderate', label: 'Moderate' },
	{ value: 'severe', label: 'Severe' },
	{ value: 'unknown', label: 'Unknown' }
] as const satisfies readonly { value: AllergySeverity; label: string }[];

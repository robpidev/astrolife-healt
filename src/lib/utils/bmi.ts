import type { BmiTone } from '#lib/interfaces/measurement.js';

export interface BmiCategory {
	label: string;
	tone: BmiTone;
}

export function calculateBmi(massKg: number, heightCm: number): number {
	return Math.round((massKg / (heightCm / 100) ** 2) * 10) / 10;
}

export function bmiCategory(bmi: number): BmiCategory {
	if (bmi < 18.5) return { label: 'Underweight', tone: 'low' };
	if (bmi < 25) return { label: 'Normal', tone: 'normal' };
	if (bmi < 30) return { label: 'Overweight', tone: 'high' };
	return { label: 'Obese', tone: 'obese' };
}

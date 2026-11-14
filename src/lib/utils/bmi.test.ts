import { describe, expect, it } from 'vitest';
import { bmiCategory, calculateBmi } from './bmi';

describe('calculateBmi', () => {
	it('calculates BMI and rounds to one decimal', () => {
		expect(calculateBmi(70, 175)).toBe(22.9);
	});

	it('uses metres for height', () => {
		expect(calculateBmi(50, 160)).toBe(19.5);
	});
});

describe('bmiCategory', () => {
	it('classifies underweight', () => {
		expect(bmiCategory(18.4)).toEqual({ label: 'Bajo peso', tone: 'low' });
	});

	it('classifies normal weight at the boundaries', () => {
		expect(bmiCategory(18.5)).toEqual({ label: 'Normal', tone: 'normal' });
		expect(bmiCategory(24.9)).toEqual({ label: 'Normal', tone: 'normal' });
	});

	it('classifies overweight', () => {
		expect(bmiCategory(25)).toEqual({ label: 'Sobrepeso', tone: 'high' });
		expect(bmiCategory(29.9)).toEqual({ label: 'Sobrepeso', tone: 'high' });
	});

	it('classifies obesity', () => {
		expect(bmiCategory(30)).toEqual({ label: 'Obesidad', tone: 'obese' });
	});
});

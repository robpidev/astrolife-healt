import { describe, expect, it } from 'vitest';
import { assessHealthIndicator } from './health-assessment';

describe('health assessment severity', () => {
	it('classifies a normal resting temperature as green', () => {
		const result = assessHealthIndicator('temperature', 36.8);
		expect(result.severity).toBe('green');
		expect(result.protocol).toContain('routine');
	});

	it('escalates fever and hypothermia to red', () => {
		expect(assessHealthIndicator('temperature', 38.2).severity).toBe('red');
		expect(assessHealthIndicator('temperature', 34.6).severity).toBe('red');
	});

	it('distinguishes elevated and severe blood pressure', () => {
		expect(assessHealthIndicator('blood-pressure', null, 128, 76).severity).toBe('yellow');
		expect(assessHealthIndicator('blood-pressure', null, 185, 122).severity).toBe('red');
	});

	it('classifies oxygen saturation', () => {
		expect(assessHealthIndicator('spo2', 98).severity).toBe('green');
		expect(assessHealthIndicator('spo2', 93).severity).toBe('yellow');
		expect(assessHealthIndicator('spo2', 88).severity).toBe('red');
	});

	it('classifies respiratory rate at both ends', () => {
		expect(assessHealthIndicator('respiratory-rate', 16).severity).toBe('green');
		expect(assessHealthIndicator('respiratory-rate', 22).severity).toBe('yellow');
		expect(assessHealthIndicator('respiratory-rate', 9).severity).toBe('red');
		expect(assessHealthIndicator('respiratory-rate', 30).severity).toBe('red');
	});

	it('returns unknown when there is no reading', () => {
		expect(assessHealthIndicator('heart-rate', null).severity).toBe('unknown');
		expect(assessHealthIndicator('blood-pressure', null).severity).toBe('unknown');
	});
});

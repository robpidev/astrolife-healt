import { describe, expect, it } from 'vitest';
import type { MeasurementInput } from '#lib/interfaces/measurement.js';

process.env.DATABASE_PATH = ':memory:';

const {
	createMeasurement,
	deleteMeasurement,
	getMeasurement,
	listMeasurements,
	updateMeasurement
} = await import('#lib/server/measurements.js');

const BASE: MeasurementInput = {
	measured_at: '2024-05-10',
	mass_kg: 70,
	height_cm: 175,
	systolic: 120,
	diastolic: 80,
	pulse: 68,
	notes: null
};

describe('measurements repository', () => {
	it('creates, reads, updates and deletes a measurement', () => {
		const id = createMeasurement(BASE);

		expect(id).toBeGreaterThan(0);

		const created = getMeasurement(id);
		expect(created).toMatchObject({ ...BASE, id });

		expect(updateMeasurement(id, { ...BASE, mass_kg: 71.5 })).toBe(true);
		expect(getMeasurement(id)?.mass_kg).toBe(71.5);

		expect(deleteMeasurement(id)).toBe(true);
		expect(getMeasurement(id)).toBeNull();
	});

	it('orders measurements by date descending', () => {
		const older = createMeasurement({ ...BASE, measured_at: '2024-01-01' });
		const newer = createMeasurement({ ...BASE, measured_at: '2024-06-01' });

		const dates = listMeasurements().map((measurement) => measurement.measured_at);

		expect(dates.indexOf('2024-06-01')).toBeLessThan(dates.indexOf('2024-01-01'));

		deleteMeasurement(older);
		deleteMeasurement(newer);
	});

	it('returns false when updating a missing row', () => {
		expect(updateMeasurement(999_999, BASE)).toBe(false);
	});

	it('enforces range checks at the database level', () => {
		expect(() => createMeasurement({ ...BASE, mass_kg: 900 })).toThrow();
		expect(() => createMeasurement({ ...BASE, pulse: 300 })).toThrow();
		expect(() => createMeasurement({ ...BASE, systolic: 70, diastolic: 120 })).toThrow();
	});
});

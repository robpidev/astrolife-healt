import { describe, expect, it } from 'vitest';
import { localToday, parseMeasurementForm } from './validation';

const BASE = {
	measured_at: '2024-05-10',
	mass_kg: '70',
	height_cm: '175',
	systolic: '',
	diastolic: '',
	pulse: '',
	notes: ''
};

function makeForm(overrides: Record<string, string> = {}): FormData {
	const form = new FormData();

	for (const [key, value] of Object.entries({ ...BASE, ...overrides })) {
		form.set(key, value);
	}

	return form;
}

function tomorrow(): string {
	const today = localToday();
	const date = new Date(`${today}T00:00:00`);
	date.setDate(date.getDate() + 1);

	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

describe('parseMeasurementForm', () => {
	it('accepts a valid measurement', () => {
		const result = parseMeasurementForm(makeForm());

		expect(result.errors).toEqual({});
		expect(result.data).toEqual({
			measured_at: '2024-05-10',
			mass_kg: 70,
			height_cm: 175,
			systolic: null,
			diastolic: null,
			pulse: null,
			notes: null
		});
	});

	it('accepts comma decimal separators and normalizes notes', () => {
		const result = parseMeasurementForm(
			makeForm({ mass_kg: '70,45', height_cm: '175,2', notes: '  control  ' })
		);

		expect(result.data?.mass_kg).toBe(70.5);
		expect(result.data?.height_cm).toBe(175.2);
		expect(result.data?.notes).toBe('control');
	});

	it('requires mass and height', () => {
		const result = parseMeasurementForm(makeForm({ mass_kg: '', height_cm: '' }));

		expect(result.data).toBeNull();
		expect(result.errors.mass_kg).toBeDefined();
		expect(result.errors.height_cm).toBeDefined();
	});

	it('rejects out-of-range values', () => {
		const result = parseMeasurementForm(makeForm({ mass_kg: '800', height_cm: '12' }));

		expect(result.data).toBeNull();
		expect(result.errors.mass_kg).toContain('1 y 500');
		expect(result.errors.height_cm).toContain('30 y 300');
	});

	it('rejects future dates', () => {
		const result = parseMeasurementForm(makeForm({ measured_at: tomorrow() }));

		expect(result.data).toBeNull();
		expect(result.errors.measured_at).toContain('futura');
	});

	it('rejects invalid calendar dates', () => {
		const result = parseMeasurementForm(makeForm({ measured_at: '2024-02-31' }));

		expect(result.data).toBeNull();
		expect(result.errors.measured_at).toContain('válida');
	});

	it('requires systolic and diastolic together', () => {
		const result = parseMeasurementForm(makeForm({ systolic: '120' }));

		expect(result.data).toBeNull();
		expect(result.errors.systolic).toBeDefined();
		expect(result.errors.diastolic).toBeDefined();
	});

	it('rejects systolic lower than diastolic', () => {
		const result = parseMeasurementForm(makeForm({ systolic: '80', diastolic: '120' }));

		expect(result.data).toBeNull();
		expect(result.errors.systolic).toContain('mayor');
	});

	it('accepts complete pressure and pulse values', () => {
		const result = parseMeasurementForm(
			makeForm({ systolic: '120', diastolic: '80', pulse: '68' })
		);

		expect(result.errors).toEqual({});
		expect(result.data?.systolic).toBe(120);
		expect(result.data?.diastolic).toBe(80);
		expect(result.data?.pulse).toBe(68);
	});

	it('rejects notes over 500 characters', () => {
		const result = parseMeasurementForm(makeForm({ notes: 'a'.repeat(501) }));

		expect(result.data).toBeNull();
		expect(result.errors.notes).toContain('500');
	});

	it('rejects pulse outside the supported range', () => {
		const result = parseMeasurementForm(makeForm({ pulse: '300' }));

		expect(result.data).toBeNull();
		expect(result.errors.pulse).toContain('20 y 250');
	});

	it('accepts an empty notes field as null', () => {
		const result = parseMeasurementForm(makeForm());

		expect(result.data?.notes).toBeNull();
	});
});

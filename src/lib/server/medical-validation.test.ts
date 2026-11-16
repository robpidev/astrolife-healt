import { describe, expect, it } from 'vitest';
import { parseMedicalEvaluationForm } from '#lib/server/medical-validation.js';

function form(overrides: Record<string, string> = {}): FormData {
	const values = {
		kind: 'periodic',
		evaluated_at: '2026-01-10',
		summary: 'Annual fitness review',
		notes: '',
		...overrides
	};
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe('parseMedicalEvaluationForm', () => {
	it('accepts a complete evaluation', () => {
		expect(parseMedicalEvaluationForm(form()).data).toEqual({
			kind: 'periodic',
			evaluated_at: '2026-01-10',
			summary: 'Annual fitness review',
			notes: null
		});
	});

	it('rejects an unknown evaluation type', () => {
		expect(parseMedicalEvaluationForm(form({ kind: 'annual' })).errors.kind).toBe(
			'Choose a valid evaluation type.'
		);
	});

	it('rejects impossible and far-future dates', () => {
		expect(
			parseMedicalEvaluationForm(form({ evaluated_at: '2026-02-30' })).errors.evaluated_at
		).toBeTruthy();
		const year = new Date().getUTCFullYear() + 2;
		expect(
			parseMedicalEvaluationForm(form({ evaluated_at: `${year}-01-01` })).errors.evaluated_at
		).toBeTruthy();
	});

	it('requires a summary and enforces length limits', () => {
		expect(parseMedicalEvaluationForm(form({ summary: '   ' })).errors.summary).toBe(
			'Enter a summary.'
		);
		expect(parseMedicalEvaluationForm(form({ summary: 'x'.repeat(201) })).errors.summary).toBe(
			'Summary must be 200 characters or fewer.'
		);
		expect(parseMedicalEvaluationForm(form({ notes: 'x'.repeat(501) })).errors.notes).toBe(
			'Notes must be 500 characters or fewer.'
		);
	});
});

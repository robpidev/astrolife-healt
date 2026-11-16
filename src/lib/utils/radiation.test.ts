import { describe, expect, it } from 'vitest';
import { radiationGuidelines } from '#lib/data/radiation.js';
import type { RadiationGuideline } from '#lib/interfaces/radiation.js';
import {
	appliedLimit,
	assessRadiation,
	buildRadiationSummary,
	worstRadiationStatus,
	type RadiationInput
} from './radiation';

const NOW = new Date('2026-11-16T12:00:00.000Z');

function input(overrides: Partial<RadiationInput> = {}): RadiationInput {
	return {
		intervals: [],
		organs: [],
		speEvents: [],
		environment: 'space',
		environmentSet: true,
		now: NOW,
		...overrides
	};
}

function guideline(id: string): RadiationGuideline {
	const found = radiationGuidelines.find((item) => item.id === id);
	if (!found) throw new Error(`Unknown guideline ${id}`);
	return found;
}

function assessment(summary: ReturnType<typeof buildRadiationSummary>, id: string) {
	const found = summary.assessments.find((item) => item.guideline.id === id);
	if (!found) throw new Error(`Unknown assessment ${id}`);
	return found;
}

describe('radiation guideline assessment', () => {
	it('sums the career dose from the interval and event readings', () => {
		const summary = buildRadiationSummary(
			input({
				intervals: [
					{ value: 200, measured_at: '2026-11-10T08:00:00.000Z' },
					{ value: 100, measured_at: '2026-11-12T08:00:00.000Z' }
				],
				speEvents: [{ value: 150, measured_at: '2026-11-16T08:00:00.000Z' }]
			})
		);

		expect(assessment(summary, 'career')).toMatchObject({
			measured: 450,
			applied_limit: 600,
			status: 'green',
			reading_count: 3
		});
	});

	it('does not count the zero row that opens an SPE event as a reading', () => {
		const summary = buildRadiationSummary(
			input({
				intervals: [{ value: 100, measured_at: '2026-11-15T08:00:00.000Z' }],
				speEvents: [
					{ value: 0, measured_at: '2026-11-15T09:00:00.000Z' },
					{ value: 80, measured_at: '2026-11-15T10:00:00.000Z' }
				]
			})
		);

		expect(assessment(summary, 'career')).toMatchObject({
			measured: 180,
			reading_count: 2
		});
	});

	it('flags the career dose red once the 600 mSv limit is reached', () => {
		const summary = buildRadiationSummary(
			input({ intervals: [{ value: 620, measured_at: '2026-11-15T08:00:00.000Z' }] })
		);

		expect(assessment(summary, 'career')).toMatchObject({ status: 'red', measured: 620 });
		expect(summary.overall).toBe('red');
	});

	it('ignores readings outside the 30-day organ window', () => {
		const summary = buildRadiationSummary(
			input({
				organs: [
					{ organ: 'bfo', value: 400, measured_at: '2026-09-01T08:00:00.000Z' },
					{ organ: 'bfo', value: 100, measured_at: '2026-11-15T08:00:00.000Z' }
				]
			})
		);

		expect(assessment(summary, 'bfo')).toMatchObject({ measured: 100, status: 'green' });
		expect(assessment(summary, 'lens')).toMatchObject({ measured: null, status: 'unknown' });
	});

	it('keeps the 250 mGy-Eq BFO limit distinct from the CNS one', () => {
		const summary = buildRadiationSummary(
			input({
				organs: [
					{ organ: 'bfo', value: 260, measured_at: '2026-11-15T08:00:00.000Z' },
					{ organ: 'cns', value: 260, measured_at: '2026-11-15T08:00:00.000Z' }
				]
			})
		);

		expect(assessment(summary, 'bfo').status).toBe('red');
		expect(assessment(summary, 'cns').status).toBe('green');
	});

	it('applies the tighter GCR limit on a planetary surface', () => {
		const onSurface = guideline('gcr');
		expect(appliedLimit(onSurface, 'space')).toBe(1.3);
		expect(appliedLimit(onSurface, 'planetary_surface')).toBe(0.9);

		// 1.0 mSv/day passes the free-space limit but breaks the surface one.
		const readings = [{ value: 1.0, measured_at: '2026-11-16T08:00:00.000Z' }];

		expect(assessment(buildRadiationSummary(input({ intervals: readings })), 'gcr').status).toBe(
			'green'
		);
		expect(
			assessment(
				buildRadiationSummary(input({ intervals: readings, environment: 'planetary_surface' })),
				'gcr'
			).status
		).toBe('red');
	});

	it('divides the GCR rate by measured days, not calendar days', () => {
		const summary = buildRadiationSummary(
			input({
				intervals: [
					{ value: 0.4, measured_at: '2026-11-14T08:00:00.000Z' },
					{ value: 0.4, measured_at: '2026-11-15T08:00:00.000Z' }
				]
			})
		);

		expect(assessment(summary, 'gcr').measured).toBe(0.4);
	});

	it('treats two readings on the same day as one logged day', () => {
		const summary = buildRadiationSummary(
			input({
				intervals: [
					{ value: 0.4, measured_at: '2026-11-16T08:00:00.000Z' },
					{ value: 0.4, measured_at: '2026-11-16T18:00:00.000Z' }
				]
			})
		);

		// Each reading is the dose for its part of the day, so the day is the
		// denominator; counting readings would halve the rate.
		expect(assessment(summary, 'gcr').measured).toBe(0.8);
	});

	it('reports GCR as unknown until the habitat is set', () => {
		const summary = buildRadiationSummary(
			input({
				intervals: [{ value: 0.5, measured_at: '2026-11-15T08:00:00.000Z' }],
				environmentSet: false
			})
		);

		expect(assessment(summary, 'gcr').status).toBe('unknown');
		expect(assessment(summary, 'gcr').protocol).toContain('Set the habitat');
		// A configured environment is what makes the rate assessable at all.
		expect(
			assessment(
				buildRadiationSummary(
					input({
						intervals: [{ value: 0.5, measured_at: '2026-11-15T08:00:00.000Z' }]
					})
				),
				'gcr'
			).status
		).toBe('green');
		expect(summary.environment_set).toBe(false);
		// The career total does not need the habitat and still evaluates.
		expect(assessment(summary, 'career').status).toBe('green');
	});

	it('marks a green GCR rate stale when the newest reading is too old', () => {
		const summary = buildRadiationSummary(
			input({ intervals: [{ value: 0.5, measured_at: '2026-11-12T08:00:00.000Z' }] })
		);

		// Inside the 7-day GCR window, but older than the 2-day freshness limit.
		expect(assessment(summary, 'gcr')).toMatchObject({ status: 'stale', stale: true });
		// A stale log must not look like a clean pass in the threat panel.
		expect(summary.overall).toBe('yellow');
	});

	it('keeps cumulative and window sums valid without a fresh reading', () => {
		const summary = buildRadiationSummary(
			input({
				intervals: [{ value: 10, measured_at: '2026-11-01T08:00:00.000Z' }],
				organs: [{ organ: 'lens', value: 50, measured_at: '2026-11-01T08:00:00.000Z' }]
			})
		);

		// A 30-day sum and a career total are facts about the past, so an old
		// log must not turn them into a caution.
		expect(assessment(summary, 'career').status).toBe('green');
		expect(assessment(summary, 'lens').status).toBe('green');
		expect(assessment(summary, 'career').stale).toBe(false);
	});

	it('counts the whole career, not only the last ten years', () => {
		const summary = buildRadiationSummary(
			input({
				// Older than the old 3650-day look-back, so it was silently dropped.
				intervals: [
					{ value: 200, measured_at: '2005-06-01T08:00:00.000Z' },
					{ value: 100, measured_at: '2026-11-15T08:00:00.000Z' }
				]
			})
		);

		expect(assessment(summary, 'career')).toMatchObject({ measured: 300, status: 'green' });
	});

	it('assesses the worst event, not the newest one', () => {
		const summary = buildRadiationSummary(
			input({
				speEvents: [
					{ value: 0, measured_at: '2026-10-01T08:00:00.000Z' },
					{ value: 300, measured_at: '2026-10-01T09:00:00.000Z' },
					{ value: 0, measured_at: '2026-11-15T08:00:00.000Z' },
					{ value: 40, measured_at: '2026-11-15T09:00:00.000Z' }
				]
			})
		);

		// The closed event breached 250 mSv; a quiet event afterwards must not
		// hide it, because the limit is per event.
		expect(assessment(summary, 'spe')).toMatchObject({ measured: 300, status: 'red' });
	});

	it('does not report a closed event as stale', () => {
		const summary = buildRadiationSummary(
			input({
				speEvents: [
					{ value: 0, measured_at: '2026-11-01T08:00:00.000Z' },
					{ value: 120, measured_at: '2026-11-01T09:00:00.000Z' }
				],
				speAlertActive: false
			})
		);

		expect(assessment(summary, 'spe')).toMatchObject({ status: 'green', stale: false });
	});

	it('sums the segments of a single solar particle event', () => {
		const summary = buildRadiationSummary(
			input({
				speEvents: [
					{ value: 0, measured_at: '2026-11-15T08:00:00.000Z' },
					{ value: 120, measured_at: '2026-11-15T09:00:00.000Z' },
					{ value: 60, measured_at: '2026-11-15T10:00:00.000Z' }
				]
			})
		);

		expect(assessment(summary, 'spe')).toMatchObject({ measured: 180, status: 'green' });
	});

	it('escalates the SPE alert near its effective dose limit', () => {
		const summary = buildRadiationSummary(
			input({
				speEvents: [
					{ value: 0, measured_at: '2026-11-15T08:00:00.000Z' },
					{ value: 210, measured_at: '2026-11-15T09:00:00.000Z' }
				]
			})
		);

		expect(assessment(summary, 'spe').status).toBe('yellow');
	});

	it('ranks the worst status so red beats yellow', () => {
		expect(worstRadiationStatus(['green', 'yellow', 'red'])).toBe('red');
		expect(worstRadiationStatus(['green', 'unknown'])).toBe('green');
		expect(worstRadiationStatus(['unknown'])).toBe('unknown');
	});
});

describe('single assessment', () => {
	it('formats the daily rate with two decimals', () => {
		const result = assessRadiation(
			guideline('gcr'),
			0.856,
			1.3,
			'2026-11-16T08:00:00.000Z',
			3,
			NOW
		);

		expect(result.display).toBe('0.86 mSv/day');
		expect(result.ratio).toBe(0.658);
	});

	it('has no measured value when nothing was logged', () => {
		const result = assessRadiation(guideline('career'), null, 600, null, 0, NOW);

		expect(result).toMatchObject({ status: 'unknown', display: null, ratio: null });
	});
});

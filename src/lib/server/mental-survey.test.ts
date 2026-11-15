import { beforeEach, describe, expect, it } from 'vitest';
import type { LikertValue } from '#lib/interfaces/mental-survey.js';

process.env.DATABASE_PATH = ':memory:';

const { getDb } = await import('#lib/server/db.js');
const {
	finishSurveyRun,
	getMetricTone,
	getSurveyRunAnswer,
	getSurveySummary,
	getTopicProgress,
	resolveAstronautId,
	saveLikertAnswer,
	saveSleepAnswer,
	startSurveyRun,
	surveyRunExists
} = await import('#lib/server/mental-survey.js');

const db = getDb();

function reset(): void {
	db.exec(`
		DELETE FROM mental_survey_responses;
		DELETE FROM mental_survey_sessions;
		DELETE FROM measurements;
		DELETE FROM crew_profiles;
		DELETE FROM astronauts;
	`);
	db.prepare("INSERT INTO astronauts(id, full_name) VALUES('a1', 'Test Astronaut')").run();
	db.prepare("INSERT INTO astronauts(id, full_name) VALUES('a2', 'Other Astronaut')").run();
	db.prepare("INSERT INTO crew_profiles(id, astronaut_id) VALUES(10, 'a1')").run();
	db.prepare("INSERT INTO crew_profiles(id, astronaut_id) VALUES(20, 'a2')").run();
}

function measurement(runId: number, topicId: string) {
	return db
		.prepare(
			"SELECT metric_code, value, source FROM measurements WHERE id = ? AND metric_code IN ('stress','mood','cognitive_accuracy','sleep_duration','fatigue')"
		)
		.get(`survey-run-${runId}-${topicId}`) as unknown as
		{ metric_code: string; value: number; source: string } | undefined;
}

describe('mental survey flows', () => {
	beforeEach(reset);

	it('closes a stress flow into a measurement', () => {
		const runId = startSurveyRun(10);
		expect(runId).not.toBeNull();

		expect(saveLikertAnswer(10, runId!, 7, 4 as LikertValue)).toBe(true);
		expect(saveLikertAnswer(10, runId!, 8, 5 as LikertValue)).toBe(true);
		expect(finishSurveyRun(10, runId!, 'stress')).toBe(true);

		expect(measurement(runId!, 'stress')).toMatchObject({
			metric_code: 'stress',
			value: 9,
			source: 'manual'
		});
		expect(getMetricTone(10, 'stress')).toBe('red');
		expect(getTopicProgress(10, 'stress')).toEqual({ answered: 2, total: 2 });
	});

	it('updates a revisited question instead of stacking rows', () => {
		const runId = startSurveyRun(10)!;
		saveLikertAnswer(10, runId, 7, 1 as LikertValue);
		saveLikertAnswer(10, runId, 7, 5 as LikertValue);

		const rows = db
			.prepare('SELECT count(*) AS total FROM mental_survey_responses WHERE session_id = ?')
			.get(runId) as unknown as { total: number };

		expect(rows.total).toBe(1);
		expect(getSurveyRunAnswer(10, runId, 7)).toBe(5);
	});

	it('finishes a duration flow with the sleep control question', () => {
		const runId = startSurveyRun(10)!;
		for (const [item, answer] of [
			[1, 5],
			[3, 1],
			[5, 4]
		] as const) {
			expect(saveLikertAnswer(10, runId, item, answer)).toBe(true);
		}
		expect(saveSleepAnswer(10, runId, '7-to-9')).toBe(true);
		expect(finishSurveyRun(10, runId, 'duration')).toBe(true);

		expect(measurement(runId, 'duration')).toMatchObject({
			metric_code: 'sleep_duration',
			value: 8
		});
		expect(getMetricTone(10, 'duration')).toBe('green');
		expect(getTopicProgress(10, 'duration')).toEqual({ answered: 4, total: 4 });
		expect(getSurveySummary(10)?.sleep_hours?.id).toBe('7-to-9');
	});

	it('keeps a run private to its astronaut', () => {
		const runId = startSurveyRun(10)!;

		expect(surveyRunExists(20, runId)).toBe(false);
		expect(saveLikertAnswer(20, runId, 7, 4 as LikertValue)).toBe(false);
		expect(saveSleepAnswer(20, runId, '7-to-9')).toBe(false);
		expect(getSurveyRunAnswer(20, runId, 7)).toBeNull();
		expect(finishSurveyRun(20, runId, 'stress')).toBe(false);
	});

	it('does not derive a metric from a partial flow', () => {
		const runId = startSurveyRun(10)!;
		saveLikertAnswer(10, runId, 7, 4 as LikertValue);

		expect(finishSurveyRun(10, runId, 'stress')).toBe(false);
		expect(measurement(runId, 'stress')).toBeUndefined();
	});

	it('re-finishing the same run updates the single measurement', () => {
		const runId = startSurveyRun(10)!;
		saveLikertAnswer(10, runId, 9, 2 as LikertValue);
		finishSurveyRun(10, runId, 'concentration');
		saveLikertAnswer(10, runId, 9, 5 as LikertValue);
		finishSurveyRun(10, runId, 'concentration');

		const rows = db
			.prepare(
				"SELECT count(*) AS total, max(value) AS value FROM measurements WHERE metric_code = 'cognitive_accuracy'"
			)
			.get() as unknown as { total: number; value: number };

		expect(rows).toEqual({ total: 1, value: 100 });
	});

	it('does not let one run overwrite another topic metric', () => {
		const runId = startSurveyRun(10)!;
		saveLikertAnswer(10, runId, 7, 4 as LikertValue);
		saveLikertAnswer(10, runId, 8, 5 as LikertValue);
		expect(finishSurveyRun(10, runId, 'stress')).toBe(true);

		saveLikertAnswer(10, runId, 6, 2 as LikertValue);
		saveLikertAnswer(10, runId, 10, 3 as LikertValue);
		expect(finishSurveyRun(10, runId, 'mood')).toBe(true);

		expect(measurement(runId, 'stress')).toMatchObject({ metric_code: 'stress', value: 9 });
		expect(measurement(runId, 'mood')).toMatchObject({ metric_code: 'mood', value: 2.5 });
	});

	it('reports the newest answer per item in the summary', () => {
		const first = startSurveyRun(10)!;
		saveLikertAnswer(10, first, 6, 2 as LikertValue);
		saveLikertAnswer(10, first, 10, 5 as LikertValue);

		const second = startSurveyRun(10)!;
		saveLikertAnswer(10, second, 6, 5 as LikertValue);

		// The later run reuses the same second, so the id breaks the tie.
		expect(getSurveySummary(10)?.blocks[0]).toMatchObject({ answered: [6, 10] });
		expect(getSurveyRunAnswer(10, second, 10)).toBeNull();
	});

	it('rejects unknown profiles and runs', () => {
		expect(resolveAstronautId(999)).toBeNull();
		expect(startSurveyRun(999)).toBeNull();
		expect(saveLikertAnswer(10, 999, 7, 4 as LikertValue)).toBe(false);
		expect(getSurveySummary(999)).toBeNull();
		expect(getTopicProgress(999, 'stress')).toEqual({ answered: 0, total: 2 });
	});
});

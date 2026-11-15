import type { StatementSync } from 'node:sqlite';
import { findMentalSurveyTopic, mentalSurveyTopicMetricCodes } from '#lib/data/mentalSurvey.js';
import type {
	LikertValue,
	MentalSurveyAnswers,
	MentalSurveyBlockResult,
	MentalSurveySummary,
	MentalSurveyTopicId,
	MentalSurveyTopicProgress,
	SurveyTone
} from '#lib/interfaces/mental-survey.js';
import { getDb } from '#lib/server/db.js';
import {
	answeredBlockIds,
	findSleepHoursOption,
	metricTone,
	scoreBlock,
	topicMetricValue,
	worstTone
} from '#lib/utils/mental-survey.js';

interface ResponseRow {
	item_number: number;
	answer: number;
}

interface RunRow {
	astronaut_id: string;
	recorded_at: string;
	sleep_hours: string | null;
}

interface SessionRow {
	recorded_at: string;
	sleep_hours: string | null;
}

interface Statements {
	astronautId: StatementSync;
	insertSession: StatementSync;
	insertResponse: StatementSync;
	removeResponse: StatementSync;
	runById: StatementSync;
	runAnswer: StatementSync;
	runAnswers: StatementSync;
	setSleep: StatementSync;
	upsertMetric: StatementSync;
	latestPerItem: StatementSync;
	latestSleepSession: StatementSync;
	metricLatest: StatementSync;
}

let statements: Statements | null = null;

function getStatements(): Statements {
	if (statements) return statements;

	const db = getDb();

	statements = {
		astronautId: db.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?'),
		insertSession: db.prepare(
			'INSERT INTO mental_survey_sessions(astronaut_id, recorded_at, sleep_hours, note) VALUES (?, ?, ?, NULL)'
		),
		insertResponse: db.prepare(
			'INSERT INTO mental_survey_responses(session_id, astronaut_id, recorded_at, item_number, answer) VALUES (?, ?, ?, ?, ?)'
		),
		// Revisiting a question replaces its answer instead of stacking rows.
		removeResponse: db.prepare(
			'DELETE FROM mental_survey_responses WHERE session_id = ? AND item_number = ?'
		),
		runById: db.prepare(
			'SELECT astronaut_id, recorded_at, sleep_hours FROM mental_survey_sessions WHERE id = ?'
		),
		runAnswer: db.prepare(
			'SELECT answer FROM mental_survey_responses WHERE session_id = ? AND item_number = ? ORDER BY id DESC LIMIT 1'
		),
		runAnswers: db.prepare(
			'SELECT item_number, answer FROM mental_survey_responses WHERE session_id = ?'
		),
		setSleep: db.prepare('UPDATE mental_survey_sessions SET sleep_hours = ? WHERE id = ?'),
		// The id includes the topic so a stray `?run=` from another flow can
		// never overwrite a different metric while keeping its code.
		upsertMetric:
			db.prepare(`INSERT INTO measurements(id, astronaut_id, metric_code, value, measured_at, source)
			VALUES (?, ?, ?, ?, ?, 'manual')
			ON CONFLICT(id) DO UPDATE SET value = excluded.value, measured_at = excluded.measured_at`),
		// A window function pins the newest row per item; `GROUP BY` with bare
		// columns would rely on an implementation detail of SQLite.
		latestPerItem: db.prepare(`SELECT item_number, answer FROM (
				SELECT item_number, answer,
					ROW_NUMBER() OVER (PARTITION BY item_number ORDER BY recorded_at DESC, id DESC) AS rn
				FROM mental_survey_responses
				WHERE astronaut_id = ?
			) WHERE rn = 1`),
		latestSleepSession: db.prepare(`SELECT recorded_at, sleep_hours FROM mental_survey_sessions
			WHERE astronaut_id = ? AND sleep_hours IS NOT NULL
			ORDER BY recorded_at DESC, id DESC LIMIT 1`),
		metricLatest: db.prepare(`SELECT value FROM measurements
			WHERE astronaut_id = ? AND metric_code = ?
			ORDER BY measured_at DESC, id DESC LIMIT 1`)
	};

	return statements;
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function localTimestamp(): string {
	const now = new Date();

	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/** Profile id → astronaut id; `null` for an unknown profile. */
export function resolveAstronautId(profileId: number): string | null {
	const row = getStatements().astronautId.get(profileId) as unknown as
		{ astronaut_id: string } | undefined;

	return row?.astronaut_id ?? null;
}

/** A run is only usable by the astronaut who started it. */
function ownedRun(profileId: number, runId: number): RunRow | null {
	const astronautId = resolveAstronautId(profileId);
	if (!astronautId) return null;

	const row = getStatements().runById.get(runId) as unknown as RunRow | undefined;

	return row && row.astronaut_id === astronautId ? row : null;
}

export function surveyRunExists(profileId: number, runId: number): boolean {
	return ownedRun(profileId, runId) !== null;
}

/** Creates the session that groups every answer of one topic flow. */
export function startSurveyRun(profileId: number): number | null {
	const astronautId = resolveAstronautId(profileId);
	if (!astronautId) return null;

	const result = getStatements().insertSession.run(astronautId, localTimestamp(), null);

	return Number(result.lastInsertRowid);
}

/**
 * Saves one Likert answer. The session timestamp is reused for every answer so
 * the whole flow reads as one submission in the history.
 */
export function saveLikertAnswer(
	profileId: number,
	runId: number,
	itemNumber: number,
	answer: LikertValue
): boolean {
	const run = ownedRun(profileId, runId);
	if (!run) return false;
	if (!Number.isInteger(itemNumber) || itemNumber < 1 || itemNumber > 10) return false;

	const db = getDb();
	const statementsForRun = getStatements();

	db.exec('BEGIN IMMEDIATE');
	try {
		statementsForRun.removeResponse.run(runId, itemNumber);
		statementsForRun.insertResponse.run(
			runId,
			run.astronaut_id,
			run.recorded_at,
			itemNumber,
			answer
		);
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return true;
}

/** Stores the hours-slept control question on its own session. */
export function saveSleepAnswer(profileId: number, runId: number, sleepHours: string): boolean {
	if (!ownedRun(profileId, runId)) return false;

	const option = findSleepHoursOption(sleepHours);
	if (!option) return false;

	getStatements().setSleep.run(option.id, runId);

	return true;
}

/** Answer already stored in this run, so the step page can prefill it. */
export function getSurveyRunAnswer(
	profileId: number,
	runId: number,
	itemNumber: number
): LikertValue | null {
	if (!ownedRun(profileId, runId)) return null;

	const row = getStatements().runAnswer.get(runId, itemNumber) as unknown as
		{ answer: number } | undefined;

	return row ? (row.answer as LikertValue) : null;
}

export function getSurveyRunSleepHours(profileId: number, runId: number): string | null {
	return ownedRun(profileId, runId)?.sleep_hours ?? null;
}

/**
 * Closes a flow by writing the sub-item reading into `measurements`. The survey
 * becomes the source of the card, its tone and its trend, and re-finishing the
 * same run updates the single row instead of stacking points.
 */
export function finishSurveyRun(
	profileId: number,
	runId: number,
	topicId: MentalSurveyTopicId
): boolean {
	const run = ownedRun(profileId, runId);
	const topic = findMentalSurveyTopic(topicId);
	if (!run || !topic) return false;

	const rows = getStatements().runAnswers.all(runId) as unknown as ResponseRow[];
	const answers: MentalSurveyAnswers = {};
	for (const row of rows) answers[row.item_number] = row.answer as LikertValue;

	const sleepOption = run.sleep_hours ? findSleepHoursOption(run.sleep_hours) : null;
	const value = topicMetricValue(topicId, answers, sleepOption);
	if (value === null) return false;

	const db = getDb();

	db.exec('BEGIN IMMEDIATE');
	try {
		getStatements().upsertMetric.run(
			`survey-run-${runId}-${topicId}`,
			run.astronaut_id,
			mentalSurveyTopicMetricCodes[topicId],
			value,
			run.recorded_at
		);
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return true;
}

function latestAnswers(astronautId: string): MentalSurveyAnswers {
	const rows = getStatements().latestPerItem.all(astronautId) as unknown as ResponseRow[];
	const answers: MentalSurveyAnswers = {};
	for (const row of rows) answers[row.item_number] = row.answer as LikertValue;

	return answers;
}

/** Progress of one topic, counting the latest answer per question. */
export function getTopicProgress(
	profileId: number,
	topicId: MentalSurveyTopicId
): MentalSurveyTopicProgress {
	const topic = findMentalSurveyTopic(topicId);
	if (!topic) return { answered: 0, total: 0 };

	const total = topic.questions.length;
	const astronautId = resolveAstronautId(profileId);
	if (!astronautId) return { answered: 0, total };

	const answeredItems = new Set(
		(getStatements().latestPerItem.all(astronautId) as unknown as ResponseRow[]).map(
			(row) => row.item_number
		)
	);
	const sleepAnswered = getStatements().latestSleepSession.get(astronautId) !== undefined;

	const answered = topic.questions.filter((question) =>
		question.kind === 'sleep_hours'
			? sleepAnswered
			: question.item_number !== null && answeredItems.has(question.item_number)
	).length;

	return { answered, total };
}

/** Latest answers per item, so flows answered on different days still combine. */
export function getSurveySummary(profileId: number): MentalSurveySummary | null {
	const astronautId = resolveAstronautId(profileId);
	if (!astronautId) return null;

	const statementsForQuery = getStatements();
	const answers = latestAnswers(astronautId);
	if (Object.keys(answers).length === 0) return null;

	const blocks: MentalSurveyBlockResult[] = answeredBlockIds(answers).map((blockId) =>
		scoreBlock(blockId, answers)
	);

	// The control question is optional per run, so the summary reports the
	// latest session that actually answered it.
	const sleepSession = statementsForQuery.latestSleepSession.get(astronautId) as unknown as
		SessionRow | undefined;
	const sleepOption = sleepSession?.sleep_hours
		? findSleepHoursOption(sleepSession.sleep_hours)
		: null;

	return {
		recorded_at: sleepSession?.recorded_at ?? '',
		blocks,
		sleep_hours: sleepOption,
		sleep_tone: sleepOption ? sleepOption.alert : null
	};
}

export const MENTAL_METRIC_CODES: Record<string, string> = {
	stress: 'stress',
	mood: 'mood',
	concentration: 'cognitive_accuracy',
	duration: 'sleep_duration',
	fatigue: 'fatigue'
};

/** Traffic-light state derived from the stored measurements, shared by every view. */
export function getMetricTone(profileId: number, metricId: string): SurveyTone | null {
	const astronautId = resolveAstronautId(profileId);
	if (!astronautId) return null;

	const metricCode = MENTAL_METRIC_CODES[metricId];
	if (!metricCode) return null;

	const row = getStatements().metricLatest.get(astronautId, metricCode) as unknown as
		{ value: number | null } | undefined;

	return typeof row?.value === 'number' ? metricTone(metricId, row.value) : null;
}

export function getMentalMetricTones(profileId: number): Record<string, SurveyTone | null> {
	return {
		stress: getMetricTone(profileId, 'stress'),
		mood: getMetricTone(profileId, 'mood'),
		concentration: getMetricTone(profileId, 'concentration'),
		duration: getMetricTone(profileId, 'duration'),
		fatigue: getMetricTone(profileId, 'fatigue')
	};
}

/** Worst traffic-light state across the survey blocks and the sleep control. */
export function getSurveyTone(summary: MentalSurveySummary | null): SurveyTone | null {
	if (!summary) return null;

	const tones = summary.blocks.map((block) => block.tone);
	if (summary.sleep_tone) tones.push(summary.sleep_tone);

	return tones.length === 0 ? null : worstTone(tones);
}

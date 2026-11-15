import { error, fail, redirect } from '@sveltejs/kit';
import { findMentalSurveyTopic, sleepHoursOptions } from '#lib/data/mentalSurvey.js';
import type {
	LikertValue,
	MentalSurveyStepActionData,
	MentalSurveyTopic
} from '#lib/interfaces/mental-survey.js';
import {
	finishSurveyRun,
	getSurveyRunAnswer,
	getSurveyRunSleepHours,
	resolveAstronautId,
	saveLikertAnswer,
	saveSleepAnswer,
	startSurveyRun,
	surveyRunExists
} from '#lib/server/mental-survey.js';
import type { Actions, PageServerLoad } from './$types';

const SLEEP_IDS = sleepHoursOptions.map((option) => option.id);

function parseStep(raw: string, total: number): number | null {
	if (!/^\d+$/.test(raw)) return null;

	const step = Number(raw);

	return step >= 1 && step <= total ? step : null;
}

function stepHref(profileId: string, topic: string, step: number, runId: number | null): string {
	const query = runId === null ? '' : `?run=${runId}`;

	return `/crew/${profileId}/measurements/mental/survey/${topic}/${step}${query}`;
}

function readRun(raw: string): number | null {
	if (!/^\d+$/.test(raw)) return null;

	const runId = Number(raw);

	return runId > 0 ? runId : null;
}

/** Unknown topic or step → 404; a stale run restarts the flow from question 1. */
export const load: PageServerLoad = async ({ parent, params, url }) => {
	const { astronaut } = await parent();
	const topic: MentalSurveyTopic | null = findMentalSurveyTopic(params.topic);
	if (!topic) error(404, 'Survey topic not found');

	const step = parseStep(params.step, topic.questions.length);
	if (step === null) error(404, 'Question not found');

	let runId = readRun(url.searchParams.get('run') ?? '');
	if (runId !== null && !surveyRunExists(astronaut.id, runId)) runId = null;
	if (step > 1 && runId === null) {
		redirect(303, stepHref(params.id, topic.id, 1, null));
	}

	const question = topic.questions[step - 1];

	return {
		astronaut,
		topic,
		question,
		step,
		total: topic.questions.length,
		runId,
		answer:
			runId !== null && question.item_number !== null
				? getSurveyRunAnswer(astronaut.id, runId, question.item_number)
				: null,
		sleepHours:
			runId !== null && question.kind === 'sleep_hours'
				? getSurveyRunSleepHours(astronaut.id, runId)
				: null
	};
};

export const actions: Actions = {
	answer: async ({ request, params }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		const topic = findMentalSurveyTopic(params.topic);

		if (!Number.isFinite(profileId) || !resolveAstronautId(profileId) || !topic) {
			return fail(404, {
				errors: { value: 'Survey not found' }
			} satisfies MentalSurveyStepActionData);
		}

		const step = parseStep(params.step, topic.questions.length);
		if (step === null) {
			return fail(404, {
				errors: { value: 'Question not found' }
			} satisfies MentalSurveyStepActionData);
		}

		const form = await request.formData();
		const raw = String(form.get('value') ?? '').trim();
		const invalid = (message: string) =>
			fail(400, {
				values: { value: raw },
				errors: { value: message }
			} satisfies MentalSurveyStepActionData);

		let runId = readRun(String(form.get('run') ?? ''));
		if (runId !== null && !surveyRunExists(profileId, runId)) runId = null;
		if (step > 1 && runId === null) redirect(303, stepHref(params.id, topic.id, 1, null));

		const question = topic.questions[step - 1];

		if (question.kind === 'sleep_hours') {
			if (!SLEEP_IDS.includes(raw)) return invalid('Choose how many hours you slept');
		} else {
			const answer = Number(raw);
			if (!Number.isInteger(answer) || answer < 1 || answer > 5) {
				return invalid('Choose one of the five answers');
			}
		}

		if (runId === null) runId = startSurveyRun(profileId);
		if (runId === null) return invalid('Could not save the survey');

		const saved =
			question.kind === 'sleep_hours'
				? saveSleepAnswer(profileId, runId, raw)
				: question.item_number !== null &&
					saveLikertAnswer(profileId, runId, question.item_number, Number(raw) as LikertValue);

		if (!saved) return invalid('Could not save the survey');

		if (step < topic.questions.length) {
			redirect(303, stepHref(params.id, topic.id, step + 1, runId));
		}

		if (!finishSurveyRun(profileId, runId, topic.id)) {
			return invalid('Could not save the survey');
		}

		redirect(303, `/crew/${params.id}/measurements/mental/${topic.id}?saved=1`);
	}
};

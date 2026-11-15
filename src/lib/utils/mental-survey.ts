import { mentalSurveyBlocks, sleepHoursOptions } from '#lib/data/mentalSurvey.js';
import type {
	LikertValue,
	MentalSurveyAnswers,
	MentalSurveyBlockId,
	MentalSurveyBlockResult,
	MentalSurveyTopicId,
	MentalSurveyValues,
	SleepHoursOption,
	SurveyTone
} from '#lib/interfaces/mental-survey.js';

const TONE_RANK: Record<SurveyTone, number> = { green: 0, yellow: 1, red: 2 };

function roundOne(value: number): number {
	return Math.round(value * 10) / 10;
}

/** A neutral answer (3) keeps the block at follow-up rather than a green pass. */
export function likertTone(itemType: 'positive' | 'reverse', answer: LikertValue): SurveyTone {
	if (itemType === 'positive') return answer >= 4 ? 'green' : 'yellow';

	// Reverse items read as risk when frequent; the SMIA document leaves 1-2
	// undefined and the suggested reading is favourable, hence green.
	if (answer >= 4) return 'red';
	if (answer <= 2) return 'green';

	return 'yellow';
}

/**
 * Single source of truth for the card badges: the same value can never show
 * "Alert" on one screen and "Good" on another.
 */
export function metricTone(metricId: string, value: number): SurveyTone | null {
	switch (metricId) {
		case 'stress':
			return value <= 4 ? 'green' : value >= 8 ? 'red' : 'yellow';
		case 'mood':
			return value >= 4 ? 'green' : value <= 2 ? 'red' : 'yellow';
		case 'concentration':
			return value >= 90 ? 'green' : value < 70 ? 'red' : 'yellow';
		case 'duration':
			// The SMIA recommends 7-9 hours; severe deprivation is the only red.
			return value < 5 ? 'red' : value >= 7 && value <= 9 ? 'green' : 'yellow';
		case 'fatigue':
			return value <= 3 ? 'green' : value >= 7 ? 'red' : 'yellow';
		default:
			return null;
	}
}

/** Risk items count from their favourable end: 5 becomes 1, 1 becomes 5. */
export function invertLikert(answer: LikertValue): number {
	return 6 - answer;
}

export function worstTone(tones: readonly SurveyTone[]): SurveyTone {
	return tones.reduce<SurveyTone>(
		(worst, tone) => (TONE_RANK[tone] > TONE_RANK[worst] ? tone : worst),
		'green'
	);
}

/**
 * Scores one block. The SMIA document defines no aggregate cut-off, so the
 * suggested approach is used: invert the risk items and average the answers,
 * then let the worst item decide the colour.
 */
export function scoreBlock(
	blockId: MentalSurveyBlockId,
	answers: MentalSurveyAnswers
): MentalSurveyBlockResult {
	const block = mentalSurveyBlocks.find((item) => item.id === blockId);
	if (!block)
		return { block_id: blockId, answered: [], score: null, tone: 'green', risk_items: [] };

	const answered = block.items
		.map((item) => ({ item, answer: answers[item.number] }))
		.filter(
			(entry): entry is { item: (typeof block.items)[number]; answer: LikertValue } =>
				entry.answer !== undefined
		);

	if (answered.length === 0) {
		return { block_id: blockId, answered: [], score: null, tone: 'green', risk_items: [] };
	}

	const tones = answered.map((entry) => likertTone(entry.item.type, entry.answer));
	const scored = answered.map((entry) =>
		entry.item.type === 'reverse' ? invertLikert(entry.answer) : entry.answer
	);
	const score = roundOne(scored.reduce((total, value) => total + value, 0) / scored.length);

	return {
		block_id: blockId,
		answered: answered.map((entry) => entry.item.number),
		score,
		tone: worstTone(tones),
		risk_items: answered
			.filter((entry) => likertTone(entry.item.type, entry.answer) !== 'green')
			.map((entry) => entry.item.number)
	};
}

/** Blocks whose items were answered, in survey order. */
export function answeredBlockIds(answers: MentalSurveyAnswers): MentalSurveyBlockId[] {
	return mentalSurveyBlocks
		.filter((block) => block.items.some((item) => answers[item.number] !== undefined))
		.map((block) => block.id);
}

export function findSleepHoursOption(id: string): SleepHoursOption | null {
	return sleepHoursOptions.find((option) => option.id === id) ?? null;
}

export function readAnswers(values: MentalSurveyValues): MentalSurveyAnswers {
	const answers: MentalSurveyAnswers = {};

	for (const block of mentalSurveyBlocks) {
		for (const item of block.items) {
			const raw = values.items[item.number];
			if (raw === undefined || raw === '') continue;

			const answer = Number(raw);
			if (answer >= 1 && answer <= 5) answers[item.number] = answer as LikertValue;
		}
	}

	return answers;
}

/**
 * The sleep band maps onto the existing sleep_duration metric so the Sleep area
 * and the survey share one series. The nominal 7-9 hour band reports the
 * recommended 8 hours; the other bands use their range midpoint.
 */
export function sleepHoursToDuration(option: SleepHoursOption): number {
	if (option.id === '7-to-9') return 8;
	if (option.max === null) return 10;
	if (option.id === 'under-5') return 4.5;

	return roundOne((option.min + option.max) / 2);
}

function meanOf(answers: MentalSurveyAnswers, numbers: readonly number[]): number | null {
	const values: number[] = [];

	for (const number of numbers) {
		const value = answers[number];
		if (value === undefined) return null;
		values.push(value);
	}

	return values.length === 0
		? null
		: roundOne(values.reduce((total, value) => total + value, 0) / values.length);
}

/**
 * Converts a completed topic into the metric it feeds, so the survey updates
 * the card, its tone and its trend. Stress and fatigue point in the risk
 * direction (0-10), concentration is a percentage and mood stays on 1-5.
 */
export function topicMetricValue(
	topicId: MentalSurveyTopicId,
	answers: MentalSurveyAnswers,
	sleepOption: SleepHoursOption | null
): number | null {
	switch (topicId) {
		case 'stress': {
			const mean = meanOf(answers, [7, 8]);
			return mean === null ? null : roundOne(mean * 2);
		}
		case 'fatigue': {
			const rested = answers[2];
			const drowsy = answers[4];
			if (rested === undefined || drowsy === undefined) return null;

			// Item 2 is positive (waking up rested) and item 4 is reverse
			// (daytime drowsiness), so invert item 2 to make a high value mean
			// poor rest. Averaging the raw answers would let "very rested"
			// raise fatigue instead of lowering it.
			return 6 - rested + drowsy;
		}
		case 'mood': {
			const mean = meanOf(answers, [6, 10]);
			return mean;
		}
		case 'concentration': {
			const answer = answers[9];
			return answer === undefined ? null : answer * 20;
		}
		case 'duration':
			return sleepOption ? sleepHoursToDuration(sleepOption) : null;
	}
}

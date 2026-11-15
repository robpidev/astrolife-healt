import { describe, expect, it } from 'vitest';
import { findMentalSurveyTopic, mentalSurveyTopics } from '#lib/data/mentalSurvey.js';
import type { LikertValue } from '#lib/interfaces/mental-survey.js';
import {
	answeredBlockIds,
	findSleepHoursOption,
	invertLikert,
	likertTone,
	metricTone,
	readAnswers,
	scoreBlock,
	sleepHoursToDuration,
	topicMetricValue,
	worstTone
} from '#lib/utils/mental-survey.js';

describe('likertTone', () => {
	it('greens positive items only when frequently met', () => {
		expect(likertTone('positive', 5)).toBe('green');
		expect(likertTone('positive', 4)).toBe('green');
		expect(likertTone('positive', 3)).toBe('yellow');
		expect(likertTone('positive', 2)).toBe('yellow');
		expect(likertTone('positive', 1)).toBe('yellow');
	});

	it('alerts on frequent reverse items and greens rare ones', () => {
		expect(likertTone('reverse', 5)).toBe('red');
		expect(likertTone('reverse', 4)).toBe('red');
		expect(likertTone('reverse', 3)).toBe('yellow');
		expect(likertTone('reverse', 2)).toBe('green');
		expect(likertTone('reverse', 1)).toBe('green');
	});
});

describe('invertLikert and worstTone', () => {
	it('mirrors the scale around three', () => {
		expect(invertLikert(5)).toBe(1);
		expect(invertLikert(3)).toBe(3);
		expect(invertLikert(1)).toBe(5);
	});

	it('keeps the most severe colour', () => {
		expect(worstTone(['green', 'yellow'])).toBe('yellow');
		expect(worstTone(['yellow', 'red', 'green'])).toBe('red');
		expect(worstTone([])).toBe('green');
	});
});

describe('scoreBlock', () => {
	it('averages inverted risk items in the rest block', () => {
		const result = scoreBlock('rest', { 1: 5, 2: 4, 3: 2, 4: 1, 5: 4 });

		// (5 + 4 + 4 + 5 + 4) / 5 = 4.4, every item favourable.
		expect(result).toMatchObject({ score: 4.4, tone: 'green', risk_items: [] });
	});

	it('flags the items that drive the alert', () => {
		const result = scoreBlock('mood', { 6: 2, 7: 5, 8: 1, 10: 3 });

		expect(result.risk_items).toEqual([6, 7, 10]);
		expect(result.tone).toBe('red');
	});

	it('returns an empty result for a block without answers', () => {
		expect(scoreBlock('focus', {})).toMatchObject({ answered: [], score: null });
	});

	it('ignores answers from other blocks', () => {
		expect(scoreBlock('focus', { 1: 5, 9: 4 }).answered).toEqual([9]);
	});
});

describe('survey answers', () => {
	it('lists the answered blocks in survey order', () => {
		const answers = { 1: 4 as LikertValue, 6: 5 as LikertValue, 9: 3 as LikertValue };

		expect(answeredBlockIds(answers)).toEqual(['rest', 'mood', 'focus']);
	});

	it('keeps only valid 1-5 values', () => {
		const answers = readAnswers({
			block: 'rest',
			sleep_hours: '',
			note: '',
			items: { 1: '5', 2: '', 3: '9', 4: 'abc' }
		});

		expect(answers).toEqual({ 1: 5 });
	});
});

describe('sleep hours control', () => {
	it('classifies every documented band', () => {
		expect(findSleepHoursOption('under-5')).toMatchObject({ alert: 'red' });
		expect(findSleepHoursOption('5-to-6-5')).toMatchObject({ alert: 'yellow' });
		expect(findSleepHoursOption('7-to-9')).toMatchObject({ alert: 'green' });
		expect(findSleepHoursOption('over-9')).toMatchObject({ alert: 'yellow' });
		expect(findSleepHoursOption('unknown')).toBeNull();
	});

	it('maps the chosen band to a sleep duration', () => {
		const option = findSleepHoursOption('7-to-9');

		expect(option && sleepHoursToDuration(option)).toBe(8);
		expect(
			findSleepHoursOption('under-5') && sleepHoursToDuration(findSleepHoursOption('under-5')!)
		).toBe(4.5);
	});
});

describe('metricTone', () => {
	it('scores the sleep metrics with the SMIA bands', () => {
		expect(metricTone('duration', 4)).toBe('red');
		expect(metricTone('duration', 5.8)).toBe('yellow');
		expect(metricTone('duration', 8)).toBe('green');
		expect(metricTone('duration', 10)).toBe('yellow');
		expect(metricTone('fatigue', 2)).toBe('green');
		expect(metricTone('fatigue', 6)).toBe('yellow');
		expect(metricTone('fatigue', 8)).toBe('red');
	});

	it('keeps the original thresholds for the other metrics', () => {
		expect(metricTone('stress', 4)).toBe('green');
		expect(metricTone('stress', 8)).toBe('red');
		expect(metricTone('mood', 4)).toBe('green');
		expect(metricTone('mood', 2)).toBe('red');
		expect(metricTone('concentration', 91)).toBe('green');
		expect(metricTone('concentration', 60)).toBe('red');
		expect(metricTone('unknown', 5)).toBeNull();
	});
});

describe('survey topics', () => {
	it('asks every statement exactly once across the sub-items', () => {
		const numbers = mentalSurveyTopics.flatMap((topic) =>
			topic.questions.flatMap((question) =>
				question.item_number === null ? [] : [question.item_number]
			)
		);

		expect([...numbers].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(new Set(numbers).size).toBe(numbers.length);
	});

	it('routes the control question through Duration only', () => {
		const withControl = mentalSurveyTopics
			.filter((topic) => topic.questions.some((question) => question.kind === 'sleep_hours'))
			.map((topic) => topic.id);

		expect(withControl).toEqual(['duration']);
		expect(findMentalSurveyTopic('stress')?.questions.map((question) => question.key)).toEqual([
			'item-7',
			'item-8'
		]);
		expect(findMentalSurveyTopic('nope')).toBeNull();
	});
});

describe('topicMetricValue', () => {
	it('converts each completed flow into its metric', () => {
		expect(topicMetricValue('stress', { 7: 4, 8: 5 }, null)).toBe(9);
		expect(topicMetricValue('fatigue', { 2: 2, 4: 4 }, null)).toBe(8);
		expect(topicMetricValue('mood', { 6: 5, 10: 4 }, null)).toBe(4.5);
		expect(topicMetricValue('concentration', { 9: 4 }, null)).toBe(80);
	});

	it('orients the positive rest item so good rest lowers fatigue', () => {
		// Rested (5) and not drowsy (1) is the best possible value.
		expect(topicMetricValue('fatigue', { 2: 5, 4: 1 }, null)).toBe(2);
		// Exhausted (1) and very drowsy (5) is the worst possible value.
		expect(topicMetricValue('fatigue', { 2: 1, 4: 5 }, null)).toBe(10);
	});

	it('uses the sleep band for Duration', () => {
		expect(topicMetricValue('duration', { 1: 5, 3: 1, 5: 4 }, findSleepHoursOption('7-to-9'))).toBe(
			8
		);
		expect(topicMetricValue('duration', { 1: 5, 3: 1, 5: 4 }, null)).toBeNull();
	});

	it('refuses to derive a value from a partial flow', () => {
		expect(topicMetricValue('stress', { 7: 4 }, null)).toBeNull();
		expect(topicMetricValue('concentration', {}, null)).toBeNull();
	});
});

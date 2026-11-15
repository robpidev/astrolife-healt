import type {
	LikertScaleOption,
	MentalSurveyBlock,
	MentalSurveyQuestion,
	MentalSurveyTopic,
	MentalSurveyTopicId,
	SleepHoursOption
} from '#lib/interfaces/mental-survey.js';

/**
 * SMIA mental-health survey split into three short blocks.
 *
 * Dividing by dimension lets the crew answer a few items at a time during a
 * mission instead of facing an 11-question form in one sitting. Statements are
 * kept in English; the constructs align with PSQI, ESS, PSS, DASS-21, PANAS and
 * MSPSS as described by the SMIA specification.
 */
export const mentalSurveyScale: readonly LikertScaleOption[] = [
	{ value: 1, label: 'Never' },
	{ value: 2, label: 'Almost never' },
	{ value: 3, label: 'Sometimes' },
	{ value: 4, label: 'Almost always' },
	{ value: 5, label: 'Always' }
];

export const mentalSurveyReferencePeriod = 'Last 24 hours or the last week of the mission';

export const mentalSurveyBlocks: readonly MentalSurveyBlock[] = [
	{
		id: 'rest',
		dimension: 'D1',
		name: 'Sleep hours and rest quality',
		summary: 'How well you slept and rested before this shift.',
		items: [
			{
				number: 1,
				statement:
					'I manage to meet the optimal rest range (7 to 9 hours per day) established for the mission.',
				type: 'positive',
				construct: 'sleep duration'
			},
			{
				number: 2,
				statement:
					'I wake up feeling rested and with enough physical energy to start my operational activities.',
				type: 'positive',
				construct: 'restorative sleep'
			},
			{
				number: 3,
				statement:
					'I have difficulty falling asleep or suffer frequent interruptions due to the spacecraft environment (noise, lighting or microgravity).',
				type: 'reverse',
				construct: 'insomnia and environmental disturbances'
			},
			{
				number: 4,
				statement:
					'I experience excessive drowsiness or tiredness during the day that affects my performance on critical tasks.',
				type: 'reverse',
				construct: 'daytime sleepiness'
			},
			{
				number: 5,
				statement:
					'I feel that my sleep cycle stays synchronized with the schedules set by mission control.',
				type: 'positive',
				construct: 'circadian synchronization'
			}
		]
	},
	{
		id: 'mood',
		dimension: 'D2',
		name: 'Mood and emotional stability',
		summary: 'How you feel emotionally and how you relate to the crew.',
		items: [
			{
				number: 6,
				statement:
					'I maintain a positive, stable and motivated mood in relation to the mission objectives.',
				type: 'positive',
				construct: 'positive affect and motivation'
			},
			{
				number: 7,
				statement:
					'I experience episodes of irritability or impatience toward my crewmates or ground personnel.',
				type: 'reverse',
				construct: 'irritability'
			},
			{
				number: 8,
				statement:
					'I feel high levels of stress, tension or anxiety arising from confinement and prolonged isolation.',
				type: 'reverse',
				construct: 'stress and anxiety'
			},
			{
				number: 10,
				statement:
					'I feel emotionally supported and willing to communicate with my team or family on Earth.',
				type: 'positive',
				construct: 'perceived social support'
			}
		]
	},
	{
		id: 'focus',
		dimension: 'D2',
		name: 'Concentration',
		summary: 'How clearly you think during complex procedures.',
		items: [
			{
				number: 9,
				statement:
					'I manage to maintain an optimal level of concentration and mental clarity when carrying out complex technical procedures.',
				type: 'positive',
				construct: 'concentration and mental clarity'
			}
		]
	}
];

/**
 * Control question. The SMIA options leave a gap between 6.5 and 7 hours, so
 * the band is treated as open at 6.5 hours to keep every answer classifiable.
 */
export const sleepHoursOptions: readonly SleepHoursOption[] = [
	{
		id: 'under-5',
		label: 'Less than 5 hours',
		min: 0,
		max: 5,
		minExclusive: false,
		alert: 'red',
		interpretation: 'Severe deprivation'
	},
	{
		id: '5-to-6-5',
		label: 'Between 5 and 6.5 hours',
		min: 5,
		max: 6.5,
		minExclusive: false,
		alert: 'yellow',
		interpretation: 'Mild sleep deficit'
	},
	{
		id: '7-to-9',
		label: 'Between 7 and 9 hours',
		min: 6.5,
		max: 9,
		minExclusive: true,
		alert: 'green',
		interpretation: 'Normal optimal parameter'
	},
	{
		id: 'over-9',
		label: 'More than 9 hours',
		min: 9,
		max: null,
		minExclusive: true,
		alert: 'yellow',
		interpretation: 'Possible lethargy or circadian disruption'
	}
];

const surveyItemsByNumber = new Map(
	mentalSurveyBlocks.flatMap((block) => block.items).map((item) => [item.number, item] as const)
);

function likertQuestion(number: number): MentalSurveyQuestion {
	const item = surveyItemsByNumber.get(number);
	if (!item) throw new Error(`Unknown survey item ${number}`);

	return {
		key: `item-${number}`,
		kind: 'likert',
		item_number: number,
		statement: item.statement
	};
}

const sleepHoursQuestion: MentalSurveyQuestion = {
	key: 'sleep-hours',
	kind: 'sleep_hours',
	item_number: null,
	statement: 'How many exact hours did you sleep in your last rest period?'
};

/**
 * Short flows reached from each mental sub-item. Items 1-10 and the control
 * question are partitioned so the same statement is never asked twice:
 * duration owns the rest cycle, fatigue the daytime symptoms, and the rest
 * map onto the mood and cognition metrics.
 */
export const mentalSurveyTopics: readonly MentalSurveyTopic[] = [
	{
		id: 'stress',
		metric_id: 'stress',
		label: 'Stress',
		description: 'Tension and irritability during the mission.',
		questions: [likertQuestion(7), likertQuestion(8)]
	},
	{
		id: 'mood',
		metric_id: 'mood',
		label: 'Mood',
		description: 'Positive affect and emotional support.',
		questions: [likertQuestion(6), likertQuestion(10)]
	},
	{
		id: 'concentration',
		metric_id: 'concentration',
		label: 'Concentration',
		description: 'Mental clarity during complex procedures.',
		questions: [likertQuestion(9)]
	},
	{
		id: 'duration',
		metric_id: 'duration',
		label: 'Duration',
		description: 'Sleep duration, continuity and circadian rhythm.',
		questions: [likertQuestion(1), likertQuestion(3), likertQuestion(5), sleepHoursQuestion]
	},
	{
		id: 'fatigue',
		metric_id: 'fatigue',
		label: 'Fatigue',
		description: 'Restorative rest and daytime sleepiness.',
		questions: [likertQuestion(2), likertQuestion(4)]
	}
];

export const mentalSurveyTopicMetricCodes: Record<MentalSurveyTopicId, string> = {
	stress: 'stress',
	mood: 'mood',
	concentration: 'cognitive_accuracy',
	duration: 'sleep_duration',
	fatigue: 'fatigue'
};

export function findMentalSurveyTopic(id: string): MentalSurveyTopic | null {
	return mentalSurveyTopics.find((topic) => topic.id === id) ?? null;
}

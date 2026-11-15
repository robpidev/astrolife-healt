/** Block of the SMIA mental-health survey that a crew member answers in one go. */
export type MentalSurveyBlockId = 'rest' | 'mood' | 'focus';

/** Response format of items 1-10: a 5-point frequency scale. */
export type LikertValue = 1 | 2 | 3 | 4 | 5;

/** Traffic-light result derived from the survey rules. */
export type SurveyTone = 'green' | 'yellow' | 'red';

export interface LikertScaleOption {
	value: LikertValue;
	label: string;
}

export interface MentalSurveyItem {
	number: number;
	statement: string;
	/** Reverse items carry risk when answered high, so they invert before scoring. */
	type: 'positive' | 'reverse';
	construct: string;
}

export interface MentalSurveyBlock {
	id: MentalSurveyBlockId;
	dimension: string;
	name: string;
	/** Short answer for the block picker; the statement stays the source of truth. */
	summary: string;
	items: readonly MentalSurveyItem[];
}

export interface SleepHoursOption {
	id: string;
	label: string;
	/** Inclusive bounds in hours; `null` means open-ended. */
	min: number;
	max: number | null;
	/** Minimum is exclusive for the "more than 9 hours" band. */
	minExclusive: boolean;
	alert: SurveyTone;
	interpretation: string;
}

/** Mental-area sub-item that owns a short survey flow. */
export type MentalSurveyTopicId = 'stress' | 'mood' | 'concentration' | 'duration' | 'fatigue';

export interface MentalSurveyQuestion {
	/** Stable key for the step form, e.g. `item-8` or `sleep-hours`. */
	key: string;
	kind: 'likert' | 'sleep_hours';
	/** Item number 1-10; `null` for the sleep-hours control question. */
	item_number: number | null;
	statement: string;
}

export interface MentalSurveyTopic {
	id: MentalSurveyTopicId;
	/** Matches the mental-area metric id and its detail route. */
	metric_id: MentalSurveyTopicId;
	label: string;
	description: string;
	questions: readonly MentalSurveyQuestion[];
}

/** Answered questions out of the topic total, shown on the detail page. */
export interface MentalSurveyTopicProgress {
	answered: number;
	total: number;
}

export interface MentalSurveyBlockResult {
	block_id: MentalSurveyBlockId;
	/** Item numbers answered in this block. */
	answered: number[];
	/** Mean of the items with risk items inverted (1-5); `null` when empty. */
	score: number | null;
	tone: SurveyTone;
	/** Item numbers that drove an alert, so the UI can explain the colour. */
	risk_items: number[];
}

export interface MentalSurveySummary {
	recorded_at: string;
	blocks: MentalSurveyBlockResult[];
	sleep_hours: SleepHoursOption | null;
	sleep_tone: SurveyTone | null;
}

export type MentalSurveyAnswers = Partial<Record<number, LikertValue>>;

export interface MentalSurveyValues {
	block: string;
	sleep_hours: string;
	note: string;
	/** One entry per answered item, keyed `item_1` … `item_10`. */
	items: Partial<Record<number, string>>;
}

export type MentalSurveyErrors = Partial<
	Record<'block' | 'sleep_hours' | 'note' | 'items', string>
>;

export interface MentalSurveyActionData {
	success?: boolean;
	message?: string;
	values?: MentalSurveyValues;
	errors?: MentalSurveyErrors;
}

/** Values and errors of the single question rendered by the step page. */
export interface MentalSurveyStepValues {
	value: string;
}

export type MentalSurveyStepErrors = Partial<Record<'value', string>>;

export interface MentalSurveyStepActionData {
	success?: boolean;
	message?: string;
	values?: MentalSurveyStepValues;
	errors?: MentalSurveyStepErrors;
}

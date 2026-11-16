export interface MetricEntryOption {
	value: string;
	label: string;
}

export interface MetricEntryExtra {
	name: 'exercise_type' | 'symptom_type';
	label: string;
	options: readonly MetricEntryOption[];
}

export interface MetricEntryField {
	/** Form field name posted to the action. */
	name: string;
	label: string;
	unit: string;
	min: number;
	max: number;
	step: string;
	integer: boolean;
}

/** Everything the shared entry dialog needs to render and validate its form. */
export interface MetricEntryConfig {
	title: string;
	fields: readonly MetricEntryField[];
	/** Values the action needs but the user does not edit, e.g. `metric_code`. */
	hidden?: Readonly<Record<string, string>>;
	extra?: MetricEntryExtra | null;
}

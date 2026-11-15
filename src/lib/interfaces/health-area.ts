export type HealthAreaId = 'cardiovascular' | 'muscular' | 'mental' | 'radiation' | 'general';

/** Table that stores the readings for a metric. */
export type MetricSource = 'measurements' | 'symptoms' | 'exercise';

export interface HealthMetric {
	id: string;
	label: string;
	unit: string;
	/** Code in `metric_definitions`, or the metric the source table belongs to. */
	metric_code: string;
	/** Defaults to `'measurements'` when omitted. */
	source?: MetricSource;
	/** Converts the stored unit to the displayed one (mL → L is `0.001`). */
	unit_scale?: number;
	/** Fixed decimals for the displayed value; defaults to 1 for non-integers. */
	decimals?: number;
}

export interface HealthArea {
	id: HealthAreaId;
	label: string;
	metrics: readonly HealthMetric[];
}

/** Latest reading plus the recent series rendered as a sparkline. */
export interface MetricSnapshot {
	metric_id: string;
	/** Scaled reading (systolic for blood pressure); `null` when there is none. */
	latest: number | null;
	/** Formatted for display, e.g. `36.8` or `120/80`. */
	display: string | null;
	/** Oldest first, so the sparkline reads left to right. */
	points: number[];
	recorded_at: string | null;
}

export type HealthAreaId =
	'cardiovascular' | 'sleep' | 'muscular' | 'mental' | 'radiation' | 'general';

export interface HealthMetric {
	id: string;
	label: string;
	unit: string;
}

export interface HealthArea {
	id: HealthAreaId;
	label: string;
	metrics: readonly HealthMetric[];
}

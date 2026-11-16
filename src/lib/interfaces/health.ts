export type HealthSeverity = 'green' | 'yellow' | 'red' | 'unknown';

export type HealthIndicatorId =
	| 'blood-pressure'
	| 'heart-rate'
	| 'blood-glucose'
	| 'temperature'
	| 'sleep'
	| 'spo2'
	| 'respiratory-rate';

export interface ReadingAssessment {
	label: string;
	tone: 'normal' | 'caution' | 'high' | 'low' | 'urgent' | 'unavailable';
	severity: HealthSeverity;
	protocol: string;
}

export interface LatestReading {
	reading_id: string;
	indicator: HealthIndicatorId;
	metric_code: string;
	value: number | null;
	systolic: number | null;
	diastolic: number | null;
	display: string;
	unit: string;
	measured_at: string;
	source: string;
	assessment: ReadingAssessment;
}

export interface AstronautHealthStatus {
	overall: HealthSeverity;
	readings: LatestReading[];
	counts: { green: number; yellow: number; red: number };
	lastUpdate: string | null;
}

export interface HealthAlert {
	indicator: HealthIndicatorId;
	reading_id: string;
	label: string;
	value: string;
	unit: string;
	severity: Exclude<HealthSeverity, 'green' | 'unknown'>;
	protocol: string;
	measured_at: string;
	acknowledged: boolean;
}

export interface AlertSummary {
	red: number;
	yellow: number;
	total: number;
	overall: HealthSeverity;
}

export interface RiskFactor {
	id: string;
	label: string;
	severity: HealthSeverity;
	evidence: string[];
	protocol: string;
}

export interface Directive {
	id: string;
	title: string;
	reason: string;
	priority: 'high' | 'medium' | 'routine';
	severity: HealthSeverity;
}

export interface HistoryEntry {
	id: string;
	metric_code: string;
	area_id: string | null;
	label: string;
	unit: string;
	value: number | null;
	display: string;
	measured_at: string;
	source: string;
}

export interface GroundMessage {
	id: number;
	direction: 'up' | 'down';
	kind: 'alert' | 'recommendation' | 'consult' | 'sync';
	body: string;
	status: 'queued' | 'sent' | 'received';
	created_at: string;
	synced_at: string | null;
}

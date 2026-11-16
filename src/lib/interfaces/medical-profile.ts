export type MedicalEntryKind = 'allergy' | 'medication';

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'unknown';

export interface MedicalEntry {
	id: string;
	kind: MedicalEntryKind;
	name: string;
	severity: AllergySeverity | null;
	dose: string | null;
	note: string | null;
	created_at: string;
}

export interface MedicalEntryInput {
	kind: MedicalEntryKind;
	name: string;
	severity: AllergySeverity | null;
	dose: string | null;
	note: string | null;
}

export interface MedicalProfile {
	astronaut_id: string;
	birth_date: string | null;
	blood_type: string | null;
	allergies: MedicalEntry[];
	medications: MedicalEntry[];
	evaluations: MedicalEvaluation[];
	baselines: HealthBaseline[];
	medical_history: string | null;
	baseline_notes: string | null;
	updated_at: string | null;
}

export type MedicalMarkdownField = 'medical_history' | 'baseline_notes';

export type MedicalEvaluationKind = 'pre-mission' | 'periodic' | 'post-mission' | 'other';

export interface MedicalEvaluation {
	id: string;
	kind: MedicalEvaluationKind;
	evaluated_at: string;
	summary: string;
	notes: string | null;
	created_at: string;
}

export interface MedicalEvaluationInput {
	kind: MedicalEvaluationKind;
	evaluated_at: string;
	summary: string;
	notes: string | null;
}

/** Read-only initial physical condition, sourced from `health_baselines`. */
export interface HealthBaseline {
	id: string;
	metric_code: string;
	label: string;
	unit: string;
	baseline_value: number;
	valid_from: string;
	method: string | null;
	notes: string | null;
}

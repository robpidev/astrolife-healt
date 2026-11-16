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
	blood_type: string | null;
	allergies: MedicalEntry[];
	medications: MedicalEntry[];
	medical_history: string | null;
	baseline_notes: string | null;
	updated_at: string | null;
}

export type MedicalMarkdownField = 'medical_history' | 'baseline_notes';

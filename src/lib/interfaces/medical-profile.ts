export interface MedicalProfile {
	astronaut_id: string;
	blood_type: string | null;
	allergies: string | null;
	medications: string | null;
	medical_history: string | null;
	baseline_notes: string | null;
	updated_at: string | null;
}

export interface MedicalProfileInput {
	blood_type: string;
	allergies: string;
	medications: string;
	medical_history: string;
	baseline_notes: string;
}

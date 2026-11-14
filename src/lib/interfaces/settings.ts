export interface CrewSettings {
	reduced_motion: boolean;
	high_contrast: boolean;
	large_text: boolean;
	sound: boolean;
	keep_awake: boolean;
	kiosk_lock: boolean;
}

export const DEFAULT_CREW_SETTINGS: CrewSettings = {
	reduced_motion: false,
	high_contrast: false,
	large_text: false,
	sound: true,
	keep_awake: false,
	kiosk_lock: false
};

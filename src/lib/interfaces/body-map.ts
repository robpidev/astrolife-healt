import type { SurveyTone } from '#lib/interfaces/mental-survey.js';

/** Latest readings that drive the 3D body map. */
export interface BodyMapVitals {
	heart_rate: number | null;
	stress: number | null;
	fatigue: number | null;
}

/** Traffic-light state of the brain; `unknown` means there is no mental reading. */
export type BrainTone = SurveyTone | 'unknown';

/**
 * Everything the scene needs to render the brain. It is derived from the
 * vitals in one place so the colour and the tooltip can never disagree.
 */
export interface BrainState {
	tone: BrainTone;
	/** 0 (calm) to 1 (maximum stress), aligned with the metric thresholds. */
	load: number;
	/** Short label shown in the tooltip: Calm, Elevated, High or No data. */
	label: string;
	/** Hex colour of the cortex and its glow. */
	color: string;
	/** Emissive strength; fatigue dims it. */
	glow: number;
	/** Breathing rate of the brain glow, in Hz. */
	pulseHz: number;
	/** Scale added by the glow pulse. */
	pulseAmplitude: number;
	/** Human-readable readings, e.g. `Stress 6/10 · Fatigue 4/10`. */
	summary: string;
}

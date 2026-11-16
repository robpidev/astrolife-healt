import type { BodyMapVitals, BrainState, BrainTone } from '#lib/interfaces/body-map.js';
import { metricTone, worstTone } from '#lib/utils/mental-survey.js';

/**
 * The colour scale is anchored on `metricTone` thresholds, not on raw tenths,
 * so a reading that the cards call "green" never paints the cortex red.
 */
const STRESS_LOAD: readonly (readonly [number, number])[] = [
	[0, 0],
	[4, 0.34],
	[7, 0.67],
	[10, 1]
];

const FATIGUE_LOAD: readonly (readonly [number, number])[] = [
	[0, 0],
	[3, 0.34],
	[7, 0.67],
	[10, 1]
];

/** Rested eyes are bright and quick; deep fatigue leaves a dim, slow glow. */
const FATIGUE_ENERGY: readonly (readonly [number, number])[] = [
	[0, 1],
	[3, 0.8],
	[7, 0.35],
	[10, 0.05]
];

const LOAD_COLORS: readonly (readonly [number, string])[] = [
	[0, '#8b5cf6'],
	[0.35, '#a78bfa'],
	[0.7, '#fb7185'],
	[1, '#ef4444']
];

const NEUTRAL_COLOR = '#a78bfa';

const LABELS: Record<BrainTone, string> = {
	green: 'Calm',
	yellow: 'Elevated',
	red: 'High',
	unknown: 'No data'
};

function isReading(value: number | null): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function clamp01(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

function piecewise(value: number, stops: readonly (readonly [number, number])[]): number {
	const first = stops[0];
	const last = stops[stops.length - 1];
	const bounded = Math.min(Math.max(value, first[0]), last[0]);

	for (let index = 1; index < stops.length; index += 1) {
		const [x1, y1] = stops[index];
		const [x0, y0] = stops[index - 1];
		if (bounded <= x1) return y0 + ((bounded - x0) / (x1 - x0)) * (y1 - y0);
	}

	return last[1];
}

function parseHex(hex: string): [number, number, number] {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(channels: [number, number, number]): string {
	return (
		'#' + channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')
	);
}

function mixHex(from: string, to: string, amount: number): string {
	const start = parseHex(from);
	const end = parseHex(to);
	return toHex([
		start[0] + (end[0] - start[0]) * amount,
		start[1] + (end[1] - start[1]) * amount,
		start[2] + (end[2] - start[2]) * amount
	]);
}

function colorAt(load: number): string {
	for (let index = 1; index < LOAD_COLORS.length; index += 1) {
		const [at1, color1] = LOAD_COLORS[index];
		const [at0, color0] = LOAD_COLORS[index - 1];
		if (load <= at1) return mixHex(color0, color1, clamp01((load - at0) / (at1 - at0)));
	}

	return LOAD_COLORS[LOAD_COLORS.length - 1][1];
}

function formatReading(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildSummary(stress: number | null, fatigue: number | null): string {
	const parts: string[] = [];
	if (stress !== null) parts.push(`Stress ${formatReading(stress)}/10`);
	if (fatigue !== null) parts.push(`Fatigue ${formatReading(fatigue)}/10`);
	return parts.length === 0 ? 'No mental data' : parts.join(' · ');
}

/**
 * Tone is the worst of stress and fatigue, like the mental-health cards. The
 * colour uses the same worst load, so a very tired but calm crew member is
 * never shown as "High" on a violet cortex.
 */
export function brainState(vitals: BodyMapVitals): BrainState {
	const stress = isReading(vitals.stress) ? vitals.stress : null;
	const fatigue = isReading(vitals.fatigue) ? vitals.fatigue : null;

	const stressTone = stress === null ? null : metricTone('stress', stress);
	const fatigueTone = fatigue === null ? null : metricTone('fatigue', fatigue);
	const tones = [stressTone, fatigueTone].filter(
		(tone): tone is NonNullable<typeof tone> => tone !== null
	);
	const tone: BrainTone = tones.length === 0 ? 'unknown' : worstTone(tones);

	const load = Math.max(
		stress === null ? 0 : piecewise(stress, STRESS_LOAD),
		fatigue === null ? 0 : piecewise(fatigue, FATIGUE_LOAD)
	);

	// Without a fatigue reading the brain keeps a neutral, resting energy.
	const energy = fatigue !== null ? piecewise(fatigue, FATIGUE_ENERGY) : stress !== null ? 0.8 : 0;

	return {
		tone,
		load,
		label: LABELS[tone],
		color: tone === 'unknown' ? NEUTRAL_COLOR : colorAt(load),
		glow: 0.3 + energy * 0.6,
		pulseHz: energy === 0 ? 0 : 0.12 + energy * 0.42,
		pulseAmplitude: energy * 0.045,
		summary: buildSummary(stress, fatigue)
	};
}

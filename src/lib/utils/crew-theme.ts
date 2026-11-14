import type { CrewStatus, CrewTaskKind, CrewTone } from '#lib/interfaces/astronaut.js';

export interface CrewToneClasses {
	/** Portrait plate gradient. */
	plate: string;
	/** Soft light behind the portrait. */
	glow: string;
	/** XP meter cells. */
	bar: string;
	/** Light chip: levels, badges, counters. */
	chip: string;
	/** Ring around the portrait inside the plate. */
	avatar: string;
	/** Accent text used on dark plates. */
	text: string;
}

/**
 * Literal class strings so Tailwind can statically extract every tone. Do not
 * build these names at runtime.
 */
export const crewTones: Record<CrewTone, CrewToneClasses> = {
	indigo: {
		plate: 'bg-linear-to-br from-indigo-950 via-indigo-900 to-slate-950',
		glow: 'bg-indigo-400/25',
		bar: 'bg-indigo-500',
		chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
		avatar: 'ring-indigo-400/40',
		text: 'text-indigo-300'
	},
	cyan: {
		plate: 'bg-linear-to-br from-cyan-950 via-cyan-900 to-slate-950',
		glow: 'bg-cyan-400/25',
		bar: 'bg-cyan-500',
		chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
		avatar: 'ring-cyan-400/40',
		text: 'text-cyan-300'
	},
	violet: {
		plate: 'bg-linear-to-br from-violet-950 via-violet-900 to-slate-950',
		glow: 'bg-violet-400/25',
		bar: 'bg-violet-500',
		chip: 'bg-violet-50 text-violet-700 ring-violet-200',
		avatar: 'ring-violet-400/40',
		text: 'text-violet-300'
	},
	amber: {
		plate: 'bg-linear-to-br from-amber-950 via-amber-900 to-slate-950',
		glow: 'bg-amber-400/25',
		bar: 'bg-amber-500',
		chip: 'bg-amber-50 text-amber-800 ring-amber-200',
		avatar: 'ring-amber-400/40',
		text: 'text-amber-300'
	},
	emerald: {
		plate: 'bg-linear-to-br from-emerald-950 via-emerald-900 to-slate-950',
		glow: 'bg-emerald-400/25',
		bar: 'bg-emerald-500',
		chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		avatar: 'ring-emerald-400/40',
		text: 'text-emerald-300'
	}
};

export interface CrewStatusMeta {
	label: string;
	dot: string;
	pill: string;
}

export const crewStatuses: Record<CrewStatus, CrewStatusMeta> = {
	mision: {
		label: 'En misión',
		dot: 'bg-emerald-400',
		pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
	},
	entrenamiento: {
		label: 'Entrenamiento',
		dot: 'bg-sky-400',
		pill: 'bg-sky-50 text-sky-700 ring-sky-200'
	},
	descanso: {
		label: 'Descanso',
		dot: 'bg-slate-400',
		pill: 'bg-slate-100 text-slate-600 ring-slate-200'
	}
};

export interface CrewTaskMeta {
	label: string;
	chip: string;
}

export const crewTaskKinds: Record<CrewTaskKind, CrewTaskMeta> = {
	salud: { label: 'Salud', chip: 'bg-rose-50 text-rose-700 ring-rose-200' },
	entrenamiento: { label: 'Entrenamiento', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
	mision: { label: 'Misión', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
	logistica: { label: 'Logística', chip: 'bg-amber-50 text-amber-800 ring-amber-200' }
};

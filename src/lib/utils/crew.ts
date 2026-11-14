import type { Astronaut, CrewTask, NewAstronautInput } from '#lib/interfaces/astronaut.js';

export interface CrewTaskProgress {
	total: number;
	done: number;
	pending: number;
	/** XP still available from pending tasks. */
	xp_pending: number;
	/** XP already claimed from completed tasks. */
	xp_earned: number;
	/** Completed share, 0–100. */
	percent: number;
}

export interface LevelProgress {
	level: number;
	/** XP earned inside the current level. */
	xp: number;
	/** XP required to reach the next level. */
	xp_next: number;
}

const FIRST_LEVEL_COST = 1000;
const LEVEL_GROWTH = 1.15;

function roundTo50(value: number): number {
	return Math.round(value / 50) * 50;
}

/** XP needed to go from `level` to `level + 1`. */
export function levelCost(level: number): number {
	let cost = FIRST_LEVEL_COST;

	for (let current = 1; current < level; current += 1) {
		cost = roundTo50(cost * LEVEL_GROWTH);
	}

	return cost;
}

/**
 * Derives level and in-level progress from lifetime XP. Keeping a single source
 * of truth makes task toggles reversible: un-completing a task only subtracts
 * its XP, and the level follows automatically.
 */
export function levelProgress(xpTotal: number): LevelProgress {
	let remaining = Math.max(0, Math.floor(xpTotal));
	let level = 1;
	let cost = levelCost(level);

	while (remaining >= cost) {
		remaining -= cost;
		level += 1;
		cost = levelCost(level);
	}

	return { level, xp: remaining, xp_next: cost };
}

export function astronautName(astronaut: Pick<Astronaut, 'first_name' | 'last_name'>): string {
	return `${astronaut.first_name} ${astronaut.last_name}`;
}

export function initialsFor(firstName: string, lastName: string): string {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function crewTaskProgress(tasks: CrewTask[]): CrewTaskProgress {
	const total = tasks.length;
	const done = tasks.filter((task) => task.done).length;
	const xpPending = tasks.reduce((sum, task) => sum + (task.done ? 0 : task.xp), 0);
	const xpEarned = tasks.reduce((sum, task) => sum + (task.done ? task.xp : 0), 0);

	return {
		total,
		done,
		pending: total - done,
		xp_pending: xpPending,
		xp_earned: xpEarned,
		percent: total === 0 ? 0 : Math.round((done / total) * 100)
	};
}

/** Pending tasks in their original order, capped for the card preview. */
export function pendingCrewTasks(tasks: CrewTask[], limit = 3): CrewTask[] {
	return tasks.filter((task) => !task.done).slice(0, limit);
}

/**
 * Card preview: pending tasks first, then completed ones to fill the remaining
 * rows. Keeps every card visually balanced without hiding what is still open.
 */
export function crewTaskPreview(tasks: CrewTask[], limit = 3): CrewTask[] {
	const pending = tasks.filter((task) => !task.done);
	const done = tasks.filter((task) => task.done);

	return [...pending, ...done].slice(0, limit);
}

/** Filled cells of the segmented XP meter, 0–`segments`. */
export function xpSegments(xp: number, xpNext: number, segments = 10): number {
	if (xpNext <= 0) return xp > 0 ? segments : 0;

	const ratio = Math.min(1, Math.max(0, xp / xpNext));
	return Math.min(segments, Math.max(0, Math.ceil(ratio * segments)));
}

/** Returns a new astronaut with the task toggled and lifetime XP adjusted. */
export function toggleCrewTask(astronaut: Astronaut, taskId: number): Astronaut {
	const task = astronaut.tasks.find((item) => item.id === taskId);
	if (!task) return astronaut;

	const completing = !task.done;
	const xpTotal = Math.max(0, astronaut.xp_total + (completing ? task.xp : -task.xp));

	return {
		...astronaut,
		xp_total: xpTotal,
		tasks: astronaut.tasks.map((item) =>
			item.id === taskId ? { ...item, done: completing } : item
		)
	};
}

/** Onboarding tasks every new crew member starts with. */
export function onboardingTasks(astronautId: number): CrewTask[] {
	const base = astronautId * 100;

	return [
		{
			id: base + 1,
			title: 'Completar perfil de tripulación',
			kind: 'logistica',
			done: false,
			xp: 20
		},
		{
			id: base + 2,
			title: 'Registrar signos vitales',
			kind: 'salud',
			done: false,
			xp: 40
		},
		{
			id: base + 3,
			title: 'Primer entrenamiento de 20 min',
			kind: 'entrenamiento',
			done: false,
			xp: 30
		}
	];
}

export function createCrewAstronaut(input: NewAstronautInput): Astronaut {
	return {
		...input,
		status: 'entrenamiento',
		avatar_url: null,
		xp_total: 0,
		streak_days: 0,
		missions_completed: 0,
		badges: [],
		tasks: onboardingTasks(input.id)
	};
}

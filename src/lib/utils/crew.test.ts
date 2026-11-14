import { describe, expect, it } from 'vitest';
import type { Astronaut } from '#lib/interfaces/astronaut.js';
import {
	astronautName,
	createCrewAstronaut,
	crewTaskPreview,
	crewTaskProgress,
	initialsFor,
	levelCost,
	levelProgress,
	onboardingTasks,
	pendingCrewTasks,
	toggleCrewTask,
	xpSegments
} from '#lib/utils/crew.js';

const astronaut: Astronaut = {
	id: 1,
	first_name: 'Valentina',
	last_name: 'Ríos',
	role: 'Comandante de vuelo',
	status: 'mision',
	tone: 'indigo',
	avatar_url: null,
	xp_total: 13400,
	streak_days: 12,
	missions_completed: 24,
	badges: [],
	tasks: [
		{ id: 1, title: 'Signos vitales', kind: 'salud', done: true, xp: 40 },
		{ id: 2, title: 'Bicicleta', kind: 'entrenamiento', done: false, xp: 50 }
	]
};

describe('crew helpers', () => {
	it('builds the full name and initials', () => {
		expect(astronautName(astronaut)).toBe('Valentina Ríos');
		expect(initialsFor('Valentina', 'Ríos')).toBe('VR');
	});

	it('derives level progress from lifetime XP', () => {
		expect(levelProgress(0)).toEqual({ level: 1, xp: 0, xp_next: 1000 });
		expect(levelProgress(999)).toEqual({ level: 1, xp: 999, xp_next: 1000 });
		expect(levelProgress(1000)).toEqual({ level: 2, xp: 0, xp_next: 1150 });
		expect(levelProgress(2150)).toEqual({ level: 3, xp: 0, xp_next: 1300 });
		expect(levelProgress(13400)).toEqual({ level: 8, xp: 2550, xp_next: 2600 });
		expect(levelProgress(13450)).toEqual({ level: 9, xp: 0, xp_next: 3000 });
		expect(levelProgress(-50)).toEqual({ level: 1, xp: 0, xp_next: 1000 });
	});

	it('grows each level cost by 15% rounded to 50 XP', () => {
		expect(levelCost(1)).toBe(1000);
		expect(levelCost(2)).toBe(1150);
		expect(levelCost(3)).toBe(1300);
		expect(levelCost(8)).toBe(2600);
	});

	it('summarises task progress and available XP', () => {
		expect(crewTaskProgress(astronaut.tasks)).toEqual({
			total: 2,
			done: 1,
			pending: 1,
			xp_pending: 50,
			xp_earned: 40,
			percent: 50
		});
	});

	it('handles an empty task list', () => {
		expect(crewTaskProgress([])).toMatchObject({ total: 0, pending: 0, percent: 0 });
	});

	it('previews pending tasks only and respects the limit', () => {
		expect(pendingCrewTasks(astronaut.tasks).map((task) => task.id)).toEqual([2]);
		expect(
			pendingCrewTasks(
				[
					{ id: 1, title: 'a', kind: 'salud', done: false, xp: 1 },
					{ id: 2, title: 'b', kind: 'salud', done: false, xp: 1 },
					{ id: 3, title: 'c', kind: 'salud', done: false, xp: 1 }
				],
				2
			)
		).toHaveLength(2);
	});

	it('previews pending tasks first and fills with completed ones', () => {
		expect(crewTaskPreview(astronaut.tasks).map((task) => task.id)).toEqual([2, 1]);
		expect(
			crewTaskPreview([
				{ id: 1, title: 'a', kind: 'salud', done: true, xp: 1 },
				{ id: 2, title: 'b', kind: 'salud', done: false, xp: 1 },
				{ id: 3, title: 'c', kind: 'salud', done: true, xp: 1 },
				{ id: 4, title: 'd', kind: 'salud', done: false, xp: 1 }
			]).map((task) => task.id)
		).toEqual([2, 4, 1]);
	});

	it('fills XP segments proportionally and clamps outliers', () => {
		expect(xpSegments(0, 1000)).toBe(0);
		expect(xpSegments(1, 1000)).toBe(1);
		expect(xpSegments(500, 1000)).toBe(5);
		expect(xpSegments(2000, 1000)).toBe(10);
		expect(xpSegments(500, 0)).toBe(10);
	});

	it('completes a task and grants lifetime XP', () => {
		const updated = toggleCrewTask(astronaut, 2);

		expect(updated.tasks.find((task) => task.id === 2)?.done).toBe(true);
		expect(updated.xp_total).toBe(13450);
		expect(levelProgress(updated.xp_total).level).toBe(9);
		expect(astronaut.tasks[1].done).toBe(false);
		expect(astronaut.xp_total).toBe(13400);
	});

	it('round-trips a level-up without losing XP', () => {
		const completed = toggleCrewTask(astronaut, 2);
		const reverted = toggleCrewTask(completed, 2);

		expect(levelProgress(completed.xp_total).level).toBe(9);
		expect(reverted.xp_total).toBe(astronaut.xp_total);
		expect(levelProgress(reverted.xp_total)).toEqual(levelProgress(astronaut.xp_total));
		expect(reverted.tasks.find((task) => task.id === 2)?.done).toBe(false);
	});

	it('never drops lifetime XP below zero', () => {
		const updated = toggleCrewTask({ ...astronaut, xp_total: 10 }, 1);

		expect(updated.xp_total).toBe(0);
	});

	it('returns the same astronaut for an unknown task', () => {
		expect(toggleCrewTask(astronaut, 999)).toBe(astronaut);
	});

	it('creates a level 1 astronaut with onboarding tasks', () => {
		const created = createCrewAstronaut({
			id: 6,
			first_name: 'Nadia',
			last_name: 'Vega',
			role: 'Especialista de misión',
			tone: 'cyan'
		});

		expect(created).toMatchObject({
			id: 6,
			status: 'entrenamiento',
			xp_total: 0,
			streak_days: 0,
			missions_completed: 0,
			badges: []
		});
		expect(levelProgress(created.xp_total).level).toBe(1);
		expect(created.tasks).toHaveLength(3);
		expect(created.tasks.map((task) => task.id)).toEqual([601, 602, 603]);
		expect(onboardingTasks(6)).toEqual(created.tasks);
	});
});

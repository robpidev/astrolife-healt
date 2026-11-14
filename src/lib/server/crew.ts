import type { Astronaut, CrewDashboard } from '#lib/interfaces/astronaut.js';

/**
 * Mock crew used by the dashboard mockup. Task definitions, rewards and the
 * gamification schema are still being decided, so this module deliberately
 * avoids SQLite: replace `getCrewDashboard` with queries once the contract is
 * approved. Keeping the shape here lets the UI and the future tables agree.
 */
const ASTRONAUTS: Astronaut[] = [
	{
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
		badges: ['Pionera', 'Racha 10', 'Mentora'],
		tasks: [
			{ id: 101, title: 'Registrar signos vitales', kind: 'salud', done: true, xp: 40 },
			{ id: 102, title: 'Revisar protocolo de eyección', kind: 'mision', done: false, xp: 60 },
			{ id: 103, title: '45 min de bicicleta', kind: 'entrenamiento', done: false, xp: 50 },
			{ id: 104, title: 'Actualizar inventario del módulo', kind: 'logistica', done: false, xp: 30 }
		]
	},
	{
		id: 2,
		first_name: 'Mateo',
		last_name: 'Ferrer',
		role: 'Piloto de vuelo',
		status: 'entrenamiento',
		tone: 'cyan',
		avatar_url: null,
		xp_total: 5900,
		streak_days: 6,
		missions_completed: 11,
		badges: ['Simulador', 'Sin faltas'],
		tasks: [
			{ id: 201, title: 'Simulador de acople', kind: 'entrenamiento', done: false, xp: 60 },
			{ id: 202, title: 'Registrar masa y talla', kind: 'salud', done: false, xp: 40 },
			{ id: 203, title: 'Revisar checklist de ascenso', kind: 'mision', done: false, xp: 45 }
		]
	},
	{
		id: 3,
		first_name: 'Aiko',
		last_name: 'Tanaka',
		role: 'Médica de vuelo',
		status: 'mision',
		tone: 'violet',
		avatar_url: null,
		xp_total: 10200,
		streak_days: 21,
		missions_completed: 19,
		badges: ['Racha 20', 'Guardiana', 'Sin faltas'],
		tasks: [
			{ id: 301, title: 'Control de presión arterial', kind: 'salud', done: true, xp: 40 },
			{ id: 302, title: 'Preparar botiquín de la cápsula', kind: 'logistica', done: true, xp: 30 },
			{ id: 303, title: 'Analizar muestras de la última EVA', kind: 'mision', done: false, xp: 70 }
		]
	},
	{
		id: 4,
		first_name: 'Samuel',
		last_name: 'Duarte',
		role: 'Ingeniero de sistemas',
		status: 'descanso',
		tone: 'amber',
		avatar_url: null,
		xp_total: 7100,
		streak_days: 0,
		missions_completed: 8,
		badges: ['Reparación exprés'],
		tasks: [
			{ id: 401, title: 'Descanso obligatorio de 8 h', kind: 'salud', done: false, xp: 20 },
			{
				id: 402,
				title: 'Programar revisión de telemetría',
				kind: 'logistica',
				done: false,
				xp: 35
			},
			{
				id: 403,
				title: 'Caminata de recuperación 20 min',
				kind: 'entrenamiento',
				done: false,
				xp: 25
			}
		]
	},
	{
		id: 5,
		first_name: 'Camila',
		last_name: 'Sosa',
		role: 'Especialista de misión',
		status: 'mision',
		tone: 'emerald',
		avatar_url: null,
		xp_total: 15000,
		streak_days: 15,
		missions_completed: 27,
		badges: ['Racha 15', 'EVA', 'Mentora'],
		tasks: [
			{ id: 501, title: 'Registro de masa y pulso', kind: 'salud', done: false, xp: 40 },
			{ id: 502, title: 'Completar informe de la EVA 14', kind: 'mision', done: false, xp: 80 },
			{ id: 503, title: 'Inspección del brazo robótico', kind: 'logistica', done: true, xp: 45 },
			{ id: 504, title: '30 min de resistencia', kind: 'entrenamiento', done: false, xp: 50 }
		]
	}
];

const MISSION_DAY = 148;
const WEEKLY_XP = 8640;

export function getCrewDashboard(): CrewDashboard {
	const astronauts = ASTRONAUTS.map((astronaut) => ({
		...astronaut,
		tasks: astronaut.tasks.map((task) => ({ ...task })),
		badges: [...astronaut.badges]
	}));

	return {
		summary: {
			total: astronauts.length,
			active: astronauts.filter((astronaut) => astronaut.status !== 'descanso').length,
			missions_completed: astronauts.reduce(
				(sum, astronaut) => sum + astronaut.missions_completed,
				0
			),
			crew_streak_days: 21,
			weekly_xp: WEEKLY_XP,
			mission_day: MISSION_DAY
		},
		astronauts
	};
}

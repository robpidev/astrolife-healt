import type { Astronaut } from '#lib/interfaces/astronaut.js';
import { onboardingTasks } from '#lib/utils/crew.js';

export const DEMO_ASTRONAUTS: Astronaut[] = [
	{
		id: 1,
		nationality: 'Peruvian',
		sex: 'femenino',
		birth_date: '1991-03-14',
		first_name: 'Valentina',
		last_name: 'Ríos',
		role: 'Flight Commander',
		status: 'mision',
		tone: 'indigo',
		avatar_url: '/images/astronauts/valentina-rios.png',
		xp_total: 13400,
		streak_days: 12,
		missions_completed: 24,
		badges: ['Pioneer', '10-day streak', 'Mentor'],
		tasks: [
			{ id: 101, title: 'Record vital signs', kind: 'salud', done: true, xp: 40 },
			{ id: 102, title: 'Review ejection protocol', kind: 'mision', done: false, xp: 60 },
			{ id: 103, title: '45 min on the bike', kind: 'entrenamiento', done: false, xp: 50 },
			{ id: 104, title: 'Update module inventory', kind: 'logistica', done: false, xp: 30 }
		]
	},
	{
		id: 2,
		nationality: 'Spanish',
		sex: 'masculino',
		birth_date: '1988-09-02',
		first_name: 'Mateo',
		last_name: 'Ferrer',
		role: 'Flight Pilot',
		status: 'entrenamiento',
		tone: 'cyan',
		avatar_url: '/images/astronauts/mateo-ferrer.png',
		xp_total: 5900,
		streak_days: 6,
		missions_completed: 11,
		badges: ['Simulator', 'No missed days'],
		tasks: [
			{ id: 201, title: 'Docking simulator', kind: 'entrenamiento', done: false, xp: 60 },
			{ id: 202, title: 'Record mass and height', kind: 'salud', done: false, xp: 40 },
			{ id: 203, title: 'Review ascent checklist', kind: 'mision', done: false, xp: 45 }
		]
	},
	{
		id: 3,
		nationality: 'Japanese',
		sex: 'femenino',
		birth_date: '1994-12-21',
		first_name: 'Aiko',
		last_name: 'Tanaka',
		role: 'Flight Physician',
		status: 'mision',
		tone: 'violet',
		avatar_url: '/images/astronauts/aiko-tanaka.png',
		xp_total: 10200,
		streak_days: 21,
		missions_completed: 19,
		badges: ['20-day streak', 'Guardian', 'No missed days'],
		tasks: [
			{ id: 301, title: 'Blood pressure check', kind: 'salud', done: true, xp: 40 },
			{ id: 302, title: 'Prepare the capsule medical kit', kind: 'logistica', done: true, xp: 30 },
			{ id: 303, title: 'Analyze samples from the last EVA', kind: 'mision', done: false, xp: 70 }
		]
	},
	{
		id: 4,
		nationality: 'Brazilian',
		sex: 'masculino',
		birth_date: '1986-06-08',
		first_name: 'Samuel',
		last_name: 'Duarte',
		role: 'Systems Engineer',
		status: 'descanso',
		tone: 'amber',
		avatar_url: '/images/astronauts/samuel-duarte.png',
		xp_total: 7100,
		streak_days: 0,
		missions_completed: 8,
		badges: ['Express repair'],
		tasks: [
			{ id: 401, title: 'Mandatory 8 h rest', kind: 'salud', done: false, xp: 20 },
			{
				id: 402,
				title: 'Schedule telemetry review',
				kind: 'logistica',
				done: false,
				xp: 35
			},
			{
				id: 403,
				title: '20 min recovery walk',
				kind: 'entrenamiento',
				done: false,
				xp: 25
			}
		]
	},
	{
		id: 5,
		nationality: 'Argentine',
		sex: 'femenino',
		birth_date: '1993-01-27',
		first_name: 'Camila',
		last_name: 'Sosa',
		role: 'Mission Specialist',
		status: 'mision',
		tone: 'emerald',
		avatar_url: '/images/astronauts/camila-sosa.png',
		xp_total: 15000,
		streak_days: 15,
		missions_completed: 27,
		badges: ['15-day streak', 'EVA', 'Mentor'],
		tasks: [
			{ id: 501, title: 'Mass and pulse log', kind: 'salud', done: false, xp: 40 },
			{ id: 502, title: 'Complete EVA 14 report', kind: 'mision', done: false, xp: 80 },
			{ id: 503, title: 'Robotic arm inspection', kind: 'logistica', done: true, xp: 45 },
			{ id: 504, title: '30 min endurance', kind: 'entrenamiento', done: false, xp: 50 }
		]
	},
	{
		id: 6,
		first_name: 'Amara',
		last_name: 'Okafor',
		nationality: 'Nigerian',
		sex: 'femenino',
		birth_date: '1990-07-19',
		role: 'Systems Engineer',
		status: 'entrenamiento',
		tone: 'cyan',
		avatar_url: '/images/astronauts/amara-okafor.png',
		xp_total: 3200,
		streak_days: 4,
		missions_completed: 3,
		badges: ['First orbit'],
		tasks: onboardingTasks(6)
	}
];

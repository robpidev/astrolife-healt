/** Availability of an astronaut for the current mission rotation. */
export type CrewStatus = 'mision' | 'entrenamiento' | 'descanso';

/** Visual family used by the crew dashboard to theme each astronaut's card. */
export type CrewTone = 'indigo' | 'cyan' | 'violet' | 'amber' | 'emerald';

/** Category of a crew task; drives the icon and the colour of its chip. */
export type CrewTaskKind = 'salud' | 'entrenamiento' | 'mision' | 'logistica';

export interface CrewTask {
	id: number;
	title: string;
	kind: CrewTaskKind;
	done: boolean;
	/** XP granted once the task is completed. */
	xp: number;
}

export interface Astronaut {
	id: number;
	first_name: string;
	last_name: string;
	role: string;
	status: CrewStatus;
	tone: CrewTone;
	/** Portrait photo; `null` renders the monogram fallback. */
	avatar_url: string | null;
	/**
	 * Lifetime XP. Level and progress are derived from it, so completing and
	 * un-completing a task always round-trips without losing XP.
	 */
	xp_total: number;
	streak_days: number;
	missions_completed: number;
	badges: string[];
	tasks: CrewTask[];
}

export interface CrewSummary {
	total: number;
	/** Astronauts not on rest: on mission or training. */
	active: number;
	missions_completed: number;
	crew_streak_days: number;
	weekly_xp: number;
	mission_day: number;
}

export interface CrewDashboard {
	summary: CrewSummary;
	astronauts: Astronaut[];
}

export interface NewAstronautInput {
	id: number;
	first_name: string;
	last_name: string;
	role: string;
	tone: CrewTone;
}

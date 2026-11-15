import { randomUUID } from 'node:crypto';
import type { Astronaut, AstronautSex, CrewDashboard, CrewTask, CrewTone, CrewStatus } from '#lib/interfaces/astronaut.js';
import { getDb } from '#lib/server/db.js';
import { DEMO_ASTRONAUTS } from '#lib/server/crew-seed.js';
import { onboardingTasks } from '#lib/utils/crew.js';

export interface AstronautInput {
	first_name: string;
	last_name: string;
	nationality: string;
	sex: AstronautSex;
	role: string;
	tone: CrewTone;
}

interface AstronautRow {
	id: number;
	full_name: string;
	nationality: string | null;
	sex: AstronautSex | null;
	photo_path: string | null;
	role: string;
	status: CrewStatus;
	tone: CrewTone;
	xp_total: number;
	streak_days: number;
	missions_completed: number;
	badges: string;
}

interface TaskRow extends Omit<CrewTask, 'done'> {
	profile_id: number;
	done: number;
}

function insertTasks(profileId: number, tasks: CrewTask[]): void {
	const statement = getDb().prepare('INSERT INTO crew_tasks(profile_id,title,kind,done,xp) VALUES(?,?,?,?,?)');
	for (const task of tasks) statement.run(profileId, task.title, task.kind, Number(task.done), task.xp);
}

/** A migration marker prevents deleted demo profiles from returning after restart. */
function initializeCrew(): void {
	const db = getDb();
	db.exec('BEGIN IMMEDIATE');
	try {
		if (!db.prepare('SELECT name FROM app_migrations WHERE name = ?').get('demo-crew-v1')) {
			if (!db.prepare('SELECT id FROM astronauts LIMIT 1').get()) {
				const astronautStatement = db.prepare('INSERT INTO astronauts(id,full_name,photo_path,nationality,sex) VALUES(?,?,?,?,?)');
				const profileStatement = db.prepare(`INSERT INTO crew_profiles(astronaut_id,role,status,tone,xp_total,streak_days,missions_completed,badges)
					VALUES(?,?,?,?,?,?,?,?)`);
				for (const astronaut of DEMO_ASTRONAUTS) {
					const key = `demo-${astronaut.id}`;
					astronautStatement.run(key, `${astronaut.first_name} ${astronaut.last_name}`, astronaut.avatar_url, astronaut.nationality, astronaut.sex);
					const result = profileStatement.run(key, astronaut.role, astronaut.status, astronaut.tone, astronaut.xp_total, astronaut.streak_days, astronaut.missions_completed, JSON.stringify(astronaut.badges));
					insertTasks(Number(result.lastInsertRowid), astronaut.tasks);
				}
			}
			db.prepare('INSERT INTO app_migrations(name) VALUES(?)').run('demo-crew-v1');
		}
		if (!db.prepare('SELECT name FROM app_migrations WHERE name = ?').get('demo-crew-six-v2')) {
			db.prepare('DELETE FROM astronauts WHERE id IN (?, ?)').run('demo-7', 'demo-8');
			db.prepare('INSERT INTO app_migrations(name) VALUES(?)').run('demo-crew-six-v2');
		}
		if (!db.prepare('SELECT name FROM app_migrations WHERE name = ?').get('demo-crew-portraits-v3')) {
			const updatePhoto = db.prepare('UPDATE astronauts SET photo_path = ? WHERE id = ? AND photo_path IS NULL');
			for (const astronaut of DEMO_ASTRONAUTS) {
				updatePhoto.run(astronaut.avatar_url, `demo-${astronaut.id}`);
			}
			db.prepare('INSERT INTO app_migrations(name) VALUES(?)').run('demo-crew-portraits-v3');
		}
		// Astronauts imported from bd.sql also receive a dashboard profile.
		db.exec('INSERT OR IGNORE INTO crew_profiles(astronaut_id) SELECT id FROM astronauts');
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
}

/** Single mapping keeps the dashboard and the profile route reading the same columns. */
function toAstronaut(row: AstronautRow, tasks: TaskRow[]): Astronaut {
	const [firstName, ...lastNames] = row.full_name.split(' ');
	return {
		id: row.id,
		first_name: firstName,
		last_name: lastNames.join(' '),
		nationality: row.nationality,
		sex: row.sex,
		avatar_url: row.photo_path,
		role: row.role,
		status: row.status,
		tone: row.tone,
		xp_total: row.xp_total,
		streak_days: row.streak_days,
		missions_completed: row.missions_completed,
		badges: JSON.parse(row.badges) as string[],
		tasks: tasks
			.filter((task) => task.profile_id === row.id)
			.map(({ id, title, kind, done, xp }) => ({ id, title, kind, done: Boolean(done), xp }))
	};
}

/** Single astronaut for the profile route; `null` when the profile id is unknown. */
export function getAstronaut(id: number): Astronaut | null {
	initializeCrew();
	const db = getDb();
	const row = db
		.prepare(`SELECT p.*, a.full_name, a.nationality, a.sex, a.photo_path
			FROM crew_profiles p JOIN astronauts a ON a.id = p.astronaut_id WHERE p.id = ?`)
		.get(id) as unknown as AstronautRow | undefined;
	if (!row) return null;
	const tasks = db.prepare('SELECT * FROM crew_tasks WHERE profile_id = ? ORDER BY id').all(id) as unknown as TaskRow[];
	return toAstronaut(row, tasks);
}

export function getCrewDashboard(): CrewDashboard {
	initializeCrew();
	const db = getDb();
	const rows = db.prepare(`SELECT p.*, a.full_name, a.nationality, a.sex, a.photo_path
		FROM crew_profiles p JOIN astronauts a ON a.id = p.astronaut_id ORDER BY p.id`).all() as unknown as AstronautRow[];
	const tasks = db.prepare('SELECT * FROM crew_tasks ORDER BY id').all() as unknown as TaskRow[];
	const astronauts: Astronaut[] = rows.map((row) => toAstronaut(row, tasks));
	return {
		astronauts,
		summary: {
			total: astronauts.length, active: astronauts.filter((astronaut) => astronaut.status !== 'descanso').length,
			missions_completed: astronauts.reduce((sum, astronaut) => sum + astronaut.missions_completed, 0),
			crew_streak_days: Math.max(0, ...astronauts.map((astronaut) => astronaut.streak_days)),
			weekly_xp: 0, mission_day: 0
		}
	};
}

export function saveAstronaut(
	id: number | null,
	input: AstronautInput,
	photoUrl: string | null = null
): number | null {
	initializeCrew();
	const db = getDb();
	db.exec('BEGIN IMMEDIATE');
	try {
		let profileId = id;
		if (id !== null) {
			const row = db.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?').get(id);
			if (!row) { db.exec('ROLLBACK'); return null; }
			db.prepare('UPDATE astronauts SET full_name = ?, nationality = ?, sex = ?, photo_path = coalesce(?, photo_path) WHERE id = ?')
				.run(`${input.first_name} ${input.last_name}`, input.nationality, input.sex, photoUrl, row.astronaut_id);
			db.prepare('UPDATE crew_profiles SET role = ?, tone = ? WHERE id = ?').run(input.role, input.tone, id);
		} else {
			const key = randomUUID();
			db.prepare('INSERT INTO astronauts(id, full_name, nationality, sex, photo_path) VALUES(?,?,?,?,?)')
				.run(key, `${input.first_name} ${input.last_name}`, input.nationality, input.sex, photoUrl);
			const result = db.prepare('INSERT INTO crew_profiles(astronaut_id,role,tone) VALUES(?,?,?)').run(key, input.role, input.tone);
			profileId = Number(result.lastInsertRowid);
			insertTasks(profileId, onboardingTasks(profileId));
		}
		db.exec('COMMIT');
		return profileId;
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
}

/** Foreign keys intentionally prevent deleting astronauts with medical history. */
export function deleteAstronaut(id: number): boolean {
	const result = getDb().prepare('DELETE FROM astronauts WHERE id = (SELECT astronaut_id FROM crew_profiles WHERE id = ?)').run(id);
	return Number(result.changes) > 0;
}

export function toggleTask(id: number, taskId: number): boolean {
	const db = getDb();
	db.exec('BEGIN IMMEDIATE');
	try {
		const task = db.prepare('SELECT done, xp FROM crew_tasks WHERE id = ? AND profile_id = ?').get(taskId, id);
		if (!task) { db.exec('ROLLBACK'); return false; }
		db.prepare('UPDATE crew_tasks SET done = 1 - done WHERE id = ? AND profile_id = ?').run(taskId, id);
		db.prepare('UPDATE crew_profiles SET xp_total = max(0, xp_total + ?) WHERE id = ?')
			.run(task.done ? -Number(task.xp) : Number(task.xp), id);
		db.exec('COMMIT');
		return true;
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
}

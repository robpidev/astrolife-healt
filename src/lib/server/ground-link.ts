import { getDb } from '#lib/server/db.js';

export type GroundMessageKind = 'alert' | 'recommendation' | 'consult' | 'sync';

export interface GroundMessage {
	id: number;
	direction: 'up' | 'down';
	kind: GroundMessageKind;
	body: string;
	status: 'queued' | 'sent' | 'received';
	created_at: string;
	synced_at: string | null;
}

function astronautIdFor(profileId: number): string | null {
	const row = getDb()
		.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?')
		.get(profileId) as unknown as { astronaut_id: string } | undefined;
	return row?.astronaut_id ?? null;
}

export function listGroundMessages(profileId: number, limit = 10): GroundMessage[] {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return [];

	return getDb()
		.prepare(
			`SELECT id, direction, kind, body, status, created_at, synced_at
			 FROM ground_messages WHERE astronaut_id = ?
			 ORDER BY created_at DESC, id DESC LIMIT ?`
		)
		.all(astronautId, limit) as unknown as GroundMessage[];
}

/** Local simulation: the message is queued now and marked sent immediately. */
export function queueGroundMessage(
	profileId: number,
	kind: GroundMessageKind,
	body: string
): GroundMessage | null {
	const astronautId = astronautIdFor(profileId);
	if (!astronautId) return null;

	const trimmed = body.trim();
	if (!trimmed || trimmed.length > 1000) return null;

	const result = getDb()
		.prepare(
			`INSERT INTO ground_messages(astronaut_id, direction, kind, body, status, synced_at)
			 VALUES(?, 'up', ?, ?, 'sent', CURRENT_TIMESTAMP)`
		)
		.run(astronautId, kind, trimmed);

	const id = Number(result.lastInsertRowid);
	return getDb()
		.prepare(
			`SELECT id, direction, kind, body, status, created_at, synced_at
			 FROM ground_messages WHERE id = ?`
		)
		.get(id) as unknown as GroundMessage;
}

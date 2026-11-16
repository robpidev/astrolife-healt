import { error, fail } from '@sveltejs/kit';
import type { GroundMessageKind } from '#lib/server/ground-link.js';
import { listGroundMessages, queueGroundMessage } from '#lib/server/ground-link.js';
import { getRecommendations } from '#lib/server/recommendations.js';
import type { Actions, PageServerLoad } from './$types';

function profileId(params: { id: string }): number {
	const id = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');
	return id;
}

export const load: PageServerLoad = ({ params }) => {
	const id = profileId(params);
	return {
		directives: getRecommendations(id),
		messages: listGroundMessages(id)
	};
};

export const actions: Actions = {
	send: async ({ params, request }) => {
		const form = await request.formData();
		const body = String(form.get('body') ?? '');
		const kind = String(form.get('kind') ?? 'recommendation') as GroundMessageKind;
		const allowed: GroundMessageKind[] = ['alert', 'recommendation', 'consult', 'sync'];
		if (!allowed.includes(kind)) return fail(400, { message: 'Invalid message type.' });

		const message = queueGroundMessage(profileId(params), kind, body);
		if (!message) return fail(400, { message: 'Enter a message up to 1000 characters.' });

		return { success: true, message: 'Directive sent to ground control.' };
	}
};

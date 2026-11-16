import { fail } from '@sveltejs/kit';
import { getAreaSnapshots } from '#lib/server/health-metrics.js';
import {
	closeSpeAlert,
	getRadiationSummary,
	saveRadiationEnvironment,
	startSpeAlert
} from '#lib/server/radiation.js';
import { parseRadiationForm } from '#lib/server/radiation-registration.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();

	return {
		snapshots: getAreaSnapshots(astronaut.id, 'radiation'),
		summary: getRadiationSummary(astronaut.id)
	};
};

export const actions: Actions = {
	environment: async ({ params, request }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		const parsed = parseRadiationForm(await request.formData());
		if (!parsed.data || parsed.data.kind !== 'environment') {
			return fail(400, { values: parsed.values, errors: parsed.errors });
		}

		if (!saveRadiationEnvironment(profileId, parsed.data.environment, parsed.data.shielding)) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		return { success: true, message: 'Habitat saved.' };
	},

	startSpe: async ({ params }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		const result = startSpeAlert(profileId, new Date().toISOString());
		if (result === 'missing') return fail(404, { error: 'Astronaut not found.' });
		if (result === 'already-open') {
			return fail(400, { error: 'A solar particle event alert is already open.' });
		}

		return { success: true, message: 'Solar particle event alert opened.' };
	},

	closeSpe: async ({ params }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		if (!closeSpeAlert(profileId)) {
			return fail(400, { error: 'No solar particle event alert is open.' });
		}

		return { success: true, message: 'Solar particle event alert closed.' };
	}
};

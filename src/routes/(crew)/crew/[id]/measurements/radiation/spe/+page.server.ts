import { fail } from '@sveltejs/kit';
import { getSpeReadings } from '#lib/server/health-metrics.js';
import { getRadiationSummary } from '#lib/server/radiation.js';
import { parseRadiationForm, registerSpeSegment } from '#lib/server/radiation-registration.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	const summary = getRadiationSummary(astronaut.id);

	return {
		// The SPE rows are not a health card, so they need their own query; the
		// `notes` column tells an event start from a dose segment.
		readings: getSpeReadings(astronaut.id),
		assessment: summary?.assessments.find((item) => item.guideline.id === 'spe') ?? null,
		profile: summary?.profile ?? null
	};
};

export const actions: Actions = {
	spe: async ({ params, request }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		const parsed = parseRadiationForm(await request.formData());
		if (!parsed.data || parsed.data.kind !== 'spe') {
			return fail(400, { values: parsed.values, errors: parsed.errors });
		}

		const result = registerSpeSegment(profileId, parsed.data.value ?? 0);
		if (result === 'missing') return fail(404, { error: 'Astronaut not found.' });
		if (result === 'no-alert') {
			return fail(400, { error: 'Open a solar particle event alert before logging segments.' });
		}

		return { success: true, message: 'Event segment saved.' };
	}
};

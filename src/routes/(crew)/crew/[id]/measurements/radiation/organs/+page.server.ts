import { fail } from '@sveltejs/kit';
import { radiationOrganLabels } from '#lib/data/radiation.js';
import { getOrganReadings } from '#lib/server/health-metrics.js';
import { getRadiationSummary } from '#lib/server/radiation.js';
import { parseRadiationForm, registerOrganDose } from '#lib/server/radiation-registration.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	const summary = getRadiationSummary(astronaut.id);

	return {
		organs: radiationOrganLabels,
		readings: getOrganReadings(astronaut.id, 120),
		assessments: (summary?.assessments ?? []).filter((item) => item.guideline.organ !== null),
		speAlertActive: summary?.profile.spe_alert_active ?? false
	};
};

export const actions: Actions = {
	organ: async ({ params, request }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		const parsed = parseRadiationForm(await request.formData());
		if (!parsed.data || parsed.data.kind !== 'organ' || parsed.data.organ === null) {
			return fail(400, { values: parsed.values, errors: parsed.errors });
		}

		if (!registerOrganDose(profileId, parsed.data.organ, parsed.data.value ?? 0)) {
			return fail(404, { error: 'Astronaut not found.' });
		}

		return { success: true, message: 'Organ dose saved.' };
	}
};

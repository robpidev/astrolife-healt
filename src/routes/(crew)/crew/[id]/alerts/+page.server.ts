import { error, fail } from '@sveltejs/kit';
import type { HealthIndicatorId } from '#lib/utils/health-assessment.js';
import { acknowledgeAlert, getAstronautAlerts } from '#lib/server/alerts.js';
import type { Actions, PageServerLoad } from './$types';

function profileId(params: { id: string }): number {
	const id = /^\d+$/.test(params.id) ? Number(params.id) : NaN;
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');
	return id;
}

export const load: PageServerLoad = ({ params }) => ({
	alerts: getAstronautAlerts(profileId(params))
});

export const actions: Actions = {
	acknowledge: async ({ params, request }) => {
		const form = await request.formData();
		const indicator = String(form.get('indicator') ?? '') as HealthIndicatorId;
		const readingId = String(form.get('reading_id') ?? '');
		if (!indicator || !readingId) {
			return fail(400, { message: 'Invalid warning.' });
		}

		const active = getAstronautAlerts(profileId(params)).some(
			(alert) => alert.indicator === indicator && alert.reading_id === readingId
		);
		if (!active) {
			return fail(404, { message: 'The warning is no longer active.' });
		}

		// A repeated submit for an already acknowledged reading is harmless.
		acknowledgeAlert(profileId(params), indicator, readingId);
		return { success: true, message: 'Warning acknowledged.' };
	}
};

import { error, fail } from '@sveltejs/kit';
import {
	createBodyTemperatureReading,
	listBodyTemperatureReadings,
	parseBodyTemperature
} from '#lib/server/body-temperature.js';
import { getLatestHealthReadings } from '#lib/server/health-reference.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	return {
		readings: listBodyTemperatureReadings(astronaut.id),
		healthReadings: getLatestHealthReadings(astronaut.id)
	};
};

export const actions: Actions = {
	add: async ({ params, request }) => {
		const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
		if (!Number.isSafeInteger(profileId) || profileId <= 0) {
			error(404, 'Astronaut not found');
		}

		const formData = await request.formData();
		const rawValue = formData.get('temperature');
		const value = parseBodyTemperature(rawValue);
		if (value === null) {
			return fail(400, {
				error: 'Enter a valid temperature between 30.0 and 45.0 °C (one decimal place).'
			});
		}

		if (!createBodyTemperatureReading(profileId, value)) {
			error(404, 'Astronaut not found');
		}
		return { success: true };
	}
};

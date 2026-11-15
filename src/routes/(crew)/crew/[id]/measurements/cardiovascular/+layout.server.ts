import type { LayoutServerLoad } from './$types';
import { listCardiovascularReadings } from '#lib/server/cardiovascular.js';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { astronaut } = await parent();
	return { cardiovascular: listCardiovascularReadings(astronaut.id) };
};

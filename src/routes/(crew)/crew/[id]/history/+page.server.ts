import { error } from '@sveltejs/kit';
import { healthAreas } from '#lib/data/healthAreas.js';
import type { HealthAreaId } from '#lib/interfaces/health-area.js';
import { getHealthHistory, getRecordedMetrics } from '#lib/server/history.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const id = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');

	const areaParam = url.searchParams.get('area');
	const area = healthAreas.some((item) => item.id === areaParam)
		? (areaParam as HealthAreaId)
		: null;
	const metric = url.searchParams.get('metric')?.trim() ?? '';

	return {
		entries: getHealthHistory(id, {
			area,
			metric: metric || null,
			from: url.searchParams.get('from'),
			to: url.searchParams.get('to')
		}),
		metrics: getRecordedMetrics(id),
		filters: {
			area,
			metric,
			from: url.searchParams.get('from') ?? '',
			to: url.searchParams.get('to') ?? ''
		}
	};
};

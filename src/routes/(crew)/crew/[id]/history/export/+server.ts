import { error } from '@sveltejs/kit';
import { healthAreas } from '#lib/data/healthAreas.js';
import type { HealthAreaId } from '#lib/interfaces/health-area.js';
import { getHealthHistory, historyToCsv } from '#lib/server/history.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, url }) => {
	const id = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');

	const areaParam = url.searchParams.get('area');
	const area = healthAreas.some((item) => item.id === areaParam)
		? (areaParam as HealthAreaId)
		: null;

	const entries = getHealthHistory(id, {
		area,
		metric: url.searchParams.get('metric'),
		from: url.searchParams.get('from'),
		to: url.searchParams.get('to'),
		limit: 500
	});

	return new Response(historyToCsv(entries), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="astrolife-history-${params.id}.csv"`
		}
	});
};

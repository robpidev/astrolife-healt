import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The all-at-once form was replaced by one question per page, reached from
// each sub-item; old links land on the area overview.
export const GET: RequestHandler = ({ params }) => {
	redirect(308, `/crew/${params.id}/measurements/mental`);
};

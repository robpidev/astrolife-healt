import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Sleep is part of the mental-health area now; keep old bookmarks working.
export const GET: RequestHandler = ({ params }) => {
	redirect(308, `/crew/${params.id}/measurements/mental`);
};

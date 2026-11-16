import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * `PUBLIC_DEMO_MODE` turns the whole app into the static demo. It is static and
 * public so the client can skip the database-backed loads without a round trip.
 */
export const variables = defineEnvVars({
	PUBLIC_DEMO_MODE: {
		public: true,
		static: true,
		description: 'Serve the demo with mock data instead of the SQLite database.',
		schema: (value) => value === 'true' || value === '1'
	}
});

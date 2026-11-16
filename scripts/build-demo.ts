/**
 * Builds the interactive demo as a static single-page app.
 *
 * SPA mode cannot keep any `+page.server.ts`, `+layout.server.ts` or `+server.ts`
 * file, so the demo is built from a staging copy in `.demo/` where the demo
 * routes are pruned, every server load is replaced by a universal load backed by
 * `src/lib/demo/mock-data.json`, and `adapter-static` writes a `200.html`
 * fallback. The real Vercel/Node build is untouched.
 *
 *   bun run build:demo
 *   BASE_PATH=/astrolife-healt bun run build:demo   # GitHub Pages project site
 */
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dir, '..');
const stage = join(root, '.demo');
const routes = join(stage, 'src/routes');

function remove(path: string): void {
	rmSync(path, { recursive: true, force: true });
}

function removeServerFiles(dir: string): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			removeServerFiles(path);
		} else if (/^\+(page|layout)\.server\.ts$/.test(entry.name) || entry.name === '+server.ts') {
			rmSync(path);
		}
	}
}

function writeRoute(path: string, contents: string): void {
	mkdirSync(path, { recursive: true });
	writeFileSync(join(path, '+page.ts'), contents);
}

function pageLoad(imports: string, body: string): string {
	return `${imports}
import { readClientDeltas } from '#lib/demo/demo-store.js';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const id = Number(params.id);
${body}
};
`;
}

const idGuard = `	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Astronaut not found');`;

// --- staging copy -----------------------------------------------------------

remove(stage);
mkdirSync(stage, { recursive: true });

for (const entry of ['src', 'static']) {
	cpSync(join(root, entry), join(stage, entry), { recursive: true });
}
for (const file of ['vite.config.ts', 'tsconfig.json', 'package.json']) {
	cpSync(join(root, file), join(stage, file));
}
symlinkSync(join(root, 'node_modules'), join(stage, 'node_modules'), 'dir');

// --- prune routes outside the demo -----------------------------------------

remove(join(routes, '(app)'));

const profile = join(routes, '(crew)/crew/[id]');
for (const entry of readdirSync(profile)) {
	if (!['+layout.svelte', '+page.svelte', 'measurements', 'medical'].includes(entry)) {
		remove(join(profile, entry));
	}
}

const measurements = join(profile, 'measurements');
for (const entry of readdirSync(measurements)) {
	if (!['+layout.svelte', '+page.svelte', 'cardiovascular', 'radiation'].includes(entry)) {
		remove(join(measurements, entry));
	}
}

const cardiovascular = join(measurements, 'cardiovascular');
for (const entry of readdirSync(cardiovascular)) {
	if (!['+page.svelte', 'heart-rate'].includes(entry)) {
		remove(join(cardiovascular, entry));
	}
}

const heartRate = join(cardiovascular, 'heart-rate');
for (const entry of readdirSync(heartRate)) {
	if (entry !== '+page.svelte') remove(join(heartRate, entry));
}

removeServerFiles(routes);

// --- universal loads backed by the snapshot --------------------------------

writeFileSync(
	join(stage, 'src/routes/+layout.ts'),
	`// The demo is a pure client-side app: no server, no prerender.
export const ssr = false;
export const prerender = false;
`
);

writeFileSync(
	join(routes, '(crew)/+page.ts'),
	`import { demoCrew } from '#lib/demo/mock-data.js';
import type { PageLoad } from './$types';

export const load: PageLoad = () => demoCrew();
`
);

writeFileSync(
	join(profile, '+layout.ts'),
	`import { error } from '@sveltejs/kit';
import { demoLayout } from '#lib/demo/mock-data.js';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => {
	const id = Number(params.id);
${idGuard}
	const demo = demoLayout(id);
	if (!demo) error(404, 'Astronaut not found');
	return demo;
};
`
);

writeRoute(
	profile,
	pageLoad(
		`import { error } from '@sveltejs/kit';
import { demoSummary } from '#lib/demo/mock-data.js';`,
		`${idGuard}
	const demo = demoSummary(id, readClientDeltas());
	if (!demo) error(404, 'Astronaut not found');
	return demo;`
	)
);

writeRoute(
	measurements,
	pageLoad(
		`import { error } from '@sveltejs/kit';
import { demoMeasurements } from '#lib/demo/mock-data.js';`,
		`${idGuard}
	const demo = demoMeasurements(id);
	if (!demo) error(404, 'Astronaut not found');
	return demo;`
	)
);

writeRoute(
	cardiovascular,
	pageLoad(
		`import { error } from '@sveltejs/kit';
import { demoCardiovascular } from '#lib/demo/mock-data.js';`,
		`${idGuard}
	const demo = demoCardiovascular(id, readClientDeltas());
	if (!demo) error(404, 'Astronaut not found');
	return demo;`
	)
);

writeRoute(
	heartRate,
	pageLoad(
		`import { error } from '@sveltejs/kit';
import { demoHeartRate } from '#lib/demo/mock-data.js';`,
		`${idGuard}
	const demo = demoHeartRate(id, readClientDeltas());
	if (!demo) error(404, 'Astronaut not found');
	return demo;`
	)
);

writeRoute(
	join(measurements, 'radiation'),
	pageLoad(
		`import { error } from '@sveltejs/kit';
import { demoRadiation } from '#lib/demo/mock-data.js';`,
		`${idGuard}
	const demo = demoRadiation(id);
	if (!demo) error(404, 'Astronaut not found');
	return demo;`
	)
);

writeRoute(
	join(profile, 'medical'),
	pageLoad(
		`import { error } from '@sveltejs/kit';
import { demoMedical } from '#lib/demo/mock-data.js';`,
		`${idGuard}
	const demo = demoMedical(id);
	if (!demo) error(404, 'Astronaut not found');
	return demo;`
	)
);

// --- catch-all for routes outside the demo ---------------------------------

const catchAll = join(routes, '[...rest]');
mkdirSync(catchAll, { recursive: true });
writeFileSync(
	join(catchAll, '+page.svelte'),
	`<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Not in the demo · Astrolife</title>
</svelte:head>

<main
	class="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-6 text-center text-slate-200"
>
	<p class="text-xs tracking-[0.2em] text-cyan-300 uppercase">Astrolife demo</p>
	<h1 class="text-2xl font-semibold text-white">This section is not part of the demo</h1>
	<p class="text-sm leading-relaxed text-slate-400">
		The tour covers the crew dashboard, the measurements, the radiation limits and the medical
		dossier. Everything else lives in the full app.
	</p>
	<a
		href={resolve('/(crew)')}
		class="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
	>
		Back to the crew
	</a>
</main>
`
);

// --- build -----------------------------------------------------------------

const env = {
	...process.env,
	BUILD_TARGET: 'demo',
	PUBLIC_DEMO_MODE: 'true'
};

const result = spawnSync('bunx', ['vite', 'build'], {
	cwd: stage,
	env,
	stdio: 'inherit'
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

const output = join(stage, 'build');
if (!existsSync(join(output, process.env.DEMO_FALLBACK ?? '200.html'))) {
	console.error(`Build finished without the expected fallback in ${output}`);
	process.exit(1);
}

console.log(`\nDemo built in ${output}`);

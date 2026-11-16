import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import adapterVercel from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

// Three targets: Vercel by default (the hosted app), a standalone Node server
// for the Docker image (`BUILD_TARGET=node`), and the static demo
// (`BUILD_TARGET=demo`, driven by `scripts/build-demo.ts`).
const target =
	process.env.BUILD_TARGET === 'node'
		? 'node'
		: process.env.BUILD_TARGET === 'demo'
			? 'demo'
			: 'vercel';

// GitHub Pages project sites live under `/<repo>`; the demo build reads it from
// the environment so the same script works for root-hosted deployments.
const base: '' | `/${string}` =
	target === 'demo' && process.env.BASE_PATH ? (process.env.BASE_PATH as `/${string}`) : '';

const adapter =
	target === 'node'
		? adapterNode()
		: target === 'demo'
			? adapterStatic({
					pages: 'build',
					assets: 'build',
					fallback: process.env.DEMO_FALLBACK ?? '200.html',
					precompress: false,
					strict: false
				})
			: adapterVercel();

export default defineConfig({
	server: {
		allowedHosts: true
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			paths: { base },
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

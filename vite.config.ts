import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

// One build, two targets: Vercel by default (the hosted demo) and a standalone
// Node server for the downloadable Docker image. The Dockerfile sets
// BUILD_TARGET=node, so a plain `bun run build` keeps the hosted behaviour.
const target = process.env.BUILD_TARGET === 'node' ? 'node' : 'vercel';

export default defineConfig({
	server: {
		allowedHosts: true
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: target === 'node' ? adapterNode() : adapterVercel()
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

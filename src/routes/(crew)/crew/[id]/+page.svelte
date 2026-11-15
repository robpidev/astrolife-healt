<script lang="ts">
	import { goto } from '$app/navigation';
	import { astronautName } from '#lib/utils/crew.js';
	import { crewTones } from '#lib/utils/crew-theme.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let astronaut = $derived(data.astronaut);
	let name = $derived(astronautName(astronaut));
	let tone = $derived(crewTones[astronaut.tone]);

	async function goBack(): Promise<void> {
		// The crew dashboard is the root page: `/(crew)` is a route group, not a
		// URL segment.
		await goto('/');
	}
</script>

<svelte:head>
	<title>{name} · Astrolife</title>
	<meta name="description" content="Perfil del astronauta {name} en la tripulación de Astrolife." />
</svelte:head>

<div class="relative flex min-h-dvh flex-col overflow-x-hidden text-slate-100">
	<div class="crew-backdrop absolute inset-0" aria-hidden="true"></div>
	<div class="star-field absolute inset-0 opacity-20" aria-hidden="true"></div>
	<div
		class="absolute top-1/3 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px] {tone.glow}"
		aria-hidden="true"
	></div>

	<header class="relative z-20 flex items-center justify-between gap-4 px-5 pt-5 sm:px-8">
		<button
			type="button"
			onclick={goBack}
			class="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-4"
				aria-hidden="true"
			>
				<path d="M19 12H5M11 18l-6-6 6-6" />
			</svg>
			Tripulación
		</button>

		<p class="font-mono text-xs font-semibold tracking-[0.3em] text-white">ASTROLIFE</p>
	</header>

	<main class="relative z-10 flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
		<h1 class="text-center text-4xl font-semibold tracking-tight text-white sm:text-6xl">
			{name}
		</h1>
	</main>
</div>

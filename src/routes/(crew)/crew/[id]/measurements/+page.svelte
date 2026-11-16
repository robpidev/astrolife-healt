<script lang="ts">
	import { resolve } from '$app/paths';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';
	import { sharedTransition } from '#lib/services/view-transition.svelte.js';
	import { areaIconName, areaTitleName } from '#lib/utils/shared-transition.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
</script>

<svelte:head>
	<title>Measurements · Astrolife</title>
</svelte:head>

<section class="space-y-5">
	<header class="border-b border-cyan-200/10 pb-4">
		<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Health monitoring</p>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Measurements</h1>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
			Review the five health areas, open an indicator to see its trend, and record new readings.
		</p>
	</header>

	<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.areas as area (area.id)}
			{@const shared = area.id === sharedTransition.areaId}
			<li>
				<a
					href={resolve(`${basePath}/measurements/${area.id}`.slice(1) as `crew/${string}`)}
					class="group flex h-full flex-col rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5 transition-colors hover:border-cyan-300/40 hover:bg-[#0d2137] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-300"
				>
					<div class="flex items-start justify-between gap-3">
						<span
							class="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200"
							style:view-transition-name={shared ? areaIconName(area.id) : null}
						>
							<HealthIcon name={area.id} />
						</span>
						<span
							class="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 tabular-nums"
						>
							{area.recorded}/{area.total}
						</span>
					</div>
					<h2
						class="mt-4 text-lg font-semibold text-white"
						style:view-transition-name={shared ? areaTitleName(area.id) : null}
					>
						{area.label}
					</h2>
					<p class="mt-1 text-sm text-slate-400">
						{area.recorded === 0
							? 'No indicators recorded yet.'
							: `${area.recorded} of ${area.total} indicators recorded.`}
					</p>
					<div class="mt-auto flex items-center justify-between gap-3 pt-4">
						<span class="text-xs text-slate-500">
							{area.lastUpdate
								? `Last update ${area.lastUpdate.slice(0, 10)}`
								: 'Awaiting first reading'}
						</span>
						<span
							aria-hidden="true"
							class="text-sm text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-200"
							>→</span
						>
					</div>
				</a>
			</li>
		{/each}
	</ul>
</section>

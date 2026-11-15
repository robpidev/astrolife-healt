<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import AstronautIdentityCard from '#lib/components/astronaut/AstronautIdentityCard.svelte';
	import AstronautBodyMap from '#lib/components/astronaut/AstronautBodyMap.svelte';
	import HealthAreaSelector from '#lib/components/astronaut/HealthAreaSelector.svelte';
	import ProfileTabs from '#lib/components/navigation/ProfileTabs.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
	let scrollPanel = $state<HTMLElement | null>(null);

	// SvelteKit only resets the document scroll, so the inner page panel needs an explicit reset.
	afterNavigate(() => {
		scrollPanel?.scrollTo({ top: 0 });
	});
</script>

<div class="relative isolate flex h-dvh flex-col overflow-hidden bg-[#050d1c] text-slate-100">
	<div
		class="star-field pointer-events-none absolute inset-0 -z-10 opacity-40"
		aria-hidden="true"
	></div>
	<div
		class="pointer-events-none absolute top-48 left-1/3 -z-10 size-[600px] rounded-full bg-cyan-500/5 blur-[130px]"
		aria-hidden="true"
	></div>
	<div
		class="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col px-5 py-8 sm:px-8 lg:px-10"
	>
		<div class="mb-7 shrink-0">
			<p class="mb-2 text-xs font-medium tracking-[0.24em] text-cyan-300/70 uppercase">
				Centro de salud · Perfil individual
			</p>
			<h1 class="text-3xl font-semibold tracking-tight text-slate-50">Perfil del astronauta</h1>
			<p class="mt-2 text-sm text-slate-400">
				Información personal y seguimiento de las áreas de salud.
			</p>
		</div>
		<div class="shrink-0">
			<ProfileTabs {basePath} />
		</div>
		<div
			class="mt-7 grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] items-stretch gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(350px,0.8fr)_minmax(0,1.6fr)] xl:grid-rows-[minmax(0,1fr)]"
		>
			<aside
				class="app-scroll hidden min-h-0 overflow-y-auto overscroll-contain lg:row-span-2 lg:block xl:row-span-1"
			>
				<AstronautIdentityCard astronaut={data.astronaut} />
			</aside>
			<section
				class="app-scroll grid min-h-0 items-center gap-3 lg:col-start-2 xl:grid-cols-[minmax(0,1fr)_150px] xl:overflow-y-auto xl:overscroll-contain"
				aria-label="Explorar áreas de salud"
			>
				<div class="hidden xl:block">
					<AstronautBodyMap />
				</div>
				<HealthAreaSelector {basePath} />
			</section>
			<main
				bind:this={scrollPanel}
				class="app-scroll min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-2xl border border-cyan-200/15 bg-[#0b1729]/90 p-5 shadow-2xl shadow-black/20 sm:p-6 lg:col-start-2 xl:col-start-3"
			>
				{@render children()}
			</main>
		</div>
	</div>
</div>

<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AstronautIdentityCard from '#lib/components/astronaut/AstronautIdentityCard.svelte';
	import AstronautBodyMap from '#lib/components/astronaut/AstronautBodyMap.svelte';
	import HealthAreaSelector from '#lib/components/astronaut/HealthAreaSelector.svelte';
	import HealthStatusChip from '#lib/components/health/HealthStatusChip.svelte';
	import ProfileTabs from '#lib/components/navigation/ProfileTabs.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
	let scrollPanel = $state<HTMLElement | null>(null);

	// SvelteKit only resets the document scroll, so the inner page panel needs an explicit reset.
	afterNavigate(() => {
		scrollPanel?.scrollTo({ top: 0 });
	});

	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			void goto(resolve('/(crew)'));
		}
	}
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
		class="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col px-5 py-4 sm:px-8 lg:px-10"
	>
		<header class="flex shrink-0 items-center gap-3 border-b border-cyan-200/10 pb-3">
			<button
				type="button"
				onclick={goBack}
				aria-label="Go back"
				class="grid size-8 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-cyan-300/5 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-4"
					aria-hidden="true"
				>
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
			</button>
			<a
				href={resolve('/(crew)')}
				aria-label="Astrolife, back to crew"
				class="flex shrink-0 items-center gap-2 font-mono text-sm font-semibold tracking-[0.3em] text-slate-100 uppercase transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				<span aria-hidden="true" class="text-cyan-300/80">◆</span>
				Astrolife
			</a>
			<span aria-hidden="true" class="h-4 w-px shrink-0 bg-cyan-200/15"></span>
			<div class="min-w-0 flex-1">
				<ProfileTabs {basePath} class="min-w-0 flex-1 justify-start lg:justify-end" />
			</div>
			<HealthStatusChip
				summary={data.alertSummary}
				href={'/crew/' + data.astronaut.id + '/alerts'}
			/>
		</header>
		<div
			class="mt-4 grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] items-stretch gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(350px,0.8fr)_minmax(0,1.6fr)] xl:grid-rows-[minmax(0,1fr)]"
		>
			<aside
				class="app-scroll hidden min-h-0 overflow-y-auto overscroll-contain lg:row-span-2 lg:block xl:row-span-1"
			>
				<AstronautIdentityCard astronaut={data.astronaut} />
			</aside>
			<section
				class="app-scroll grid min-h-0 items-center gap-3 lg:col-start-2 xl:grid-cols-[minmax(0,1fr)_150px] xl:overflow-y-auto xl:overscroll-contain"
				aria-label="Explore health areas"
			>
				<div class="mx-auto w-full max-w-[250px] xl:max-w-none">
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

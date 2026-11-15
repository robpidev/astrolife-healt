<script lang="ts">
	import AstronautIdentityCard from '#lib/components/astronaut/AstronautIdentityCard.svelte';
	import AstronautBodyMap from '#lib/components/astronaut/AstronautBodyMap.svelte';
	import HealthAreaSelector from '#lib/components/astronaut/HealthAreaSelector.svelte';
	import ProfileTabs from '#lib/components/navigation/ProfileTabs.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
</script>

<div class="relative isolate min-h-dvh overflow-hidden bg-[#050d1c] text-slate-100">
	<div class="star-field pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true">
	</div>
	<div
		class="pointer-events-none absolute top-48 left-1/3 -z-10 size-[600px] rounded-full bg-cyan-500/5 blur-[130px]"
		aria-hidden="true"
	>
	</div>
	<div class="mx-auto max-w-[1800px] px-5 py-8 sm:px-8 lg:px-10">
		<div class="mb-7">
			<p class="mb-2 text-xs font-medium tracking-[0.24em] text-cyan-300/70 uppercase">
				Centro de salud · Perfil individual
			</p>
			<h1 class="text-3xl font-semibold tracking-tight text-slate-50">
				Perfil del astronauta
			</h1>
			<p class="mt-2 text-sm text-slate-400">
				Información personal y seguimiento de las áreas de salud.
			</p>
		</div>
		<ProfileTabs {basePath} />
		<div
			class="mt-7 grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(350px,0.8fr)_minmax(0,1.6fr)]"
		>
			<aside>
				<AstronautIdentityCard astronaut={data.astronaut} />
			</aside>
			<section
				class="grid items-center gap-3 rounded-2xl border border-cyan-200/10 bg-slate-900/30 p-4 sm:grid-cols-[minmax(0,1fr)_150px] lg:col-start-2 xl:col-start-auto"
				aria-label="Explorar áreas de salud"
			>
				<AstronautBodyMap />
				<HealthAreaSelector {basePath} />
			</section>
			<main
				class="min-w-0 rounded-2xl border border-cyan-200/15 bg-[#0b1729]/90 p-5 shadow-2xl shadow-black/20 lg:col-start-2 xl:col-start-auto sm:p-6"
			>
				{@render children()}
			</main>
		</div>
	</div>
</div>

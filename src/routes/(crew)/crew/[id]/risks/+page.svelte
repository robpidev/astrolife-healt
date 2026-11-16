<script lang="ts">
	import HealthStatusBadge from '#lib/components/health/HealthStatusBadge.svelte';
	import type { HealthSeverity, RiskFactor } from '#lib/interfaces/health.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let factors = $derived(data.factors as RiskFactor[]);
	let overall = $derived(data.overall as HealthSeverity);

	// Whole class strings keep the Tailwind utilities in the production build.
	const cardTone: Record<HealthSeverity, string> = {
		green: 'border-emerald-300/20 shadow-emerald-500/5',
		yellow: 'border-amber-300/25 shadow-amber-500/5',
		red: 'border-rose-300/30 shadow-rose-500/10',
		unknown: 'border-slate-300/15 shadow-slate-500/5'
	};
</script>

<svelte:head>
	<title>Threats · Astrolife</title>
</svelte:head>

<section class="space-y-5">
	<header
		class="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-200/10 pb-4"
	>
		<div>
			<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Risk assessment</p>
			<h1 class="text-xl font-semibold tracking-tight text-white sm:text-2xl">Threats</h1>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs tracking-[0.12em] text-slate-500 uppercase">Overall</span>
			<HealthStatusBadge severity={overall} />
		</div>
	</header>

	{#if factors.length === 0}
		<div class="rounded-xl border border-dashed border-white/15 p-6 text-center">
			<p class="text-sm text-slate-400">No risk assessments available yet.</p>
		</div>
	{:else}
		<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each factors as factor (factor.id)}
				<li
					class="flex flex-col rounded-xl border bg-[#0b1b2e] p-4 shadow-lg {cardTone[
						factor.severity
					]}"
				>
					<div class="flex items-start justify-between gap-2">
						<h2 class="text-sm font-semibold text-slate-100">{factor.label}</h2>
						<HealthStatusBadge severity={factor.severity} />
					</div>

					<div class="mt-3 flex-1">
						<p class="text-[11px] tracking-[0.14em] text-slate-500 uppercase">Evidence</p>
						{#if factor.evidence.length === 0}
							<p class="mt-1.5 text-xs text-slate-500">No evidence recorded</p>
						{:else}
							<ul class="mt-1.5 space-y-1">
								{#each factor.evidence as item, index (index)}
									<li class="flex items-start gap-1.5 text-xs leading-relaxed text-slate-300">
										<span aria-hidden="true" class="mt-0.5 text-cyan-300/70">›</span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<p class="mt-3 border-t border-white/5 pt-3 text-xs leading-relaxed text-slate-400">
						{factor.protocol}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

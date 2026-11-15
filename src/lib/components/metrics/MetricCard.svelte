<script lang="ts">
	import { resolve } from '$app/paths';
	import Sparkline from '#lib/components/metrics/Sparkline.svelte';
	import type { SurveyTone } from '#lib/interfaces/mental-survey.js';

	interface Props {
		title: string;
		/** Already formatted by the server, e.g. `36.8` or `120/80`. */
		value?: string | number | null;
		unit?: string;
		points?: readonly number[];
		href?: string | null;
		/** Only meaningful when the card owns the reading; metric-detail pages render no value. */
		showEmpty?: boolean;
		tone?: SurveyTone | null;
	}

	let {
		title,
		value = null,
		unit = '',
		points = [],
		href = null,
		showEmpty = false,
		tone = null
	}: Props = $props();

	// Whole strings stay literal so Tailwind keeps the tone classes in the build.
	let toneBadge = $derived.by(() => {
		switch (tone) {
			case 'green':
				return {
					label: 'Good',
					class:
						'rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide border-teal-300/30 bg-teal-400/10 text-teal-200'
				};
			case 'yellow':
				return {
					label: 'Follow up',
					class:
						'rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide border-amber-300/30 bg-amber-400/10 text-amber-200'
				};
			case 'red':
				return {
					label: 'Alert',
					class:
						'rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide border-rose-300/30 bg-rose-400/10 text-rose-200'
				};
			default:
				return null;
		}
	});
</script>

{#snippet content()}
	<div class="flex items-center justify-between gap-3">
		<h3 class="text-xs font-medium text-slate-300">
			{title}
		</h3>
		<div class="flex items-center gap-2">
			{#if toneBadge}
				<span class={toneBadge.class}>{toneBadge.label}</span>
			{/if}
			{#if href}
				<span
					aria-hidden="true"
					class="text-sm text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-200"
					>→</span
				>
			{/if}
		</div>
	</div>
	<p class="mt-3 text-3xl font-light tracking-tight text-cyan-100">
		{value ?? '—'}{#if unit}<span class="ml-1 text-xs font-normal text-slate-500">{unit}</span>{/if}
	</p>
	<Sparkline {points} />
	{#if showEmpty && value === null}
		<p class="mt-1 text-xs text-slate-500">No measurements recorded.</p>
	{/if}
{/snippet}

{#if href}
	<a
		href={resolve(href.slice(1) as `crew/${string}`)}
		class="group block rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4 transition-colors hover:border-cyan-300/40 hover:bg-[#0d2137] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-300"
	>
		{@render content()}
		<span class="sr-only">View measurement</span>
	</a>
{:else}
	<article class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
		{@render content()}
	</article>
{/if}

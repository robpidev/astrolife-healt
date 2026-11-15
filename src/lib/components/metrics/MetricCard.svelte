<script lang="ts">
	import Sparkline from '#lib/components/metrics/Sparkline.svelte';

	interface Props {
		title: string;
		/** Already formatted by the server, e.g. `36.8` or `120/80`. */
		value?: string | null;
		unit?: string;
		points?: readonly number[];
		href?: string | null;
		/** Only meaningful when the card owns the reading; metric-detail pages render no value. */
		showEmpty?: boolean;
	}

	let {
		title,
		value = null,
		unit = '',
		points = [],
		href = null,
		showEmpty = false
	}: Props = $props();
</script>

{#snippet content()}
	<div class="flex items-center justify-between gap-3">
		<h3 class="text-xs font-medium text-slate-300">
			{title}
		</h3>
		{#if href}
			<span
				aria-hidden="true"
				class="text-sm text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-200"
				>→</span
			>
		{/if}
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
		{href}
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

<script lang="ts">
	interface Props {
		points: readonly number[];
		unit?: string;
		decimals?: number;
		label?: string;
	}

	let { points, unit = '', decimals, label = 'Statistics' }: Props = $props();

	const formatter = $derived(
		new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals ?? 0,
			maximumFractionDigits: decimals ?? 1
		})
	);

	let statistics = $derived.by(() => {
		if (points.length === 0) return null;
		const total = points.reduce((sum, value) => sum + value, 0);
		return {
			min: Math.min(...points),
			average: total / points.length,
			max: Math.max(...points)
		};
	});
</script>

<section aria-label={label} class="rounded-xl border border-cyan-200/10 bg-[#081322] p-4">
	<div class="flex items-center justify-between gap-3">
		<h2 class="text-xs font-medium text-slate-200">{label}</h2>
		{#if statistics}
			<span class="text-xs text-slate-500">{points.length} samples</span>
		{/if}
	</div>

	{#if statistics}
		<dl class="mt-4 grid grid-cols-3 divide-x divide-cyan-200/10 text-center">
			<div>
				<dt class="text-xs text-slate-500">Minimum</dt>
				<dd class="mt-2 text-xl font-light text-sky-200 tabular-nums">
					{formatter.format(statistics.min)}
					{#if unit}<span class="text-xs font-normal text-slate-500">{unit}</span>{/if}
				</dd>
			</div>
			<div>
				<dt class="text-xs text-slate-500">Average</dt>
				<dd class="mt-2 text-xl font-light text-slate-100 tabular-nums">
					{formatter.format(statistics.average)}
					{#if unit}<span class="text-xs font-normal text-slate-500">{unit}</span>{/if}
				</dd>
			</div>
			<div>
				<dt class="text-xs text-slate-500">Maximum</dt>
				<dd class="mt-2 text-xl font-light text-amber-200 tabular-nums">
					{formatter.format(statistics.max)}
					{#if unit}<span class="text-xs font-normal text-slate-500">{unit}</span>{/if}
				</dd>
			</div>
		</dl>
	{:else}
		<dl class="mt-4 grid grid-cols-3 divide-x divide-cyan-200/10 text-center">
			{#each ['Minimum', 'Average', 'Maximum'] as item (item)}
				<div>
					<dt class="text-xs text-slate-500">{item}</dt>
					<dd class="mt-2 text-xl font-light text-slate-300">—</dd>
				</div>
			{/each}
		</dl>
		<p class="mt-3 text-center text-xs text-slate-600">No readings recorded yet.</p>
	{/if}
</section>

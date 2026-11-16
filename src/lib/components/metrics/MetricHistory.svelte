<script lang="ts">
	import type { MetricReading } from '#lib/interfaces/health-area.js';

	interface Props {
		readings: readonly MetricReading[];
		unit?: string;
		decimals?: number;
		title?: string;
	}

	let { readings, unit = '', decimals, title = 'Reading history' }: Props = $props();

	const formatter = $derived(
		new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals ?? 0,
			maximumFractionDigits: decimals ?? 1
		})
	);
	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	function display(reading: MetricReading): string {
		const value =
			reading.secondary === null
				? formatter.format(reading.value)
				: `${formatter.format(reading.value)}/${formatter.format(reading.secondary)}`;
		return unit ? `${value} ${unit}` : value;
	}

	function sourceLabel(source: string): string {
		if (source === 'sensor') return 'Sensor';
		if (source === 'simulated') return 'Simulated';
		return 'Manual';
	}
</script>

<section
	aria-labelledby="metric-history-title"
	class="rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 id="metric-history-title" class="font-semibold text-white">{title}</h2>
		<span class="text-xs text-slate-400">{readings.length} readings</span>
	</div>

	{#if readings.length}
		<ul class="mt-4 max-h-72 divide-y divide-white/10 overflow-y-auto">
			{#each readings as reading (reading.measured_at + reading.value + (reading.detail ?? ''))}
				<li class="flex items-center justify-between gap-3 py-3">
					<div class="min-w-0">
						<p class="text-sm font-semibold text-slate-100 tabular-nums">{display(reading)}</p>
						<p class="mt-1 text-xs text-slate-400">
							{dateFormatter.format(new Date(reading.measured_at))} · {sourceLabel(reading.source)}
							{#if reading.detail}
								· {reading.detail}
							{/if}
						</p>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-4 text-sm text-slate-400">
			No readings yet. Add the first one to start the history.
		</p>
	{/if}
</section>

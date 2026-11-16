<script lang="ts">
	import MetricDetail from '#lib/components/metrics/MetricDetail.svelte';
	import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let basePath = $derived('/crew/' + data.astronaut.id);

	const entry: MetricEntryConfig = {
		title: 'Interval dose',
		fields: [
			{
				name: 'value',
				label: 'Interval dose',
				unit: 'mSv',
				min: 0,
				max: 1000,
				step: '0.001',
				integer: false
			}
		]
	};

	let statusLabel: string | null = $derived.by(() => {
		switch (data.assessment?.status) {
			case 'green':
				return 'Within limit';
			case 'yellow':
				return 'Approaching limit';
			case 'red':
				return 'Limit exceeded';
			case 'stale':
				return 'Needs a fresh reading';
			default:
				return null;
		}
	});

	let careerTotal = $derived(data.assessment?.measured ?? null);
	let careerDisplay = $derived(careerTotal === null ? null : `${careerTotal.toFixed(2)} mSv`);
	let careerLimit = $derived(data.assessment?.applied_limit ?? 600);
	let careerPercent = $derived(
		careerTotal === null || careerLimit <= 0
			? 0
			: Math.min(100, Math.max(0, (careerTotal / careerLimit) * 100))
	);
	let careerBarClass = $derived(
		data.assessment?.status === 'red'
			? 'bg-rose-400'
			: data.assessment?.status === 'yellow' || data.assessment?.status === 'stale'
				? 'bg-amber-400'
				: 'bg-teal-400'
	);

	let statusTone: 'green' | 'yellow' | 'red' | null = $derived(
		data.assessment?.status === 'green'
			? 'green'
			: data.assessment?.status === 'red'
				? 'red'
				: data.assessment &&
					  (data.assessment.status === 'yellow' || data.assessment.status === 'stale')
					? 'yellow'
					: null
	);
</script>

{#if careerDisplay}
	<section
		aria-label="Career cumulative dose"
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
	>
		<p class="text-xs font-medium tracking-wide text-slate-400 uppercase">Cumulative career dose</p>
		<p class="mt-2 text-3xl font-light tracking-tight text-cyan-100 tabular-nums">
			{careerDisplay}
		</p>
		<div class="mt-3" aria-hidden="true">
			<div class="h-2 w-full overflow-hidden rounded-full bg-white/8">
				<div class="h-full rounded-full {careerBarClass}" style:width="{careerPercent}%"></div>
			</div>
		</div>
		<p class="mt-2 text-xs text-slate-400">
			{careerPercent.toFixed(1)}% of the {careerLimit} mSv career limit, from
			{data.assessment?.reading_count ?? 0} interval and event readings.
		</p>
	</section>
{/if}

<MetricDetail
	areaId="radiation"
	areaLabel="Radiation"
	label="Interval dose"
	unit="mSv"
	{basePath}
	readings={data.readings}
	decimals={3}
	{entry}
	{statusLabel}
	{statusTone}
	referenceLabel="Career limit 600 mSv"
	referenceMin={0}
	referenceMax={600}
/>

<section
	aria-labelledby="career-notes-title"
	class="mt-5 rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
>
	<h2 id="career-notes-title" class="text-sm font-semibold text-white">
		How this total is evaluated
	</h2>
	{#if data.assessment}
		<p class="mt-2 text-sm leading-relaxed text-slate-400">
			{data.assessment.guideline.description}
		</p>
		<p class="mt-2 text-sm leading-relaxed text-slate-400">{data.assessment.protocol}</p>
	{:else}
		<p class="mt-2 text-sm leading-relaxed text-slate-400">
			Log an interval dose to evaluate the career limit.
		</p>
	{/if}
	<p class="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
		This page logs the interval doses that feed the career total. Each dose recorded here is added
		to the lifetime effective dose above.
	</p>
</section>

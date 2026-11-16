<script lang="ts">
	import { resolve } from '$app/paths';
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

	let appliedLimit = $derived(data.assessment?.applied_limit ?? 1.3);
	let environmentSet = $derived(data.summary?.environment_set ?? false);
	let environmentLabel = $derived(
		!environmentSet
			? 'habitat not set'
			: data.summary?.environment === 'planetary_surface'
				? 'planetary surface'
				: 'free space'
	);
	let referenceLabel = $derived(`Limit ${appliedLimit} mSv/day (${environmentLabel})`);
	let assessedRate = $derived(data.assessment?.measured ?? null);
	let rateDisplay = $derived(assessedRate === null ? null : `${assessedRate.toFixed(2)} mSv/day`);
	let ratePercent = $derived(
		assessedRate === null || appliedLimit <= 0
			? 0
			: Math.min(100, Math.max(0, (assessedRate / appliedLimit) * 100))
	);
	let rateBarClass = $derived(
		data.assessment?.status === 'red'
			? 'bg-rose-400'
			: data.assessment?.status === 'yellow' || data.assessment?.status === 'stale'
				? 'bg-amber-400'
				: 'bg-teal-400'
	);
	let habitatHref = $derived(
		resolve('/(crew)/crew/[id]/measurements/radiation', { id: String(data.astronaut.id) })
	);

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

{#if !environmentSet}
	<div
		role="status"
		class="mb-5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
	>
		<p>
			Set the habitat on the Radiation page before this rate can be evaluated.
			<a
				href={habitatHref}
				class="ml-1 font-semibold underline underline-offset-2 transition hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-cyan-300"
			>
				Open the Radiation page
			</a>
		</p>
	</div>
{/if}

{#if rateDisplay}
	<section
		aria-label="Derived daily rate"
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
	>
		<p class="text-xs font-medium tracking-wide text-slate-400 uppercase">Derived daily rate</p>
		<p class="mt-2 text-3xl font-light tracking-tight text-cyan-100 tabular-nums">
			{rateDisplay}
		</p>
		<div class="mt-3" aria-hidden="true">
			<div class="h-2 w-full overflow-hidden rounded-full bg-white/8">
				<div class="h-full rounded-full {rateBarClass}" style:width="{ratePercent}%"></div>
			</div>
		</div>
		<p class="mt-2 text-xs text-slate-400">
			{ratePercent.toFixed(1)}% of the {appliedLimit} mSv/day limit for the
			{environmentLabel}.
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
	{referenceLabel}
	referenceMin={0}
	referenceMax={appliedLimit}
/>

<section
	aria-labelledby="gcr-notes-title"
	class="mt-5 rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
>
	<h2 id="gcr-notes-title" class="text-sm font-semibold text-white">How this rate is evaluated</h2>
	{#if data.assessment}
		<p class="mt-2 text-sm leading-relaxed text-slate-400">
			{data.assessment.guideline.description}
		</p>
		<p class="mt-2 text-sm leading-relaxed text-slate-400">{data.assessment.protocol}</p>
	{:else}
		<p class="mt-2 text-sm leading-relaxed text-slate-400">
			Log an interval dose to evaluate the daily GCR rate.
		</p>
	{/if}
	<p class="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
		The daily rate is the interval doses of the last week divided by the days that have a logged
		dose. This page shares the interval doses that feed the career total.
	</p>
</section>

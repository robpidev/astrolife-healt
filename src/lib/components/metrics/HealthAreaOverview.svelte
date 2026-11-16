<script lang="ts">
	import { resolve } from '$app/paths';
	import { healthAreas } from '#lib/data/healthAreas.js';
	import type { HealthAreaId, MetricSnapshot } from '#lib/interfaces/health-area.js';
	import type { MentalSurveySummary } from '#lib/interfaces/mental-survey.js';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import SurveySummary from '#lib/components/metrics/SurveySummary.svelte';
	import { sharedTransition } from '#lib/services/view-transition.svelte.js';
	import { areaIconName, areaTitleName } from '#lib/utils/shared-transition.js';

	interface Props {
		areaId: HealthAreaId;
		basePath: string;
		snapshots?: readonly MetricSnapshot[];
		toneByMetric?: Readonly<Record<string, 'green' | 'yellow' | 'red' | null>>;
		surveySummary?: MentalSurveySummary | null;
	}

	let {
		areaId,
		basePath,
		snapshots = [],
		toneByMetric = {},
		surveySummary = null
	}: Props = $props();
	let area = $derived(healthAreas.find((item) => item.id === areaId)!);
	let shared = $derived(sharedTransition.areaId === areaId);
	let snapshotByMetric = $derived(
		new Map(snapshots.map((snapshot) => [snapshot.metric_id, snapshot]))
	);

	let recordedAt = $derived.by(() => {
		const dates = snapshots
			.map((snapshot) => snapshot.recorded_at)
			.filter((recordedAt): recordedAt is string => recordedAt !== null);
		if (dates.length === 0) return null;
		return dates.reduce((latest, current) => (current > latest ? current : latest));
	});

	let gridClass = $derived(
		area.metrics.length > 3
			? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
			: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
	);
	let recordedMetrics = $derived(
		area.metrics
			.map((metric) => ({ metric, snapshot: snapshotByMetric.get(metric.id) }))
			.filter((item) => item.snapshot?.latest != null)
	);
</script>

<div class="space-y-5">
	<header class="flex flex-wrap items-center gap-3 border-b border-cyan-200/10 pb-4">
		<span
			class="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200"
			style:view-transition-name={shared ? areaIconName(areaId) : null}
		>
			<HealthIcon name={area.id} />
		</span>
		<div class="min-w-0 flex-1">
			<p class="mb-1 text-xs tracking-[0.18em] text-slate-500 uppercase">Health area</p>
			<h2
				class="text-xl font-semibold tracking-tight break-words text-white sm:text-2xl"
				style:view-transition-name={shared ? areaTitleName(areaId) : null}
			>
				{area.label}
			</h2>
		</div>
		<div class="flex basis-full flex-wrap items-center gap-3 sm:ml-auto sm:shrink-0 sm:basis-auto">
			<span class="text-xs text-slate-500">
				{recordedAt ? `Last update ${recordedAt.slice(0, 10)}` : 'No measurements'}
			</span>
		</div>
	</header>
	<div class={gridClass}>
		{#each area.metrics as metric (metric.id)}
			{@const snapshot = snapshotByMetric.get(metric.id)}
			<MetricCard
				title={metric.label}
				value={snapshot?.display ?? null}
				unit={metric.unit}
				points={snapshot?.points ?? []}
				showEmpty={recordedAt !== null}
				href={basePath + '/measurements/' + area.id + '/' + metric.id}
				tone={toneByMetric[metric.id] ?? null}
			/>
		{/each}
	</div>
	{#if areaId === 'mental'}
		<SurveySummary summary={surveySummary} />
	{/if}
	<section class="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.03] p-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h3 class="text-xs font-medium text-cyan-100">Recorded indicators</h3>
			<span class="text-xs text-slate-500">
				{recordedMetrics.length} of {area.metrics.length}
			</span>
		</div>
		{#if recordedMetrics.length}
			<p class="mt-2 text-sm leading-relaxed text-slate-400">
				Latest data from {recordedAt ? recordedAt.slice(0, 10) : 'an unknown date'}. Open an
				indicator to review its trend and history.
			</p>
			<ul class="mt-3 flex flex-wrap gap-2">
				{#each recordedMetrics as item (item.metric.id)}
					<li
						class="rounded-lg border border-cyan-200/15 bg-[#0b1b2e] px-2.5 py-1.5 text-xs text-slate-300"
					>
						<span class="text-slate-400">{item.metric.label}:</span>
						<span class="ml-1 font-medium text-cyan-100 tabular-nums">
							{item.snapshot?.display}{item.metric.unit ? ` ${item.metric.unit}` : ''}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm leading-relaxed text-slate-400">
				No readings recorded in this area yet. Open an indicator to add the first one.
			</p>
		{/if}
		<a
			href={resolve(`${basePath}/risks`.slice(1) as `crew/${string}`)}
			class="mt-4 inline-flex min-h-10 items-center rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
		>
			Review threats →
		</a>
	</section>
</div>

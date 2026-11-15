<script lang="ts">
	import { healthAreas } from '#lib/data/healthAreas.js';
	import type { HealthAreaId, MetricSnapshot } from '#lib/interfaces/health-area.js';
	import type { MentalSurveySummary } from '#lib/interfaces/mental-survey.js';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricStatistics from '#lib/components/metrics/MetricStatistics.svelte';
	import SurveySummary from '#lib/components/metrics/SurveySummary.svelte';

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
</script>

<div class="space-y-5">
	<header class="flex flex-wrap items-center gap-3 border-b border-cyan-200/10 pb-4">
		<span class="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200">
			<HealthIcon name={area.id} />
		</span>
		<div class="min-w-0 flex-1">
			<p class="mb-1 text-xs tracking-[0.18em] text-slate-500 uppercase">Health area</p>
			<h2 class="text-xl font-semibold tracking-tight break-words text-white sm:text-2xl">
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
	<div class="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_180px]">
		<MetricChart />
		<MetricStatistics />
	</div>
	<section class="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.03] p-4">
		<h3 class="text-xs font-medium text-cyan-100">Interpretation</h3>
		<p class="mt-2 text-sm leading-relaxed text-slate-400">
			There is not enough data yet to show an interpretation of this area. Record measurements to
			start tracking.
		</p>
	</section>
</div>

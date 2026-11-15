<script lang="ts">
	import { healthAreas } from '#lib/data/healthAreas.js';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricStatistics from '#lib/components/metrics/MetricStatistics.svelte';

	let { areaId, basePath }: { areaId: string; basePath: string } = $props();
	let area = $derived(healthAreas.find((item) => item.id === areaId)!);
</script>

<div class="space-y-5">
	<header class="flex flex-wrap items-center gap-3 border-b border-cyan-200/10 pb-4">
		<span class="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200">
			<HealthIcon name={area.id} />
		</span>
		<div class="min-w-0 flex-1">
			<p class="mb-1 text-xs tracking-[0.18em] text-slate-500 uppercase">
				Área de salud
			</p>
			<h2 class="break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
				{area.label}
			</h2>
		</div>
		<span class="basis-full text-xs text-slate-500 sm:ml-auto sm:basis-auto sm:shrink-0">
			Sin mediciones
		</span>
	</header>
	<div class="grid gap-3 sm:grid-cols-3">
		{#each area.metrics as metric (metric.id)}
			<MetricCard
				title={metric.label}
				unit={metric.unit}
				href={basePath + '/measurements/' + area.id + '/' + metric.id}
			/>
		{/each}
	</div>
	<div class="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_180px]">
		<MetricChart />
		<MetricStatistics />
	</div>
	<section class="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.03] p-4">
		<h3 class="text-xs font-medium text-cyan-100">
			Interpretación
		</h3>
		<p class="mt-2 text-sm leading-relaxed text-slate-400">
			Aún no hay datos suficientes para mostrar una interpretación del área. Registra mediciones para comenzar el seguimiento.
		</p>
	</section>
</div>

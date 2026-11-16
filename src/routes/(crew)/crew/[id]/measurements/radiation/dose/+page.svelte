<script lang="ts">
	import MetricDetail from '#lib/components/metrics/MetricDetail.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
</script>

<section class="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.03] p-4">
	<p class="text-xs font-medium tracking-wide text-cyan-100">Daily or interval dose</p>
	<p class="mt-2 text-sm leading-relaxed text-slate-400">
		Log the effective dose of one interval here. This is not the lifetime total: the career
		effective dose and the daily GCR rate are both derived from these readings.
	</p>
</section>

<MetricDetail
	areaId="radiation"
	areaLabel="Radiation"
	label="Radiation dose"
	unit="mSv"
	{basePath}
	readings={data.readings}
	entry={data.entry}
	decimals={3}
	referenceLabel="Daily GCR limit in free space: 1.3 mSv/day"
	referenceMin={0}
	referenceMax={1.3}
/>

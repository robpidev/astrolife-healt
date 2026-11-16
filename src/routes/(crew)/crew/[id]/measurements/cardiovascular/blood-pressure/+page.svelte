<script lang="ts">
	import MetricDetail from '#lib/components/metrics/MetricDetail.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
</script>

<MetricDetail
	areaId="cardiovascular"
	areaLabel="Cardiovascular"
	label="Blood pressure"
	unit="mmHg"
	{basePath}
	readings={data.readings}
	entry={data.entry}
	indicator="blood-pressure"
/>

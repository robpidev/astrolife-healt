<script lang="ts">
	import MetricDetailPage from '#lib/components/metrics/MetricDetailPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<MetricDetailPage
	areaId="cardiovascular"
	metricId="respiratory-rate"
	basePath={'/crew/' + data.astronaut.id}
	readings={data.readings}
	entry={data.entry}
	indicator="respiratory-rate"
/>

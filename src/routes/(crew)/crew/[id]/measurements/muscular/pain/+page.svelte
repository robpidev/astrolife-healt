<script lang="ts">
	import MetricDetailPage from '#lib/components/metrics/MetricDetailPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<MetricDetailPage
	areaId="muscular"
	metricId="pain"
	basePath={'/crew/' + data.astronaut.id}
	readings={data.readings}
	entry={data.entry}
/>

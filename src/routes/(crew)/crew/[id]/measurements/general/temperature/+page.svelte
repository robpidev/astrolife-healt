<script lang="ts">
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricStatistics from '#lib/components/metrics/MetricStatistics.svelte';
	import MetricForm from '#lib/components/metrics/MetricForm.svelte';
</script>

<svelte:head>
	<title>Body temperature · Astrolife</title>
</svelte:head>
<div class="space-y-5">
	<MetricCard title="Body temperature" unit="°C" />
	<MetricChart />
	<MetricStatistics />
	<MetricForm label="Body temperature" unit="°C" />
</div>

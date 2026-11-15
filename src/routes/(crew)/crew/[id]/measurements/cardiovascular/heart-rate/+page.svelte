<script lang="ts">
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricStatistics from '#lib/components/metrics/MetricStatistics.svelte';
	import CardiovascularForm from '#lib/components/metrics/CardiovascularForm.svelte';
	import type { CardiovascularActionData } from '#lib/server/cardiovascular-validation.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let actionForm = $derived(form as CardiovascularActionData | null);
</script>

<svelte:head>
	<title>Heart rate · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<MetricCard
		title="Heart rate"
		unit="bpm"
		value={data.snapshot?.display ?? null}
		points={data.snapshot?.points ?? []}
		showEmpty={true}
	/>
	<CardiovascularForm
		metricId="heart_rate"
		fields={[
			{ name: 'heart_rate', label: 'Heart rate', unit: 'bpm', min: 20, max: 250, step: '1' }
		]}
		form={actionForm}
	/>
	<MetricChart />
	<MetricStatistics />
</div>

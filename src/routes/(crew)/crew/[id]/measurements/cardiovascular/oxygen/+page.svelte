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
	<title>Oxygen · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<MetricCard
		title="Oxygen"
		unit="%"
		value={data.snapshot?.display ?? null}
		points={data.snapshot?.points ?? []}
		showEmpty={true}
	/>
	<CardiovascularForm
		metricId="spo2"
		fields={[
			{ name: 'spo2', label: 'Oxygen saturation', unit: '%', min: 0, max: 100, step: 'any' }
		]}
		form={actionForm}
	/>
	<MetricChart />
	<MetricStatistics />
</div>

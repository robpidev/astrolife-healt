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
	<title>Blood pressure · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<MetricCard
		title="Blood pressure"
		unit="mmHg"
		value={data.snapshot?.display ?? null}
		points={data.snapshot?.points ?? []}
		showEmpty={true}
	/>
	<CardiovascularForm
		metricId="blood_pressure"
		fields={[
			{ name: 'systolic', label: 'Systolic', unit: 'mmHg', min: 40, max: 300, step: '1' },
			{ name: 'diastolic', label: 'Diastolic', unit: 'mmHg', min: 20, max: 200, step: '1' }
		]}
		form={actionForm}
	/>
	<MetricChart />
	<MetricStatistics />
</div>

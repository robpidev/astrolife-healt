<script lang="ts">
	import { resolve } from '$app/paths';
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricStatistics from '#lib/components/metrics/MetricStatistics.svelte';
	import MetricForm from '#lib/components/metrics/MetricForm.svelte';
	import { metricTone } from '#lib/utils/mental-survey.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let tone = $derived(
		data.snapshot?.latest == null ? null : metricTone('fatigue', data.snapshot.latest)
	);

	let surveyHref = $derived(
		resolve('/(crew)/crew/[id]/measurements/mental/survey/[topic]/[step]', {
			id: String(data.astronaut.id),
			topic: 'fatigue',
			step: '1'
		})
	);

	let surveyMessage = $derived(
		data.progress.answered === 0
			? `Answer ${data.progress.total} short questions to record this sub-item from the SMIA survey.`
			: data.progress.answered < data.progress.total
				? `${data.progress.answered} of ${data.progress.total} questions have a saved answer. Answer the flow to finish this sub-item.`
				: `All ${data.progress.total} questions have a saved answer. Answer the flow to record a new reading.`
	);
</script>

<svelte:head>
	<title>Fatigue · Astrolife</title>
</svelte:head>
<div class="space-y-5">
	{#if data.saved}
		<div
			class="rounded-xl border border-teal-300/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-200"
		>
			Survey saved. Your answers have been recorded.
		</div>
	{/if}
	<MetricCard
		title="Fatigue"
		unit=""
		value={data.snapshot?.display ?? null}
		points={data.snapshot?.points ?? []}
		showEmpty={true}
		{tone}
	/>
	<section class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
		<h2 class="text-base font-semibold text-white">Survey</h2>
		<p class="mt-2 text-sm leading-relaxed text-slate-400">{surveyMessage}</p>
		<a
			href={surveyHref}
			class="mt-4 inline-flex rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
		>
			Answer the survey
		</a>
	</section>
	<MetricChart />
	<MetricStatistics />
	<MetricForm label="Fatigue" unit="" />
</div>

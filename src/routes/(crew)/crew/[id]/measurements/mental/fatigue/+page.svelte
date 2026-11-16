<script lang="ts">
	import { resolve } from '$app/paths';
	import MetricDetail from '#lib/components/metrics/MetricDetail.svelte';
	import { metricTone } from '#lib/utils/mental-survey.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let tone = $derived(
		data.snapshot?.latest == null ? null : metricTone('fatigue', data.snapshot.latest)
	);
	let statusLabel = $derived(
		tone === 'green' ? 'Good' : tone === 'yellow' ? 'Follow up' : tone === 'red' ? 'Alert' : null
	);
	let basePath = $derived('/crew/' + data.astronaut.id);

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

{#if data.saved}
	<div class="rounded-xl border border-teal-300/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-200">
		Survey saved. Your answers have been recorded.
	</div>
{/if}

<MetricDetail
	areaId="mental"
	areaLabel="Mental health"
	label="Fatigue"
	unit=""
	{basePath}
	readings={data.readings}
	{statusLabel}
	statusTone={tone}
	{surveyHref}
	{surveyMessage}
/>

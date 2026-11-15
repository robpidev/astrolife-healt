<script lang="ts">
	import HealthAreaOverview from '#lib/components/metrics/HealthAreaOverview.svelte';
	import { metricTone } from '#lib/utils/mental-survey.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);

	// The card colour must match the detail page, so both read the measurement
	// value through `metricTone` instead of the survey block results.
	let tones = $derived.by(() => {
		const toneFor = (metricId: string) => {
			const snapshot = data.snapshots.find((item) => item.metric_id === metricId);
			return snapshot?.latest == null ? null : metricTone(metricId, snapshot.latest);
		};

		return {
			stress: toneFor('stress'),
			mood: toneFor('mood'),
			concentration: toneFor('concentration'),
			duration: toneFor('duration'),
			fatigue: toneFor('fatigue')
		};
	});
</script>

<HealthAreaOverview
	areaId="mental"
	{basePath}
	snapshots={data.snapshots}
	surveySummary={data.summary}
	toneByMetric={tones}
/>

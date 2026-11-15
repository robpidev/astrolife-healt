<script lang="ts">
	import { healthAreas } from '#lib/data/healthAreas.js';
	import MeasurementTabs from '#lib/components/navigation/MeasurementTabs.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const area = healthAreas.find((area) => area.id === 'cardiovascular')!;
	let basePath = $derived('/crew/' + data.astronaut.id + '/measurements/cardiovascular');
</script>

<div>
	<MeasurementTabs {basePath} tabs={area.metrics} />
	{@render children()}
</div>

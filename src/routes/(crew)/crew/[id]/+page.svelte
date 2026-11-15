<script lang="ts">
	import HealthAreaOverview from '#lib/components/metrics/HealthAreaOverview.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
</script>

<svelte:head>
	<title>Astronaut profile · Astrolife Health</title>
</svelte:head>
<HealthAreaOverview areaId="cardiovascular" {basePath} />

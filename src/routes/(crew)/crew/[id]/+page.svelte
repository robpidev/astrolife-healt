<script lang="ts">
	import HealthSummaryHud from '#lib/components/health/HealthSummaryHud.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
</script>

<svelte:head>
	<title>Astronaut profile · Astrolife Health</title>
</svelte:head>

<h1 class="sr-only">Astronaut health summary</h1>
<HealthSummaryHud status={data.status} vitals={data.vitals} alerts={data.alerts} {basePath} />

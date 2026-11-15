<script lang="ts">
	import HealthAreaOverview from '#lib/components/metrics/HealthAreaOverview.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let basePath = $derived('/crew/' + data.astronaut.id);
</script>

<HealthAreaOverview areaId="general" {basePath} />

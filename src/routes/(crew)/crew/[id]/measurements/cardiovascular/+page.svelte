<script lang="ts">
	import CardiovascularPanel from './CardiovascularPanel.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<CardiovascularPanel readings={data.cardiovascular} />

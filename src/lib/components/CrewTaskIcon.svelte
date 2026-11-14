<script lang="ts">
	import type { CrewTaskKind } from '#lib/interfaces/astronaut.js';

	interface Props {
		kind: CrewTaskKind;
	}

	let { kind }: Props = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="size-4"
	aria-hidden="true"
>
	{#if kind === 'salud'}
		<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
	{:else if kind === 'entrenamiento'}
		<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
	{:else if kind === 'mision'}
		<path
			d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0Z"
		/>
		<path
			d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"
		/>
		<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
		<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
	{:else}
		<path
			d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z"
		/>
		<path d="M12 22V12" />
		<path d="m3.3 7 8.7 5 8.7-5" />
	{/if}
</svg>

<script lang="ts">
	import { buildSparklineAreaPath, buildSparklinePath } from '#lib/utils/sparkline.js';

	interface Props {
		points?: readonly number[];
	}

	let { points = [] }: Props = $props();

	const uid = $props.id();
	const gradientId = 'sparkline-' + uid;
	let line = $derived(buildSparklinePath(points, 100, 32, 3));
	let area = $derived(buildSparklineAreaPath(points, 100, 32, 3));
	let hasData = $derived(points.length > 0);
</script>

<div class="relative h-10 w-full">
	<svg
		viewBox="0 0 100 32"
		class="h-full w-full"
		preserveAspectRatio="none"
		aria-hidden="true"
		focusable="false"
	>
		{#if hasData}
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#67e8f9" stop-opacity="0.28" />
					<stop offset="100%" stop-color="#67e8f9" stop-opacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill="url(#{gradientId})" />
			<path
				d={line}
				fill="none"
				stroke="#67e8f9"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				vector-effect="non-scaling-stroke"
			/>
		{:else}
			<path
				d="M3 16H97"
				fill="none"
				stroke="#475569"
				stroke-width="1"
				stroke-dasharray="3 4"
				vector-effect="non-scaling-stroke"
			/>
		{/if}
	</svg>
</div>

<script lang="ts">
	import { buildSparklineAreaPath, buildSparklinePath } from '#lib/utils/sparkline.js';

	interface Props {
		points?: readonly number[];
		tone?: 'green' | 'yellow' | 'red' | null;
	}

	let { points = [], tone = null }: Props = $props();

	// SVG attributes cannot use Tailwind classes, so the tones stay as whole hex strings.
	const toneColors: Record<'green' | 'yellow' | 'red' | 'default', string> = {
		green: '#2dd4bf',
		yellow: '#fbbf24',
		red: '#fb7185',
		default: '#67e8f9'
	};

	let strokeColor = $derived(tone ? toneColors[tone] : toneColors.default);

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
					<stop offset="0%" stop-color={strokeColor} stop-opacity="0.28" />
					<stop offset="100%" stop-color={strokeColor} stop-opacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill="url(#{gradientId})" />
			<path
				d={line}
				fill="none"
				stroke={strokeColor}
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

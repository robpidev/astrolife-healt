<script lang="ts">
	interface Props {
		points: readonly number[];
		unit?: string;
		label?: string;
		decimals?: number;
		tone?: 'green' | 'yellow' | 'red' | null;
	}

	let { points, unit = '', label = 'Measurement trend', decimals, tone = null }: Props = $props();

	// SVG attributes cannot use Tailwind classes, so the tones stay as whole hex strings.
	const toneColors: Record<'green' | 'yellow' | 'red' | 'default', string> = {
		green: '#2dd4bf',
		yellow: '#fbbf24',
		red: '#fb7185',
		default: '#67e8f9'
	};

	let strokeColor = $derived(tone ? toneColors[tone] : toneColors.default);

	const formatter = $derived(
		new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals ?? 0,
			maximumFractionDigits: decimals ?? 1
		})
	);

	let chart = $derived.by(() => {
		if (points.length === 0) return null;

		const low = Math.min(...points);
		const high = Math.max(...points);
		const span = high - low || 1;
		const top = 18;
		const bottom = 122;
		const left = 24;
		const right = 404;

		const coords = points.map((value, index) => ({
			value,
			x:
				left +
				(points.length === 1 ? (right - left) / 2 : (index / (points.length - 1)) * (right - left)),
			y: bottom - ((value - low) / span) * (bottom - top)
		}));

		return {
			coords,
			line: coords.map((point) => `${point.x},${point.y}`).join(' '),
			low,
			high
		};
	});
</script>

<section class="rounded-xl border border-cyan-200/10 bg-[#081322] p-4" aria-label={label}>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-xs font-medium text-slate-200">{label}</h2>
		<span class="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-500">
			{points.length}
			{points.length === 1 ? 'reading' : 'readings'}
		</span>
	</div>

	{#if chart}
		<svg
			viewBox="0 0 420 150"
			class="mt-4 h-36 w-full"
			preserveAspectRatio="none"
			role="img"
			aria-label={`${label}: ${points.length} readings, from ${formatter.format(chart.low)} to ${formatter.format(chart.high)} ${unit}`}
		>
			<path
				d="M24 18H404M24 70H404M24 122H404"
				fill="none"
				stroke="#334155"
				stroke-width="1"
				stroke-dasharray="4 5"
				vector-effect="non-scaling-stroke"
			/>
			{#if chart.coords.length > 1}
				<polyline
					points={chart.line}
					fill="none"
					stroke={strokeColor}
					stroke-width="2.5"
					stroke-linejoin="round"
					stroke-linecap="round"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
			{#each chart.coords as point, index (index)}
				<line
					x1={point.x}
					y1={point.y}
					x2={point.x}
					y2={point.y}
					stroke="#0b1729"
					stroke-width="12"
					stroke-linecap="round"
					vector-effect="non-scaling-stroke"
				/>
				<line
					x1={point.x}
					y1={point.y}
					x2={point.x}
					y2={point.y}
					stroke={strokeColor}
					stroke-width="8"
					stroke-linecap="round"
					vector-effect="non-scaling-stroke"
				>
					<title>{formatter.format(point.value)} {unit}</title>
				</line>
			{/each}
		</svg>
		<div class="flex justify-between text-xs text-slate-500">
			<span>Oldest</span>
			<span>Newest</span>
		</div>
	{:else}
		<div
			class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400"
		>
			The trend will appear after the first reading.
		</div>
	{/if}
</section>

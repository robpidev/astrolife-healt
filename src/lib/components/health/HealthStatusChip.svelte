<script lang="ts">
	import { resolve } from '$app/paths';
	import type { AlertSummary } from '#lib/interfaces/health.js';

	interface Props {
		summary: AlertSummary;
		href: string;
	}

	let { summary, href }: Props = $props();
	let target = $derived(resolve(href.slice(1) as `crew/${string}`));

	function warningLabel(current: AlertSummary): string {
		const parts: string[] = [];
		if (current.red > 0) parts.push(`${current.red} critical`);
		if (current.yellow > 0)
			parts.push(`${current.yellow} caution${current.yellow === 1 ? '' : 's'}`);
		return parts.length > 0 ? `Warnings: ${parts.join(', ')}` : 'No active warnings';
	}

	// Whole class strings stay literal so Tailwind keeps every tone in the build.
	let chip = $derived.by(() => {
		switch (summary.overall) {
			case 'green':
				return {
					dot: '●',
					text: 'Ready',
					label: 'Health status ready: no active warnings',
					tone: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 focus-visible:outline-emerald-300'
				};
			case 'yellow':
				return {
					dot: '●',
					text: String(summary.total),
					label: warningLabel(summary),
					tone: 'border-amber-300/30 bg-amber-400/10 text-amber-200 hover:border-amber-300/50 focus-visible:outline-amber-300'
				};
			case 'red':
				return {
					dot: '●',
					text: String(summary.total),
					label: warningLabel(summary),
					tone: 'border-rose-300/30 bg-rose-400/10 text-rose-200 hover:border-rose-300/50 focus-visible:outline-rose-300'
				};
			default:
				return {
					dot: '○',
					text: 'No data',
					label: 'Health status unavailable: no readings recorded',
					tone: 'border-slate-400/20 bg-slate-400/10 text-slate-300 hover:border-cyan-300/40 focus-visible:outline-cyan-300'
				};
		}
	});
</script>

<a
	href={target}
	aria-label={chip.label}
	class="inline-flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 {chip.tone}"
>
	<span aria-hidden="true">{chip.dot}</span>
	{chip.text}
</a>

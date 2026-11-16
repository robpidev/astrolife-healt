<script lang="ts">
	import type { HealthSeverity } from '#lib/interfaces/health.js';

	interface Props {
		severity: HealthSeverity;
		label?: string;
		class?: string;
	}

	let { severity, label, class: className = '' }: Props = $props();

	// Whole class strings keep the Tailwind utilities in the production build.
	let toneClass = $derived.by(() => {
		switch (severity) {
			case 'green':
				return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200';
			case 'yellow':
				return 'border-amber-300/30 bg-amber-400/10 text-amber-200';
			case 'red':
				return 'border-rose-300/30 bg-rose-400/10 text-rose-200';
			default:
				return 'border-slate-300/20 bg-slate-400/10 text-slate-300';
		}
	});

	let defaultLabel = $derived.by(() => {
		switch (severity) {
			case 'green':
				return 'Ready';
			case 'yellow':
				return 'Caution';
			case 'red':
				return 'Critical';
			default:
				return 'No data';
		}
	});
</script>

<span
	class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase {toneClass} {className}"
>
	{label ?? defaultLabel}
</span>

<script lang="ts">
	import { radiationEnvironments } from '#lib/data/radiation.js';
	import type { RadiationStatus, RadiationSummary } from '#lib/interfaces/radiation.js';
	import { formatDose } from '#lib/utils/radiation.js';

	interface Props {
		summary: RadiationSummary;
		/** Set when the last habitat submission failed before the data reloaded. */
		saveFailed?: boolean;
	}

	let { summary, saveFailed = false }: Props = $props();

	// Whole strings stay literal so Tailwind keeps every tone in the build.
	const badges: Record<RadiationStatus, { label: string; class: string }> = {
		green: {
			label: 'Within limit',
			class: 'border-teal-300/30 bg-teal-400/10 text-teal-200'
		},
		yellow: {
			label: 'Approaching limit',
			class: 'border-amber-300/30 bg-amber-400/10 text-amber-200'
		},
		red: {
			label: 'Limit exceeded',
			class: 'border-rose-300/30 bg-rose-400/10 text-rose-200'
		},
		stale: {
			label: 'Stale',
			class: 'border-amber-300/40 text-amber-200'
		},
		unknown: {
			label: 'No data',
			class: 'border-white/15 bg-white/5 text-slate-400'
		}
	};

	const bars: Record<RadiationStatus, string> = {
		green: 'bg-teal-400',
		yellow: 'bg-amber-400',
		red: 'bg-rose-400',
		stale: 'bg-amber-400/60',
		unknown: 'bg-slate-500/40'
	};

	let overallBadge = $derived(badges[summary.overall]);
	// The summary always carries a default environment so the limits can be
	// evaluated; until one is chosen the panel must not imply a real habitat.
	let environmentLabel = $derived(
		summary.environment_set
			? (radiationEnvironments.find((item) => item.value === summary.environment)?.label ??
					'Unknown habitat')
			: 'Not set'
	);
	let empty = $derived(summary.assessments.every((assessment) => assessment.status === 'unknown'));

	let rows = $derived(
		summary.assessments.map((assessment) => ({
			assessment,
			badge: badges[assessment.status],
			bar: bars[assessment.status],
			percent:
				assessment.measured === null || assessment.applied_limit <= 0
					? 0
					: Math.min(100, Math.max(0, (assessment.measured / assessment.applied_limit) * 100)),
			limitDisplay: formatDose(assessment.applied_limit, assessment.guideline.unit),
			recordedAt: assessment.recorded_at?.slice(0, 10) ?? null
		}))
	);
</script>

<section aria-labelledby="radiation-status-title" class="space-y-4" data-tour="radiation-summary">
	<div class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Radiation</p>
				<h2 id="radiation-status-title" class="mt-1 text-lg font-semibold text-white">
					Limit status
				</h2>
			</div>
			<span
				class="inline-flex rounded-md border px-2 py-1 text-[11px] font-medium tracking-wide uppercase {overallBadge.class}"
			>
				{overallBadge.label}
			</span>
		</div>
		<p class="mt-3 text-sm text-slate-400">
			Habitat: <span class="font-medium text-slate-200">{environmentLabel}</span>
			{#if summary.profile.habitat_shielding}
				<span class="text-slate-500">· {summary.profile.habitat_shielding}</span>
			{/if}
			{#if summary.profile.spe_alert_active}
				<span class="text-rose-200">· SPE alert open</span>
			{/if}
		</p>
		{#if !summary.environment_set}
			<p class="mt-2 text-sm leading-relaxed text-amber-200">
				Set habitat below. GCR stays unassessed until a habitat is chosen.
			</p>
		{/if}
		{#if summary.last_reading_at}
			<p class="mt-2 text-xs text-slate-500">
				Last radiation reading {summary.last_reading_at.slice(0, 10)} · readings older than
				{summary.stale_after_days} days are marked stale
			</p>
		{/if}
	</div>

	{#if saveFailed}
		<p
			role="alert"
			class="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
		>
			The habitat could not be saved. Check the values and try again.
		</p>
	{/if}

	{#if empty}
		<p
			class="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400"
		>
			No radiation readings logged yet. Record an interval dose to start evaluating the limits.
		</p>
	{:else}
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each rows as row (row.assessment.guideline.id)}
				<li class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<h3 class="text-sm font-semibold text-slate-100">
							{row.assessment.guideline.label}
						</h3>
						<span
							class="inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase {row
								.badge.class}"
						>
							{row.badge.label}
						</span>
					</div>

					<p class="mt-3 text-xl font-light tracking-tight text-cyan-100 tabular-nums">
						{row.assessment.display ?? '—'}
						<span class="text-sm text-slate-500">/ {row.limitDisplay}</span>
					</p>
					{#if row.assessment.measured === null}
						<p class="mt-1 text-sm text-slate-400">No readings</p>
					{/if}

					<div class="mt-3" aria-hidden="true">
						<div class="relative h-2 w-full overflow-hidden rounded-full bg-white/8">
							<div
								class="absolute inset-y-0 rounded-full {row.bar}"
								style:left="0%"
								style:width="{row.percent}%"
							></div>
						</div>
					</div>
					<p class="mt-1 text-xs text-slate-500">{row.percent.toFixed(0)}% of the limit</p>

					<dl class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
						<div class="flex gap-1.5">
							<dt class="text-slate-500">Last reading</dt>
							<dd class="text-slate-300">{row.recordedAt ?? 'None'}</dd>
						</div>
						<div class="flex gap-1.5">
							<dt class="text-slate-500">Readings</dt>
							<dd class="text-slate-300">{row.assessment.reading_count}</dd>
						</div>
					</dl>

					<p class="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-slate-400">
						{row.assessment.protocol}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

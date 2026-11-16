<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricEntryDialog from '#lib/components/metrics/MetricEntryDialog.svelte';
	import MetricHistory from '#lib/components/metrics/MetricHistory.svelte';
	import MetricStatistics from '#lib/components/metrics/MetricStatistics.svelte';
	import type { HealthAreaId, MetricReading } from '#lib/interfaces/health-area.js';
	import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
	import { assessHealthIndicator, type HealthIndicatorId } from '#lib/utils/health-assessment.js';

	interface Props {
		areaId: HealthAreaId;
		areaLabel: string;
		label: string;
		unit: string;
		basePath: string;
		readings: readonly MetricReading[];
		decimals?: number;
		entry?: MetricEntryConfig | null;
		indicator?: HealthIndicatorId | null;
		surveyHref?: string | null;
		surveyMessage?: string | null;
		surveyLabel?: string;
		/** Explicit status badge for metrics without a clinical indicator. */
		statusLabel?: string | null;
		statusTone?: 'green' | 'yellow' | 'red' | null;
		/** Copy for the reference band shown next to the latest reading. */
		referenceLabel?: string | null;
		/** Lower bound of the normal band, in the display unit. */
		referenceMin?: number | null;
		/** Upper bound of the normal band, in the display unit. */
		referenceMax?: number | null;
		/** Custom inline form, used by metrics that need more than one field. */
		form?: Snippet;
		/** Rendered after the shared chart, e.g. clinical reference content. */
		children?: Snippet;
	}

	let {
		areaId,
		areaLabel,
		label,
		unit,
		basePath,
		readings,
		decimals,
		entry = null,
		indicator = null,
		surveyHref = null,
		surveyMessage = null,
		surveyLabel = 'Answer the survey',
		statusLabel = null,
		statusTone = null,
		referenceLabel = null,
		referenceMin = null,
		referenceMax = null,
		form,
		children
	}: Props = $props();

	let showEntry = $state(false);

	const formatter = $derived(
		new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals ?? 0,
			maximumFractionDigits: decimals ?? 1
		})
	);
	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	let latest = $derived(readings[0] ?? null);
	let points = $derived(readings.map((reading) => reading.value).reverse());
	let latestDisplay = $derived.by(() => {
		if (!latest) return null;
		const value =
			latest.secondary === null
				? formatter.format(latest.value)
				: `${formatter.format(latest.value)}/${formatter.format(latest.secondary)}`;
		return unit ? `${value} ${unit}` : value;
	});

	let assessment = $derived(
		indicator
			? assessHealthIndicator(
					indicator,
					latest?.value ?? null,
					latest?.value ?? null,
					latest?.secondary ?? null
				)
			: null
	);

	let badgeClass = $derived.by(() => {
		switch (assessment?.severity ?? statusTone) {
			case 'green':
				return 'border-teal-300/30 bg-teal-400/10 text-teal-200';
			case 'yellow':
				return 'border-amber-300/30 bg-amber-400/10 text-amber-200';
			case 'red':
				return 'border-rose-300/30 bg-rose-400/10 text-rose-200';
			default:
				return 'border-white/15 bg-white/5 text-slate-400';
		}
	});

	let badgeLabel = $derived(assessment?.label ?? statusLabel);
	// The chart only knows the three tones; an unknown severity keeps the default colour.
	let chartTone = $derived.by<'green' | 'yellow' | 'red' | null>(() => {
		const severity = assessment?.severity ?? statusTone;
		return severity === 'unknown' ? null : severity;
	});
	let measurementsHref = $derived(resolve(`${basePath}/measurements`.slice(1) as `crew/${string}`));
	let areaHref = $derived(
		resolve(`${basePath}/measurements/${areaId}`.slice(1) as `crew/${string}`)
	);
	let resolvedSurveyHref = $derived(
		surveyHref ? resolve(surveyHref.slice(1) as `crew/${string}`) : null
	);

	// The band sits on a padded scale so a reading at the edge is still visible.
	let band = $derived.by(() => {
		if (referenceMin === null || referenceMax === null) return null;
		if (referenceMax <= referenceMin) return null;
		const pad = (referenceMax - referenceMin) * 0.8;
		const low = Math.max(0, referenceMin - pad);
		const high = referenceMax + pad;
		const ratio = (value: number) => Math.min(1, Math.max(0, (value - low) / (high - low)));
		return {
			normalStart: ratio(referenceMin) * 100,
			normalWidth: (ratio(referenceMax) - ratio(referenceMin)) * 100,
			marker: latest ? ratio(latest.value) * 100 : null,
			inRange: latest ? latest.value >= referenceMin && latest.value <= referenceMax : null
		};
	});
</script>

<svelte:head>
	<title>{label} · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<nav aria-label="Breadcrumb" class="text-xs text-slate-500">
		<ol class="flex flex-wrap items-center gap-1.5">
			<li>
				<a
					href={measurementsHref}
					class="rounded transition-colors hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-300"
					>Measurements</a
				>
			</li>
			<li aria-hidden="true">/</li>
			<li>
				<a
					href={areaHref}
					class="rounded transition-colors hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-300"
					>{areaLabel}</a
				>
			</li>
			<li aria-hidden="true">/</li>
			<li aria-current="page" class="text-slate-300">{label}</li>
		</ol>
	</nav>

	<header class="flex flex-wrap items-start justify-between gap-4 border-b border-cyan-200/10 pb-4">
		<div class="min-w-0">
			<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">{areaLabel}</p>
			<h1 class="mt-1 text-2xl font-semibold tracking-tight break-words text-white sm:text-3xl">
				{label}
			</h1>
			{#if badgeLabel}
				<span
					class="mt-3 inline-flex rounded-md border px-2 py-1 text-[11px] font-medium tracking-wide uppercase {badgeClass}"
				>
					{badgeLabel}
				</span>
			{/if}
		</div>
		{#if entry}
			<button
				type="button"
				onclick={() => (showEntry = true)}
				class="min-h-12 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				Add reading
			</button>
		{/if}
	</header>

	<section
		aria-label="Latest reading"
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
	>
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-xs font-medium tracking-wide text-slate-400 uppercase">Latest reading</p>
				<p class="mt-2 text-4xl font-light tracking-tight text-cyan-100 tabular-nums">
					{latestDisplay ?? '—'}
				</p>
			</div>
			{#if latest}
				<p class="text-xs text-slate-400">{dateFormatter.format(new Date(latest.measured_at))}</p>
			{:else}
				<p class="text-sm text-slate-400">No readings recorded yet.</p>
			{/if}
		</div>

		{#if band && latest && band.marker !== null && referenceLabel}
			<div class="mt-5" aria-hidden="true">
				<div class="relative h-2 w-full overflow-hidden rounded-full bg-white/8">
					<div
						class="absolute inset-y-0 bg-teal-400/40"
						style:left="{band.normalStart}%;width:{band.normalWidth}%"
					></div>
				</div>
				<div class="relative mt-1 h-4">
					<span
						class="absolute -top-1 size-3 -translate-x-1/2 rounded-full border-2 border-[#0b1b2e] {band.inRange
							? 'bg-teal-300'
							: 'bg-amber-300'}"
						style:left="{band.marker}%"
					></span>
				</div>
				<p class="text-xs text-slate-400">{referenceLabel}</p>
			</div>
		{/if}

		{#if assessment}
			<p class="mt-4 border-t border-white/10 pt-3 text-sm leading-relaxed text-slate-400">
				{assessment.protocol}
			</p>
		{/if}
	</section>

	{#if form}
		{@render form()}
	{/if}

	{#if surveyHref}
		<section class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
			<h2 class="text-base font-semibold text-white">Survey</h2>
			<p class="mt-2 text-sm leading-relaxed text-slate-400">{surveyMessage}</p>
			<a
				href={resolvedSurveyHref}
				class="mt-4 inline-flex min-h-11 items-center rounded-lg bg-teal-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
			>
				{surveyLabel}
			</a>
		</section>
	{/if}

	<MetricChart {points} {unit} {decimals} label={`${label} trend`} tone={chartTone} />

	{#if children}
		{@render children()}
	{/if}

	<MetricStatistics {points} {unit} {decimals} label={`${label} statistics`} />
	<MetricHistory {readings} {unit} {decimals} title={`${label} history`} />
</div>

{#if entry && showEntry}
	<MetricEntryDialog config={entry} onclose={() => (showEntry = false)} />
{/if}

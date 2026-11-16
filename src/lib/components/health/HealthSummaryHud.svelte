<script lang="ts">
	import { resolve } from '$app/paths';
	import Sparkline from '#lib/components/metrics/Sparkline.svelte';
	import { healthAreas } from '#lib/data/healthAreas.js';
	import type {
		AstronautHealthStatus,
		HealthAlert,
		HealthSeverity,
		LatestReading
	} from '#lib/interfaces/health.js';

	interface Props {
		status: AstronautHealthStatus;
		vitals: LatestReading[];
		alerts: HealthAlert[];
		basePath: string;
		trends: Readonly<Record<string, number[]>>;
	}

	let { status, vitals, alerts, basePath, trends }: Props = $props();

	let visibleVitals = $derived(vitals.slice(0, 4));
	let openAlerts = $derived(alerts.filter((alert) => !alert.acknowledged).slice(0, 2));
	let alertsHref = $derived(resolve(`${basePath.slice(1)}/alerts` as `crew/${string}`));
	let measurementsHref = $derived(resolve(`${basePath.slice(1)}/measurements` as `crew/${string}`));

	// Cards link to the detail page of the metric that owns their indicator.
	let measurementPaths = $derived.by(() => {
		const paths: Record<string, string> = {};
		for (const area of healthAreas) {
			for (const metric of area.metrics) {
				const indicator = 'indicator' in metric ? metric.indicator : undefined;
				if (indicator) paths[indicator] = `${basePath}/measurements/${area.id}/${metric.id}`;
			}
		}
		return paths;
	});

	let overallLabel = $derived.by(() => {
		switch (status.overall) {
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

	function indicatorName(indicator: string): string {
		return indicator.replaceAll('-', ' ');
	}

	function dotClass(severity: HealthSeverity): string {
		switch (severity) {
			case 'green':
				return 'bg-emerald-400';
			case 'yellow':
				return 'bg-amber-400';
			case 'red':
				return 'bg-rose-400';
			default:
				return 'bg-slate-500';
		}
	}

	function badgeClass(severity: HealthSeverity): string {
		switch (severity) {
			case 'green':
				return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200';
			case 'yellow':
				return 'border-amber-300/30 bg-amber-400/10 text-amber-200';
			case 'red':
				return 'border-rose-300/30 bg-rose-400/10 text-rose-200';
			default:
				return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
		}
	}

	function toneFor(severity: HealthSeverity): 'green' | 'yellow' | 'red' | null {
		return severity === 'unknown' ? null : severity;
	}
</script>

<div class="space-y-6">
	<header
		class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-cyan-200/10 pb-4"
	>
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="text-xs tracking-[0.18em] text-slate-500 uppercase">Mission status</h2>
			<span
				class="rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-[0.14em] uppercase {badgeClass(
					status.overall
				)}"
			>
				{overallLabel}
			</span>
		</div>
		{#if status.lastUpdate}
			<span class="text-xs text-slate-500">Last update {status.lastUpdate.slice(0, 10)}</span>
		{/if}
	</header>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="summary-vitals">
		{#each visibleVitals as vital (vital.reading_id)}
			{@const vitalHref = resolve(
				(measurementPaths[vital.indicator] ?? measurementsHref).slice(1) as `crew/${string}`
			)}
			<a
				href={vitalHref}
				class="group block rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4 transition-colors hover:border-cyan-300/40 hover:bg-[#0d2137] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-300"
			>
				<div class="flex items-start justify-between gap-2">
					<p class="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
						{indicatorName(vital.indicator)}
					</p>
					<span
						aria-hidden="true"
						class="text-sm text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-200"
						>→</span
					>
				</div>
				<p class="mt-3 flex flex-wrap items-baseline gap-1">
					<span class="text-2xl font-light tracking-tight text-cyan-100">{vital.display}</span>
					{#if vital.unit}
						<span class="text-xs font-normal text-slate-500">{vital.unit}</span>
					{/if}
				</p>
				<p class="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
					<span
						aria-hidden="true"
						class="mt-1.5 size-1.5 shrink-0 rounded-full {dotClass(vital.assessment.severity)}"
					></span>
					{vital.assessment.label}
				</p>
				<div class="mt-3">
					<Sparkline
						points={trends[vital.indicator] ?? []}
						tone={toneFor(vital.assessment.severity)}
					/>
				</div>
				<span class="sr-only">View measurement</span>
			</a>
		{:else}
			<p
				class="rounded-xl border border-dashed border-cyan-200/15 p-4 text-sm text-slate-500 sm:col-span-2 xl:col-span-4"
			>
				No reading
			</p>
		{/each}
	</div>

	<section class="space-y-3" aria-labelledby="health-warnings-heading">
		<div class="flex items-center justify-between gap-3">
			<h2
				id="health-warnings-heading"
				class="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase"
			>
				Warnings
			</h2>
			<a
				href={alertsHref}
				class="text-xs font-medium text-cyan-200 transition hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				View all →
			</a>
		</div>
		{#if openAlerts.length > 0}
			<ul class="space-y-2">
				{#each openAlerts as alert (alert.reading_id)}
					<li
						class="flex items-start gap-3 rounded-lg border border-cyan-200/10 bg-cyan-300/[0.03] px-3 py-2"
					>
						<span
							aria-hidden="true"
							class="mt-1.5 size-1.5 shrink-0 rounded-full {dotClass(alert.severity)}"
						></span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
								<p class="text-sm font-medium text-slate-200">{alert.label}</p>
								<p class="text-sm text-slate-300 tabular-nums">
									{alert.value}
									{#if alert.unit}<span class="ml-1 text-xs text-slate-500">{alert.unit}</span>{/if}
								</p>
							</div>
							<p class="mt-1 text-xs leading-relaxed text-slate-500">{alert.protocol}</p>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.03] p-4 text-sm text-slate-400">
				All monitored indicators are within range.
			</p>
		{/if}
	</section>

	<div>
		<a
			href={measurementsHref}
			data-tour="measurements-link"
			class="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-cyan-100 uppercase transition hover:border-cyan-200/50 hover:bg-cyan-300/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
		>
			<span aria-hidden="true">+</span>
			Record measurement
		</a>
	</div>
</div>

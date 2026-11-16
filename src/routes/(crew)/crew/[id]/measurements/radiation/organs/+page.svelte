<script lang="ts">
	import { untrack } from 'svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricEntryDialog from '#lib/components/metrics/MetricEntryDialog.svelte';
	import MetricHistory from '#lib/components/metrics/MetricHistory.svelte';
	import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
	import type { RadiationOrgan, RadiationStatus } from '#lib/interfaces/radiation.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const organOrder: readonly RadiationOrgan[] = ['lens', 'skin', 'bfo', 'cns'];

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

	function isOrgan(value: string | null | undefined): value is RadiationOrgan {
		return value !== null && value !== undefined && organOrder.includes(value as RadiationOrgan);
	}

	function initialOrgan(): RadiationOrgan {
		const submitted = form && 'values' in form ? form.values?.organ : null;
		return isOrgan(submitted) ? submitted : 'lens';
	}

	// Seed from the failed submission so the history matches the error shown, then
	// leave it to the user; only the first render reads the form.
	let selected = $state<RadiationOrgan>(untrack(initialOrgan));
	// The form keeps its own organ so picking one to log does not resize the
	// history chart above it and shift the form under the cursor.
	let draftOrgan = $state<RadiationOrgan>(untrack(initialOrgan));
	let showEntry = $state(false);

	let assessmentByOrgan = $derived(
		new Map(
			data.assessments
				.filter((assessment) => assessment.guideline.organ !== null)
				.map((assessment) => [assessment.guideline.organ as RadiationOrgan, assessment])
		)
	);

	let windowDays = $derived(data.assessments[0]?.guideline.window_days ?? 30);

	let rows = $derived(
		organOrder.map((organ) => {
			const assessment = assessmentByOrgan.get(organ) ?? null;
			const status = assessment?.status ?? 'unknown';
			return {
				organ,
				label: data.organs[organ],
				assessment,
				badge: badges[status],
				bar: bars[status],
				percent:
					assessment?.measured == null || assessment.applied_limit <= 0
						? 0
						: Math.min(100, Math.max(0, (assessment.measured / assessment.applied_limit) * 100)),
				limitDisplay: assessment ? `${assessment.applied_limit} ${assessment.guideline.unit}` : '—',
				recordedAt: assessment?.recorded_at?.slice(0, 10) ?? null
			};
		})
	);

	let selectedAssessment = $derived(assessmentByOrgan.get(selected) ?? null);
	let unit = $derived(selectedAssessment?.guideline.unit ?? 'mGy-Eq');
	let draftAssessment = $derived(assessmentByOrgan.get(draftOrgan) ?? null);
	let draftUnit = $derived(draftAssessment?.guideline.unit ?? 'mGy-Eq');
	// Stale readings still warrant the amber tone; unknown has no assessment yet.
	let selectedTone = $derived.by<'green' | 'yellow' | 'red' | null>(() => {
		switch (selectedAssessment?.status ?? 'unknown') {
			case 'green':
				return 'green';
			case 'red':
				return 'red';
			case 'yellow':
			case 'stale':
				return 'yellow';
			default:
				return null;
		}
	});
	let organReadings = $derived(data.readings.filter((reading) => reading.detail === selected));
	let points = $derived(organReadings.map((reading) => reading.value).reverse());

	let formSuccess: string | null = $derived(
		form && 'success' in form ? (form.message ?? null) : null
	);

	let entryConfig = $derived<MetricEntryConfig>({
		title: 'Organ dose',
		fields: [
			{
				name: 'value',
				label: 'Dose',
				unit: draftUnit,
				min: 0,
				max: 5000,
				step: '0.1',
				integer: false
			}
		],
		hidden: { kind: 'organ', organ: draftOrgan }
	});
</script>

<svelte:head>
	<title>30-day organ limits · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<header class="border-b border-cyan-200/10 pb-4">
		<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Radiation</p>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
			30-day organ limits
		</h1>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
			Rolling {windowDays}-day window. Each organ keeps its equivalent dose under the limit so acute
			deterministic effects never start.
		</p>
	</header>

	{#if formSuccess}
		<div
			role="status"
			class="rounded-xl border border-teal-300/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-200"
		>
			{formSuccess}
		</div>
	{/if}

	<ul class="grid gap-3 sm:grid-cols-2">
		{#each rows as row (row.organ)}
			<li class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<h2 class="text-sm font-semibold text-slate-100">{row.label}</h2>
					<span
						class="inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase {row
							.badge.class}"
					>
						{row.badge.label}
					</span>
				</div>

				<p class="mt-3 text-xl font-light tracking-tight text-cyan-100 tabular-nums">
					{row.assessment?.display ?? '—'}
					<span class="text-sm text-slate-500">/ {row.limitDisplay}</span>
				</p>
				{#if row.assessment?.measured == null}
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
						<dd class="text-slate-300">{row.assessment?.reading_count ?? 0}</dd>
					</div>
				</dl>

				<p class="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-slate-400">
					{row.assessment?.protocol ?? 'Log an organ dose to assess this limit.'}
				</p>
			</li>
		{/each}
	</ul>

	<section aria-labelledby="organ-history-title" class="space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 id="organ-history-title" class="text-base font-semibold text-white">Organ history</h2>
			<div role="group" aria-label="Choose an organ" class="flex flex-wrap gap-2">
				{#each organOrder as organ (organ)}
					<button
						type="button"
						aria-pressed={selected === organ}
						onclick={() => (selected = organ)}
						class="min-h-11 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 {selected ===
						organ
							? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100'
							: 'border-white/15 text-slate-300 hover:bg-white/5'}"
					>
						{data.organs[organ]}
					</button>
				{/each}
			</div>
		</div>

		{#if organReadings.length === 0}
			<p
				class="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400"
			>
				No {data.organs[selected]} dose logged in the last 30 days.
			</p>
		{:else}
			<MetricChart
				{points}
				{unit}
				decimals={1}
				label={`${data.organs[selected]} trend`}
				tone={selectedTone}
			/>
			<MetricHistory
				readings={organReadings}
				{unit}
				decimals={1}
				title={`${data.organs[selected]} history`}
			/>
		{/if}
	</section>

	<section
		aria-labelledby="organ-entry-title"
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
	>
		<h2 id="organ-entry-title" class="text-base font-semibold text-white">Log an organ dose</h2>
		<p class="mt-1 text-sm leading-relaxed text-slate-400">
			Record the equivalent dose of one organ from a dosimetry snapshot.
		</p>

		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<fieldset class="sm:col-span-2">
				<legend class="block text-sm font-medium text-slate-300">Organ</legend>
				<div class="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Organ">
					{#each organOrder as organ (organ)}
						<button
							type="button"
							aria-pressed={draftOrgan === organ}
							onclick={() => (draftOrgan = organ)}
							class="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-300 transition select-none hover:border-cyan-300/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 aria-pressed:border-cyan-300 aria-pressed:bg-cyan-300/15 aria-pressed:text-white"
						>
							{data.organs[organ]}
						</button>
					{/each}
				</div>
			</fieldset>

			<div class="sm:col-span-2">
				<button
					type="button"
					onclick={() => (showEntry = true)}
					class="min-h-12 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
				>
					Log dose
				</button>
			</div>
		</div>
	</section>
</div>

{#if showEntry}
	<MetricEntryDialog
		config={entryConfig}
		action="?/organ"
		heading={`Add ${data.organs[draftOrgan].toLowerCase()} dose`}
		submitLabel="Save dose"
		onsuccess={() => (selected = draftOrgan)}
		onclose={() => (showEntry = false)}
	/>
{/if}

<script lang="ts">
	import MetricEntryDialog from '#lib/components/metrics/MetricEntryDialog.svelte';
	import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
	import type { RadiationStatus } from '#lib/interfaces/radiation.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

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

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	let assessment = $derived(data.assessment);
	let speActive = $derived(data.profile?.spe_alert_active ?? false);
	let startedAt = $derived(
		data.profile?.spe_alert_started_at
			? dateFormatter.format(new Date(data.profile.spe_alert_started_at))
			: null
	);
	let status = $derived(assessment?.status ?? 'unknown');
	let badge = $derived(badges[status]);
	let bar = $derived(bars[status]);
	let percent = $derived(
		assessment?.measured == null || assessment.applied_limit <= 0
			? 0
			: Math.min(100, Math.max(0, (assessment.measured / assessment.applied_limit) * 100))
	);
	let limitDisplay = $derived(
		assessment ? `${assessment.applied_limit} ${assessment.guideline.unit}` : '250 mSv'
	);

	interface SpeEvent {
		startedAt: string;
		dose: number;
		segments: number;
		open: boolean;
	}

	// Boundary rows carry no dose; they only mark where an event starts. Walking
	// oldest-first lets a boundary open the group its segments belong to.
	let events = $derived.by(() => {
		const groups: SpeEvent[] = [];

		for (const reading of [...data.readings].reverse()) {
			const boundary = reading.notes === 'spe-open' || reading.notes === 'spe-closed';
			if (boundary || groups.length === 0) {
				groups.push({
					startedAt: reading.measured_at,
					dose: 0,
					segments: 0,
					open: reading.notes === 'spe-open'
				});
			}

			if (!boundary) {
				const group = groups[groups.length - 1];
				group.dose += reading.value;
				group.segments += 1;
			}
		}

		return groups.reverse();
	});

	let formSuccess: string | null = $derived(
		form && 'success' in form ? (form.message ?? null) : null
	);
	let formError: string | null = $derived(form && 'error' in form ? (form.error ?? null) : null);

	let showEntry = $state(false);
	let entryConfig = $derived<MetricEntryConfig>({
		title: 'SPE segment',
		fields: [
			{
				name: 'value',
				label: 'Segment dose',
				unit: 'mSv',
				min: 0.01,
				max: 1000,
				step: '0.01',
				integer: false
			}
		],
		hidden: { kind: 'spe' }
	});
</script>

<svelte:head>
	<title>SPE alert · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<header class="border-b border-cyan-200/10 pb-4">
		<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Radiation</p>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">SPE alert</h1>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
			{assessment?.guideline.description ??
				'Effective dose inside a solar particle event. When it approaches the limit the crew shelters in the most shielded part of the vehicle.'}
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
	{#if formError}
		<p
			role="alert"
			class="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
		>
			{formError}
		</p>
	{/if}

	<section
		aria-labelledby="spe-status-title"
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<h2 id="spe-status-title" class="text-base font-semibold text-white">Event dose</h2>
				<p class="mt-1 text-sm text-slate-400">
					{#if speActive}
						Open event since {startedAt ?? 'an unknown date'}.
					{:else}
						No open event.
					{/if}
				</p>
			</div>
			<span
				class="inline-flex rounded-md border px-2 py-1 text-[11px] font-medium tracking-wide uppercase {badge.class}"
			>
				{badge.label}
			</span>
		</div>

		<p class="mt-4 text-3xl font-light tracking-tight text-cyan-100 tabular-nums">
			{assessment?.display ?? '—'}
			<span class="text-sm text-slate-500">/ {limitDisplay}</span>
		</p>
		{#if assessment?.measured == null}
			<p class="mt-1 text-sm text-slate-400">No readings</p>
		{/if}

		<div class="mt-3" aria-hidden="true">
			<div class="relative h-2 w-full overflow-hidden rounded-full bg-white/8">
				<div
					class="absolute inset-y-0 rounded-full {bar}"
					style:left="0%"
					style:width="{percent}%"
				></div>
			</div>
		</div>
		<p class="mt-1 text-xs text-slate-500">{percent.toFixed(0)}% of the limit</p>

		<dl class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
			<div class="flex gap-1.5">
				<dt class="text-slate-500">Last reading</dt>
				<dd class="text-slate-300">{assessment?.recorded_at?.slice(0, 10) ?? 'None'}</dd>
			</div>
			<div class="flex gap-1.5">
				<dt class="text-slate-500">Segments</dt>
				<dd class="text-slate-300">{assessment?.reading_count ?? 0}</dd>
			</div>
		</dl>

		<p class="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-slate-400">
			{assessment?.protocol ?? 'No solar particle event is open or recorded.'}
		</p>
	</section>

	<section
		aria-labelledby="spe-readings-title"
		class="rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 id="spe-readings-title" class="text-base font-semibold text-white">Event readings</h2>
			<span class="text-xs text-slate-400">{events.length} events</span>
		</div>

		{#if events.length}
			<ul class="mt-4 max-h-72 divide-y divide-white/10 overflow-y-auto">
				{#each events as event, index (`${event.startedAt}-${index}`)}
					<li class="flex items-start justify-between gap-3 py-3">
						<div class="min-w-0">
							<p class="text-sm font-semibold text-slate-100">
								{event.open ? 'Open event' : 'Event'}
								<span class="font-normal text-slate-400">
									since {dateFormatter.format(new Date(event.startedAt))}
								</span>
							</p>
							<p class="mt-1 text-xs text-slate-400">
								{event.segments}
								{event.segments === 1 ? 'segment' : 'segments'}
							</p>
						</div>
						<p class="shrink-0 text-sm font-semibold text-cyan-100 tabular-nums">
							{event.dose.toFixed(2)} mSv
						</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-4 text-sm text-slate-400">No solar particle events recorded.</p>
		{/if}
	</section>

	<section
		aria-labelledby="spe-entry-title"
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
	>
		<h2 id="spe-entry-title" class="text-base font-semibold text-white">Log an event segment</h2>
		<p class="mt-1 text-sm leading-relaxed text-slate-400">
			Segments logged during the open event sum towards the 250 mSv effective dose limit.
		</p>

		<div class="mt-4">
			<button
				type="button"
				disabled={!speActive}
				onclick={() => (showEntry = true)}
				class="min-h-12 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Log segment
			</button>
			{#if !speActive}
				<p id="spe-segment-note" class="mt-2 text-xs leading-relaxed text-amber-200">
					Open a solar particle event alert on the Radiation page before logging segments.
				</p>
			{/if}
		</div>
	</section>
</div>

{#if showEntry}
	<MetricEntryDialog
		config={entryConfig}
		action="?/spe"
		heading="Add SPE segment"
		submitLabel="Save segment"
		onclose={() => (showEntry = false)}
	/>
{/if}

<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { healthAreas } from '#lib/data/healthAreas.js';
	import type { HistoryEntry } from '#lib/interfaces/health.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let profileId = $derived(page.params.id ?? '');

	const MAX_VISIBLE = 40;
	const dayFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
	const timestampFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	// Whole class strings keep Tailwind from purging the accent colors.
	const areaAccents: Record<string, string> = {
		cardiovascular: 'bg-rose-400',
		muscular: 'bg-amber-300',
		mental: 'bg-violet-400',
		radiation: 'bg-lime-300',
		general: 'bg-cyan-300'
	};

	const sourceBadges: Record<string, string> = {
		manual: 'border-cyan-200/20 bg-cyan-300/10 text-cyan-100',
		sensor: 'border-violet-300/25 bg-violet-400/10 text-violet-200'
	};

	const sourceLabels: Record<string, string> = {
		manual: 'Manual',
		sensor: 'Sensor'
	};

	function parseDate(value: string): Date | null {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	function formatDay(value: string): string {
		const date = parseDate(value);
		return date ? dayFormatter.format(date) : value.slice(0, 10);
	}

	function formatTimestamp(value: string): string {
		const date = parseDate(value);
		return date ? timestampFormatter.format(date) : value;
	}

	let visibleEntries = $derived(data.entries.slice(0, MAX_VISIBLE));

	let groupedEntries = $derived.by(() => {
		const groups: { key: string; label: string; entries: HistoryEntry[] }[] = [];
		for (const entry of visibleEntries) {
			const key = entry.measured_at.slice(0, 10);
			const current = groups.at(-1);
			if (current?.key === key) {
				current.entries.push(entry);
			} else {
				groups.push({ key, label: formatDay(entry.measured_at), entries: [entry] });
			}
		}
		return groups;
	});
</script>

<svelte:head>
	<title>Mission log · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<header class="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-200/10 pb-4">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
				Mission archive
			</p>
			<h1 class="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Mission log</h1>
		</div>
		<p
			class="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-xs text-cyan-100"
		>
			{data.entries.length}
			{data.entries.length === 1 ? 'entry' : 'entries'}
		</p>
	</header>

	<form
		method="GET"
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-4"
		aria-label="Filter the mission log"
	>
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div>
				<label
					for="history-area"
					class="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					Area
				</label>
				<select
					id="history-area"
					name="area"
					class="mt-1 block min-h-10 w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
				>
					<option value="">All areas</option>
					{#each healthAreas as area (area.id)}
						<option value={area.id} selected={data.filters.area === area.id}>{area.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label
					for="history-metric"
					class="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					Metric
				</label>
				<select
					id="history-metric"
					name="metric"
					class="mt-1 block min-h-10 w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
				>
					<option value="">All metrics</option>
					{#each data.metrics as metric (metric.code)}
						<option value={metric.code} selected={data.filters.metric === metric.code}>
							{metric.label}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label
					for="history-from"
					class="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					From
				</label>
				<input
					id="history-from"
					name="from"
					type="date"
					value={data.filters.from}
					class="mt-1 block min-h-10 w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
				/>
			</div>

			<div>
				<label
					for="history-to"
					class="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					To
				</label>
				<input
					id="history-to"
					name="to"
					type="date"
					value={data.filters.to}
					class="mt-1 block min-h-10 w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
				/>
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<button
				type="submit"
				class="inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				Apply
			</button>
			<a
				href={resolve('/(crew)/crew/[id]/history', { id: profileId })}
				class="inline-flex min-h-10 items-center justify-center rounded-lg border border-cyan-200/20 px-4 text-sm font-semibold text-slate-300 transition hover:bg-cyan-300/5 hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				Reset
			</a>
		</div>
	</form>

	<div class="mt-3 flex justify-end">
		<form method="GET" action={resolve('/(crew)/crew/[id]/history/export', { id: profileId })}>
			<input type="hidden" name="area" value={data.filters.area ?? ''} />
			<input type="hidden" name="metric" value={data.filters.metric} />
			<input type="hidden" name="from" value={data.filters.from} />
			<input type="hidden" name="to" value={data.filters.to} />
			<button
				type="submit"
				class="inline-flex min-h-10 items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-300/5 px-4 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				Export CSV
			</button>
		</form>
	</div>

	{#if data.entries.length === 0}
		<div
			class="rounded-2xl border border-dashed border-cyan-200/15 bg-cyan-300/[0.02] p-8 text-center"
		>
			<p class="text-sm text-slate-400">
				No measurements recorded yet. Record a reading to start the mission log.
			</p>
		</div>
	{:else}
		<section aria-labelledby="mission-log-heading">
			<h3 id="mission-log-heading" class="sr-only">Recorded entries</h3>
			<ol class="space-y-6">
				{#each groupedEntries as day (day.key)}
					<li>
						<h4
							class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase"
						>
							<span class="size-1.5 rounded-full bg-cyan-300/60" aria-hidden="true"></span>
							{day.label}
						</h4>
						<ol class="mt-3 space-y-1 border-l border-cyan-200/10 pl-4">
							{#each day.entries as entry (entry.id)}
								<li
									class="relative rounded-lg px-2 py-2 transition-colors hover:bg-cyan-300/[0.04]"
								>
									<span
										class="absolute top-3.5 -left-[1.25rem] size-2 rounded-full ring-4 ring-[#0b1729] {areaAccents[
											entry.area_id ?? ''
										] ?? 'bg-slate-500'}"
										aria-hidden="true"
									></span>
									<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
										<p class="text-sm font-medium text-slate-100">{entry.label}</p>
										<p class="font-mono text-sm text-cyan-100">{entry.display}</p>
									</div>
									<div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
										<time datetime={entry.measured_at}>{formatTimestamp(entry.measured_at)}</time>
										<span aria-hidden="true">·</span>
										<span
											class="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase {sourceBadges[
												entry.source
											] ?? 'border-slate-400/20 bg-slate-400/10 text-slate-300'}"
										>
											{sourceLabels[entry.source] ?? entry.source}
										</span>
										{#if entry.area_id}
											<span class="text-slate-600">
												{healthAreas.find((area) => area.id === entry.area_id)?.label ??
													entry.area_id}
											</span>
										{/if}
									</div>
								</li>
							{/each}
						</ol>
					</li>
				{/each}
			</ol>
			{#if data.entries.length > MAX_VISIBLE}
				<p class="mt-4 text-xs text-slate-500">Showing the latest {MAX_VISIBLE} entries.</p>
			{/if}
		</section>
	{/if}
</div>

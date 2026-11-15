<script lang="ts">
	import { mentalSurveyBlocks } from '#lib/data/mentalSurvey.js';
	import type { MentalSurveySummary, SurveyTone } from '#lib/interfaces/mental-survey.js';

	interface Props {
		summary: MentalSurveySummary | null;
	}

	let { summary }: Props = $props();

	const toneMeta: Record<SurveyTone, { dot: string; text: string; label: string }> = {
		green: { dot: 'bg-teal-300', text: 'text-teal-200', label: 'Good' },
		yellow: { dot: 'bg-amber-300', text: 'text-amber-200', label: 'Follow up' },
		red: { dot: 'bg-rose-300', text: 'text-rose-200', label: 'Alert' }
	};

	let results = $derived(
		(summary?.blocks ?? []).map((result) => ({
			...result,
			name:
				mentalSurveyBlocks.find((entry) => entry.id === result.block_id)?.name ?? result.block_id,
			tone: toneMeta[result.tone]
		}))
	);

	let recordedAt = $derived(summary?.recorded_at ?? '');
	let recordedLabel = $derived(recordedAt.slice(0, 16).replace('T', ' '));
	let sleepReading = $derived(summary?.sleep_hours ?? null);
	let sleepTone = $derived(summary?.sleep_tone ? toneMeta[summary.sleep_tone] : null);
</script>

{#if !summary || results.length === 0}
	<section class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
		<h2 class="text-base font-semibold text-white">Survey results</h2>
		<p class="mt-2 text-sm leading-relaxed text-slate-400">No survey answers yet.</p>
		<p class="mt-1 text-sm leading-relaxed text-slate-400">
			Answer the survey from a sub-item to see your rest, mood and concentration results.
		</p>
	</section>
{:else}
	<section class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
		<header class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-base font-semibold text-white">Survey results</h2>
			{#if recordedAt}
				<time datetime={recordedAt} class="text-xs text-slate-500">{recordedLabel}</time>
			{/if}
		</header>

		<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each results as result (result.block_id)}
				<article class="rounded-xl border border-cyan-200/10 bg-[#081322] p-4">
					<h3 class="text-xs font-medium text-slate-300">{result.name}</h3>
					<p class="mt-2 text-2xl font-light tracking-tight text-cyan-100">
						{result.score === null ? '—' : result.score.toFixed(1)}<span
							class="ml-1 text-xs font-normal text-slate-500">/5</span
						>
					</p>
					<p class="mt-2 flex items-center gap-2 text-xs {result.tone.text}">
						<span aria-hidden="true" class="size-2 shrink-0 rounded-full {result.tone.dot}"></span>
						{result.tone.label}
					</p>
					{#if result.risk_items.length > 0}
						<p class="mt-2 text-xs text-slate-400">
							Items flagged: {result.risk_items.join(', ')}
						</p>
					{/if}
				</article>
			{/each}
		</div>

		{#if sleepReading && sleepTone}
			<div
				class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-200/10 bg-[#081322] p-4"
			>
				<div>
					<h3 class="text-xs font-medium text-slate-300">Last rest period</h3>
					<p class="mt-1 text-sm text-slate-400">
						{sleepReading.label} · {sleepReading.interpretation}
					</p>
				</div>
				<p class="flex items-center gap-2 text-xs {sleepTone.text}">
					<span aria-hidden="true" class="size-2 shrink-0 rounded-full {sleepTone.dot}"></span>
					{sleepTone.label}
				</p>
			</div>
		{/if}
	</section>
{/if}

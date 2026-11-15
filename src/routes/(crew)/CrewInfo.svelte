<script lang="ts">
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import {
		astronautName,
		crewTaskProgress,
		levelProgress,
		pendingCrewTasks,
		xpSegments
	} from '#lib/utils/crew.js';
	import { crewStatuses } from '#lib/utils/crew-theme.js';

	interface Props {
		astronaut: Astronaut;
		reducedMotion: boolean;
		largeText: boolean;
		highContrast: boolean;
		onopen: () => void;
		onedit: () => void;
	}

	let { astronaut, reducedMotion, largeText, highContrast, onopen, onedit }: Props = $props();

	const numberFormat = new Intl.NumberFormat('en', { useGrouping: 'always' });
	const XP_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

	let name = $derived(astronautName(astronaut));
	let status = $derived(crewStatuses[astronaut.status]);
	let level = $derived(levelProgress(astronaut.xp_total));
	let progress = $derived(crewTaskProgress(astronaut.tasks));
	let filledCells = $derived(xpSegments(level.xp, level.xp_next));
	let nextTask = $derived(pendingCrewTasks(astronaut.tasks, 1)[0] ?? null);
	let muted = $derived(highContrast ? 'text-slate-200' : 'text-slate-400');
	let border = $derived(highContrast ? 'border-white/25' : 'border-white/10');
	let nameSize = $derived(largeText ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl');
	let chip = $derived(
		highContrast
			? 'border-white/25 bg-slate-800 text-slate-100'
			: 'border-white/10 bg-white/5 text-slate-200'
	);
</script>

<section
	class="relative z-10 mx-auto mt-4 w-full max-w-3xl px-5 sm:mt-6 sm:px-8"
	aria-labelledby="crew-info-heading"
>
	<div
		class="rounded-3xl border bg-slate-900/60 p-4 backdrop-blur sm:p-6 {border} {reducedMotion
			? ''
			: 'transition-colors duration-300'}"
	>
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<h2 id="crew-info-heading" class="font-semibold tracking-tight text-white {nameSize}">
					{name}
				</h2>
				<p class="mt-1 flex flex-wrap items-center gap-2 text-sm {muted}">
					<span>{astronaut.role}</span>
					<span>· {astronaut.nationality ?? 'Nationality not recorded'}</span>
					<span
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset {status.pill}"
					>
						<span class="size-1.5 rounded-full {status.dot}" aria-hidden="true"></span>
						{status.label}
					</span>
				</p>
			</div>

			<div class="flex flex-col gap-2 sm:flex-row">
				<button
					type="button"
					class="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
					onclick={onopen}
				>
					Open profile
				</button>
				<button
					type="button"
					class="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none {border}"
					onclick={onedit}
				>
					Edit profile
				</button>
			</div>
		</div>

		<div class="mt-5">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<span class="text-xs font-semibold tracking-[0.14em] uppercase {muted}">
					Level {level.level}
				</span>
				<span class="font-mono text-xs font-medium tabular-nums {muted}">
					{numberFormat.format(level.xp)} / {numberFormat.format(level.xp_next)} XP
				</span>
			</div>
			<div class="mt-2 flex gap-1" aria-hidden="true">
				{#each XP_CELLS as cell (cell)}
					<span
						class="h-1.5 flex-1 rounded-full {cell < filledCells ? 'bg-teal-400' : 'bg-white/15'}"
					></span>
				{/each}
			</div>
		</div>

		<div class="mt-4 flex flex-wrap gap-2">
			<span
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums {chip}"
			>
				Streak: {astronaut.streak_days}
				{astronaut.streak_days === 1 ? 'day' : 'days'}
			</span>
			<span
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums {chip}"
			>
				Pending tasks: {progress.pending}
			</span>
			<span
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums {chip}"
			>
				Missions: {astronaut.missions_completed}
			</span>
		</div>

		{#if nextTask}
			<p class="mt-4 text-sm {muted}">
				Next:
				<span class="font-medium text-slate-100">{nextTask.title}</span>
				<span class="font-mono tabular-nums">(+{nextTask.xp} XP)</span>
			</p>
		{:else}
			<p class="mt-4 text-sm {muted}">All done for today.</p>
		{/if}
	</div>
</section>

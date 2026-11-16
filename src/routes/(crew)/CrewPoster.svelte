<script lang="ts">
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import AstronautAvatar from '#lib/components/AstronautAvatar.svelte';
	import { astronautName, crewTaskProgress, levelProgress, xpSegments } from '#lib/utils/crew.js';
	import { crewStatuses, crewTones } from '#lib/utils/crew-theme.js';
	import { astronautAvatarName, astronautNameName } from '#lib/utils/shared-transition.js';

	interface Props {
		astronaut: Astronaut;
		focused: boolean;
		nearness: number;
		reducedMotion: boolean;
		onselect: (astronaut: Astronaut) => void;
		shared?: boolean;
	}
	let { astronaut, focused, nearness, reducedMotion, onselect, shared = false }: Props = $props();
	const numberFormat = new Intl.NumberFormat('en', { useGrouping: 'always' });
	const XP_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	let showDetails = $derived(nearness > 0.45);
	let detailState = $derived(showDetails ? 'opacity-100' : 'opacity-0');
	let detailMotion = $derived(reducedMotion ? '' : 'transition-opacity duration-[420ms] ease-out');
	let name = $derived(astronautName(astronaut));
	let tone = $derived(crewTones[astronaut.tone]);
	let status = $derived(crewStatuses[astronaut.status]);
	let level = $derived(levelProgress(astronaut.xp_total));
	let progress = $derived(crewTaskProgress(astronaut.tasks));
	let filledCells = $derived(xpSegments(level.xp, level.xp_next));
	let streakLabel = $derived(
		astronaut.streak_days === 0
			? 'No streak'
			: `${astronaut.streak_days} ${astronaut.streak_days === 1 ? 'day' : 'days'}`
	);
	let pendingLabel = $derived(progress.pending === 1 ? '1 pending' : `${progress.pending} pending`);
	let avatarTransition = $derived(shared ? astronautAvatarName(astronaut.id) : null);
	let nameTransition = $derived(shared ? astronautNameName(astronaut.id) : null);
</script>

<button
	type="button"
	data-selected={focused}
	data-astro-id={astronaut.id}
	aria-current={focused ? 'true' : undefined}
	aria-label={`Select ${name}`}
	onclick={() => onselect(astronaut)}
	title={focused ? 'Open profile' : 'Select astronaut'}
	class="poster group relative block aspect-[3/4] w-full shrink-0 overflow-hidden rounded-3xl text-left {focused
		? 'ring-2 ring-white/80'
		: 'ring-1 ring-white/10'} focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
>
	<span class="absolute inset-0 {tone.plate}" aria-hidden="true"></span>
	<span class="star-field absolute inset-0 opacity-40" aria-hidden="true"></span>
	<span class="absolute inset-0 {tone.glow} opacity-60 blur-2xl" aria-hidden="true"></span>
	{#if focused}
		<span class="absolute inset-0 {tone.glow} opacity-80 blur-2xl" aria-hidden="true"></span>
	{/if}

	<span
		class="absolute top-[4cqw] left-[4cqw] z-10 rounded-full bg-white/10 px-[2.5cqw] py-[1cqw] font-mono text-[3.2cqw] font-semibold tracking-[0.14em] text-white uppercase ring-1 ring-white/20 backdrop-blur ring-inset"
	>
		Level {level.level}
	</span>

	<span
		class="absolute top-[4cqw] right-[4cqw] z-10 inline-flex items-center gap-[1.5cqw] rounded-full px-[2cqw] py-[1cqw] text-[3.2cqw] font-semibold ring-1 ring-inset {status.pill}"
	>
		<span class="size-[1.6cqw] rounded-full {status.dot}" aria-hidden="true"></span>
		<span class="{detailMotion} {detailState}">{status.label}</span>
	</span>
	<span
		class="pointer-events-none absolute inset-x-0 top-1/2 grid -translate-y-1/2 place-items-center"
		aria-hidden="true"
	>
		<span class="inline-block" style:view-transition-name={avatarTransition}>
			<AstronautAvatar
				{astronaut}
				class="size-[46cqw]"
				ringClass="ring-[0.9cqw]"
				textClass="text-[13cqw]"
			/>
		</span>
	</span>

	<span
		class="absolute inset-x-0 bottom-0 z-10 block bg-linear-to-t from-slate-950 via-slate-950/85 to-transparent p-[4cqw] pt-[16cqw]"
	>
		<span
			class="block truncate text-[9cqw] font-semibold text-white"
			style:view-transition-name={nameTransition}>{name}</span
		>

		<span class="mt-[1cqw] block truncate text-[4.5cqw] text-slate-300 {detailMotion} {detailState}"
			>{astronaut.role}</span
		>

		<span class="mt-[2.5cqw] flex flex-wrap gap-[1.5cqw] {detailMotion} {detailState}">
			<span
				class="inline-flex items-center gap-[1cqw] rounded-full bg-white/10 px-[2cqw] py-[0.8cqw] text-[3.6cqw] font-medium text-white ring-1 ring-white/20 ring-inset"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-[3.6cqw]"
					aria-hidden="true"
				>
					<path
						d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
					/>
				</svg>
				{streakLabel}
			</span>
			<span
				class="inline-flex items-center rounded-full bg-white/10 px-[2cqw] py-[0.8cqw] text-[3.6cqw] font-medium text-white ring-1 ring-white/20 ring-inset"
			>
				{pendingLabel}
			</span>
		</span>

		<span class="mt-[2.5cqw] flex gap-[1cqw] {detailMotion} {detailState}" aria-hidden="true">
			{#each XP_CELLS as cell (cell)}
				<span class="h-[1cqw] flex-1 rounded-full {cell < filledCells ? tone.bar : 'bg-white/20'}"
				></span>
			{/each}
		</span>
		<span class="sr-only {detailState}">
			{numberFormat.format(level.xp)} of {numberFormat.format(level.xp_next)} XP to the next level
		</span>
	</span>
</button>

<style>
	.poster {
		container-type: inline-size;
	}
</style>

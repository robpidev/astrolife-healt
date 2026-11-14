<script lang="ts">
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import AstronautAvatar from '#lib/components/AstronautAvatar.svelte';
	import { astronautName, crewTaskProgress, levelProgress, xpSegments } from '#lib/utils/crew.js';
	import { crewStatuses, crewTones } from '#lib/utils/crew-theme.js';

	type Tier = 'center' | 'near' | 'far';

	interface Props {
		astronaut: Astronaut;
		tier: Tier;
		selected: boolean;
		reducedMotion: boolean;
		onselect: (astronaut: Astronaut) => void;
	}

	let { astronaut, tier, selected, reducedMotion, onselect }: Props = $props();

	const numberFormat = new Intl.NumberFormat('es', { useGrouping: 'always' });
	const XP_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

	const tierSize: Record<Tier, string> = {
		center: 'w-[min(80vw,21rem)] h-[20rem] sm:h-[29rem]',
		near: 'w-[min(48vw,16.5rem)] h-[17rem] sm:h-[24rem]',
		far: 'w-[min(36vw,13.5rem)] h-[15rem] sm:h-[21rem]'
	};

	const tierOpacity: Record<Tier, string> = {
		center: 'opacity-100 hover:opacity-100',
		near: 'opacity-75 hover:opacity-90',
		far: 'opacity-45 hover:opacity-90'
	};

	const avatarSize: Record<Tier, 'md' | 'lg' | 'xl'> = {
		center: 'xl',
		near: 'lg',
		far: 'md'
	};

	const nameSize: Record<Tier, string> = {
		center: 'text-2xl font-semibold',
		near: 'text-lg font-semibold',
		far: 'text-base font-semibold'
	};

	let name = $derived(astronautName(astronaut));
	let tone = $derived(crewTones[astronaut.tone]);
	let status = $derived(crewStatuses[astronaut.status]);
	let level = $derived(levelProgress(astronaut.xp_total));
	let progress = $derived(crewTaskProgress(astronaut.tasks));
	let filledCells = $derived(xpSegments(level.xp, level.xp_next));
	let streakLabel = $derived(
		astronaut.streak_days === 0
			? 'Sin racha'
			: `${astronaut.streak_days} ${astronaut.streak_days === 1 ? 'día' : 'días'}`
	);
	let pendingLabel = $derived(
		progress.pending === 1 ? '1 pendiente' : `${progress.pending} pendientes`
	);
</script>

<button
	type="button"
	data-selected={selected}
	aria-pressed={selected}
	aria-label={selected ? `Abrir ficha de ${name}` : `Seleccionar a ${name}`}
	onclick={() => onselect(astronaut)}
	class="group relative flex shrink-0 flex-col overflow-hidden rounded-3xl text-left {tierSize[
		tier
	]} {tierOpacity[tier]} {selected
		? 'ring-2 ring-white/80 ring-offset-2 ring-offset-slate-950'
		: 'ring-1 ring-white/10'} focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none {reducedMotion
		? ''
		: 'transition-[width,height,opacity] duration-500 ease-out'}"
>
	<span class="absolute inset-0 {tone.plate}" aria-hidden="true"></span>
	<span class="star-field absolute inset-0 opacity-40" aria-hidden="true"></span>
	<span class="absolute inset-0 {tone.glow} opacity-60 blur-2xl" aria-hidden="true"></span>
	{#if selected}
		<span class="absolute inset-0 {tone.glow} opacity-80 blur-2xl" aria-hidden="true"></span>
	{/if}

	<span
		class="absolute top-3 left-3 z-10 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-white uppercase ring-1 ring-white/20 backdrop-blur ring-inset"
	>
		Nivel {level.level}
	</span>

	<span
		class="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset {status.pill}"
	>
		<span class="size-1.5 rounded-full {status.dot}" aria-hidden="true"></span>
		{#if tier !== 'far'}
			{status.label}
		{/if}
	</span>

	<span class="absolute inset-0 grid place-items-center pb-20" aria-hidden="true">
		<AstronautAvatar {astronaut} size={avatarSize[tier]} />
	</span>

	<span
		class="absolute inset-x-0 bottom-0 z-10 block bg-linear-to-t from-slate-950 via-slate-950/85 to-transparent p-4 pt-16"
	>
		<span class="block truncate text-white {nameSize[tier]}">{name}</span>
		{#if tier !== 'far'}
			<span class="mt-0.5 block truncate text-xs text-slate-300">{astronaut.role}</span>
		{/if}

		{#if tier !== 'far'}
			<span class="mt-2 flex flex-wrap gap-1.5">
				<span
					class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-white/20 ring-inset"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="size-3"
						aria-hidden="true"
					>
						<path
							d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
						/>
					</svg>
					{streakLabel}
				</span>
				<span
					class="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-white/20 ring-inset"
				>
					{pendingLabel}
				</span>
			</span>

			<span class="mt-2 flex gap-1" aria-hidden="true">
				{#each XP_CELLS as cell (cell)}
					<span class="h-1 flex-1 rounded-full {cell < filledCells ? tone.bar : 'bg-white/20'}"
					></span>
				{/each}
			</span>
			<span class="sr-only">
				{numberFormat.format(level.xp)} de {numberFormat.format(level.xp_next)} XP para el siguiente nivel
			</span>
		{/if}
	</span>
</button>

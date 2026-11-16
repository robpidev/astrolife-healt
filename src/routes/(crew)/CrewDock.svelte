<script lang="ts">
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import AstronautAvatar from '#lib/components/AstronautAvatar.svelte';
	import { astronautName } from '#lib/utils/crew.js';

	interface Props {
		crew: Astronaut[];
		index: number;
		canPrev: boolean;
		canNext: boolean;
		onprev: () => void;
		onnext: () => void;
		onselect: (index: number) => void;
		onadd: () => void;
		onopen: () => void;
	}

	let { crew, index, canPrev, canNext, onprev, onnext, onselect, onadd, onopen }: Props = $props();

	let viewerEl = $state<HTMLDivElement | null>(null);

	// Keep the active card visible when the selection changes from the rail,
	// the arrows, or the keyboard.
	$effect(() => {
		const active = index;
		const members = crew;
		const viewer = viewerEl;
		if (!viewer || members.length === 0) return;

		const target = viewer.querySelector<HTMLElement>(`[data-card="${active}"]`);
		if (!target) return;

		const box = viewer.getBoundingClientRect();
		const item = target.getBoundingClientRect();
		viewer.scrollBy({
			left: item.left + item.width / 2 - (box.left + box.width / 2),
			behavior: 'auto'
		});
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
>
	<div
		role="group"
		aria-label="Crew navigator"
		class="pointer-events-auto flex max-w-[min(58rem,calc(100vw-2rem))] items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
	>
		<div class="flex items-center gap-0.5 rounded-full bg-white/5 p-0.5 ring-1 ring-white/5">
			<button
				type="button"
				disabled={!canPrev}
				aria-label="Previous astronaut"
				onclick={onprev}
				class="grid size-9 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-4"
					aria-hidden="true"
				>
					<path d="M15 6l-6 6 6 6" />
				</svg>
			</button>

			{#if crew.length > 0}
				<span class="min-w-10 text-center font-mono text-[0.7rem] text-slate-400 tabular-nums">
					<b class="text-slate-100">{index + 1}</b> / {crew.length}
				</span>
			{/if}

			<button
				type="button"
				disabled={!canNext}
				aria-label="Next astronaut"
				onclick={onnext}
				class="grid size-9 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-4"
					aria-hidden="true"
				>
					<path d="M9 6l6 6-6 6" />
				</svg>
			</button>
		</div>

		{#if crew.length > 0}
			<span class="h-6 w-px bg-white/10" aria-hidden="true"></span>
		{/if}

		<div
			bind:this={viewerEl}
			role="group"
			aria-label="Crew cards"
			class="flex [scrollbar-width:none] items-center gap-1 overflow-x-auto p-0.5 [&::-webkit-scrollbar]:hidden"
		>
			{#each crew as astronaut, i (astronaut.id)}
				{@const active = i === index}
				<button
					type="button"
					data-card={i}
					aria-label={active
						? `Open ${astronautName(astronaut)}'s profile`
						: `Select ${astronautName(astronaut)}`}
					aria-current={active ? 'true' : undefined}
					title={astronautName(astronaut)}
					onclick={() => (active ? onopen() : onselect(i))}
					class="flex h-10 shrink-0 items-center overflow-hidden rounded-full p-1 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none motion-reduce:transition-none {active
						? 'w-[9.5rem] gap-2 bg-white/10 pr-2.5 ring-1 ring-white/20'
						: 'w-10 hover:bg-white/10'}"
				>
					<AstronautAvatar
						{astronaut}
						class="size-8"
						textClass="text-xs"
						ringClass={active ? 'ring-2 ring-teal-300' : 'ring-1 ring-white/20'}
					/>

					<span
						class="flex min-w-0 flex-1 flex-col items-start text-left transition-opacity duration-200 motion-reduce:transition-none {active
							? 'opacity-100'
							: 'opacity-0'}"
					>
						<span class="w-full truncate text-[0.78rem] leading-tight font-semibold">
							{astronaut.first_name}
						</span>
						<span class="w-full truncate text-[0.62rem] text-slate-400">{astronaut.role}</span>
					</span>

					<span
						class="grid size-6 shrink-0 place-items-center rounded-full bg-teal-400/15 text-teal-300 transition-opacity duration-200 motion-reduce:transition-none {active
							? 'opacity-100'
							: 'opacity-0'}"
						aria-hidden="true"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-3.5"
						>
							<path d="M7 17 17 7M9 7h8v8" />
						</svg>
					</span>
				</button>
			{/each}
		</div>

		{#if crew.length > 0}
			<span class="h-6 w-px bg-white/10" aria-hidden="true"></span>
		{/if}

		<button
			type="button"
			onclick={onadd}
			aria-label="Add astronaut"
			class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-teal-400 px-3.5 text-sm font-bold text-teal-950 transition hover:bg-teal-300 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				class="size-4"
				aria-hidden="true"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
			<span class="hidden sm:inline">Add astronaut</span>
		</button>
	</div>
</div>

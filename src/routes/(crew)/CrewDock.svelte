<script lang="ts">
	interface Props {
		total: number;
		index: number;
		canPrev: boolean;
		canNext: boolean;
		onprev: () => void;
		onnext: () => void;
		onselect: (index: number) => void;
		onadd: () => void;
		onopen: () => void;
	}

	let { total, index, canPrev, canNext, onprev, onnext, onselect, onadd, onopen }: Props = $props();

	let dots = $derived(Array.from({ length: total }, (_, i) => i));
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
>
	<div
		class="pointer-events-auto flex max-w-[calc(100vw-2rem)] [scrollbar-width:none] items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl sm:gap-2 [&::-webkit-scrollbar]:hidden"
	>
		<button
			type="button"
			disabled={!canPrev}
			aria-label="Previous astronaut"
			onclick={onprev}
			class="grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-200 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-5"
				aria-hidden="true"
			>
				<path d="M15 6l-6 6 6 6" />
			</svg>
		</button>

		<div class="hidden items-center gap-0.5 sm:flex">
			{#each dots as dot (dot)}
				<button
					type="button"
					aria-label="Go to astronaut {dot + 1}"
					aria-pressed={dot === index}
					onclick={() => onselect(dot)}
					class="grid size-11 shrink-0 place-items-center rounded-full transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
				>
					<span
						class="size-2 rounded-full {dot === index ? 'bg-teal-400' : 'bg-white/30'}"
						aria-hidden="true"
					></span>
				</button>
			{/each}
		</div>

		<button
			type="button"
			disabled={!canNext}
			aria-label="Next astronaut"
			onclick={onnext}
			class="grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-200 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-5"
				aria-hidden="true"
			>
				<path d="M9 6l6 6-6 6" />
			</svg>
		</button>

		<button
			type="button"
			disabled={index < 0}
			onclick={onopen}
			aria-label="View selected astronaut profile"
			class="ml-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none disabled:opacity-40 sm:px-4"
		>
			<span class="hidden sm:inline">View profile</span>
			<span class="sm:hidden">Profile</span>
		</button>

		<button
			type="button"
			onclick={onadd}
			aria-label="Add astronaut"
			class="ml-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-teal-500 px-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none sm:px-4"
		>
			<span aria-hidden="true" class="text-base leading-none">+</span>
			<span class="hidden sm:inline">Add astronaut</span>
			<span class="sm:hidden">Add</span>
		</button>
	</div>
</div>

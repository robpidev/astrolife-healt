<script lang="ts">
	interface Props {
		crewCount: number;
		missionDay: number;
		activeCount: number;
		pendingTotal: number;
		isFullscreen: boolean;
		fullscreenSupported: boolean;
		ontogglefullscreen: () => void;
		onopensettings: () => void;
	}

	let {
		crewCount,
		missionDay,
		activeCount,
		pendingTotal,
		isFullscreen,
		fullscreenSupported,
		ontogglefullscreen,
		onopensettings
	}: Props = $props();
</script>

<header class="relative z-20 flex items-start justify-between gap-4 px-5 pt-5 sm:px-8">
	<div class="min-w-0">
		<p class="font-mono text-xs font-semibold tracking-[0.3em] text-white">ASTROLIFE</p>
		<p class="mt-1 text-xs text-slate-400">Centro de control</p>
		<p class="mt-1 text-[11px] text-teal-300">Datos iniciales ficticios</p>
	</div>

	<div class="flex items-center gap-2">
		<div class="hidden text-right sm:block">
			<p class="font-mono text-[11px] tracking-[0.18em] text-slate-400 uppercase">
				{crewCount}
				{crewCount === 1 ? 'ASTRONAUTA' : 'ASTRONAUTAS'} · DÍA {missionDay}
			</p>
			<p class="mt-1 font-mono text-[10px] tracking-[0.16em] text-slate-500 uppercase">
				{activeCount} activos · {pendingTotal} pendientes
			</p>
		</div>

		<button
			type="button"
			disabled={!fullscreenSupported}
			aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
			onclick={ontogglefullscreen}
			class="grid size-12 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 backdrop-blur transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
		>
			{#if isFullscreen}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-5"
					aria-hidden="true"
				>
					<path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
				</svg>
			{:else}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-5"
					aria-hidden="true"
				>
					<path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
				</svg>
			{/if}
		</button>

		<button
			type="button"
			aria-label="Abrir ajustes"
			onclick={onopensettings}
			class="grid size-12 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 backdrop-blur transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-5"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
				/>
			</svg>
		</button>
	</div>
</header>

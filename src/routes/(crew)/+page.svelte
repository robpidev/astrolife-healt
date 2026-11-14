<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/env';
	import type { Astronaut, CrewTone } from '#lib/interfaces/astronaut.js';
	import type { CrewSettings } from '#lib/interfaces/settings.js';
	import { DEFAULT_CREW_SETTINGS } from '#lib/interfaces/settings.js';
	import {
		astronautName,
		createCrewAstronaut,
		crewTaskProgress,
		levelProgress,
		toggleCrewTask
	} from '#lib/utils/crew.js';
	import { crewTones } from '#lib/utils/crew-theme.js';
	import CrewPoster from './CrewPoster.svelte';
	import CrewInfo from './CrewInfo.svelte';
	import CrewDock from './CrewDock.svelte';
	import AstronautSheet from './AstronautSheet.svelte';
	import AstronautDialog from './AstronautDialog.svelte';
	import SettingsDialog from './SettingsDialog.svelte';
	import type { PageProps } from './$types';

	type Tier = 'center' | 'near' | 'far';
	type DialogMode = 'closed' | 'create' | 'edit';

	interface AstronautValues {
		first_name: string;
		last_name: string;
		role: string;
		tone: CrewTone;
	}

	let { data }: PageProps = $props();

	const initialCrew = untrack(() => data.crew.astronauts);
	const initialNextId = initialCrew.reduce((max, astronaut) => Math.max(max, astronaut.id), 0) + 1;

	// Local working copy: this dashboard is a mockup, so every change stays in
	// memory and is never persisted.
	let crew = $state<Astronaut[]>(untrack(() => data.crew.astronauts));
	let selectedId = $state<number | null>(initialCrew[0]?.id ?? null);
	let settings = $state<CrewSettings>({ ...DEFAULT_CREW_SETTINGS });
	let sheetId = $state<number | null>(null);
	let dialogMode = $state<DialogMode>('closed');
	let settingsOpen = $state(false);
	let announcement = $state('');
	let nextId = $state(initialNextId);
	let isFullscreen = $state(false);
	let railEl = $state<HTMLDivElement | null>(null);

	let selectedIndex = $derived(crew.findIndex((astronaut) => astronaut.id === selectedId));
	let selected = $derived(selectedIndex >= 0 ? (crew[selectedIndex] ?? null) : null);
	let sheetAstronaut = $derived(crew.find((astronaut) => astronaut.id === sheetId) ?? null);
	let pendingTotal = $derived(
		crew.reduce((total, astronaut) => total + crewTaskProgress(astronaut.tasks).pending, 0)
	);
	let activeCount = $derived(crew.filter((astronaut) => astronaut.status !== 'descanso').length);
	let canPrev = $derived(selectedIndex > 0);
	let canNext = $derived(selectedIndex >= 0 && selectedIndex < crew.length - 1);
	let missionDay = $derived(data.crew.summary.mission_day);
	let fullscreenSupported = $derived(browser && document.fullscreenEnabled);

	let railItems = $derived(
		crew.map((astronaut, index) => {
			const distance = selectedIndex < 0 ? 99 : Math.abs(index - selectedIndex);
			const tier: Tier = distance === 0 ? 'center' : distance === 1 ? 'near' : 'far';
			return { astronaut, tier };
		})
	);

	// Keep the focused poster centered in the rail. Effects run after DOM
	// updates, so the newly selected element already exists.
	$effect(() => {
		if (!browser) return;

		const id = selectedId;
		if (id === null) return;

		const rail = railEl;
		if (!rail) return;

		const target = rail.querySelector<HTMLElement>(`[data-astronaut-id="${id}"]`);
		target?.scrollIntoView({
			inline: 'center',
			block: 'nearest',
			// Untracked: toggling the setting should not re-scroll the rail.
			behavior: untrack(() => settings.reduced_motion) ? 'auto' : 'smooth'
		});
	});

	function selectAt(index: number): void {
		const astronaut = crew[index];
		if (!astronaut) return;

		selectedId = astronaut.id;
		announcement = `Seleccionado: ${astronautName(astronaut)}`;
	}

	function moveSelection(delta: number): void {
		if (crew.length === 0) return;

		const current = selectedIndex < 0 ? 0 : selectedIndex;
		const next = Math.min(crew.length - 1, Math.max(0, current + delta));
		const astronaut = crew[next];
		if (!astronaut) return;

		selectedId = astronaut.id;
		announcement = `Seleccionado: ${astronautName(astronaut)}`;

		// Roving focus: Enter after arrowing must act on the new poster, not on
		// the one that still owns DOM focus.
		railEl
			?.querySelector<HTMLElement>(`[data-astronaut-id="${astronaut.id}"] button`)
			?.focus({ preventScroll: true });
	}

	function handleSelect(astronaut: Astronaut): void {
		if (astronaut.id === selectedId) {
			openSheet(astronaut);
			return;
		}

		selectedId = astronaut.id;
		announcement = `Seleccionado: ${astronautName(astronaut)}`;
	}

	function openSheet(astronaut: Astronaut): void {
		selectedId = astronaut.id;
		sheetId = astronaut.id;
		announcement = `Ficha abierta: ${astronautName(astronaut)}`;
	}

	function openSelected(): void {
		if (selected) openSheet(selected);
	}

	function openCreate(): void {
		dialogMode = 'create';
	}

	function openEdit(): void {
		if (selected) dialogMode = 'edit';
	}

	function closeDialog(): void {
		dialogMode = 'closed';
	}

	function handleSheetEdit(): void {
		if (sheetId !== null) selectedId = sheetId;
		sheetId = null;
		dialogMode = 'edit';
	}

	function handleToggle(astronautId: number, taskId: number): void {
		const current = crew.find((astronaut) => astronaut.id === astronautId);
		if (!current) return;

		const before = levelProgress(current.xp_total).level;
		const updated = toggleCrewTask(current, taskId);
		const after = levelProgress(updated.xp_total).level;
		const task = updated.tasks.find((item) => item.id === taskId);

		crew = crew.map((astronaut) => (astronaut.id === astronautId ? updated : astronaut));

		if (after > before) {
			announcement = `¡Nivel ${after}! ${astronautName(updated)} subió de nivel.`;
		} else if (task) {
			announcement = task.done
				? `Tarea completada: ${task.title}, +${task.xp} XP`
				: `Tarea reabierta: ${task.title}`;
		}
	}

	function handleSave(values: AstronautValues): void {
		if (dialogMode === 'create') {
			const astronaut = createCrewAstronaut({ ...values, id: nextId });
			nextId += 1;
			crew = [...crew, astronaut];
			selectedId = astronaut.id;
			announcement = `Tripulante creado: ${astronautName(astronaut)}`;
		} else if (dialogMode === 'edit' && selected) {
			crew = crew.map((astronaut) =>
				astronaut.id === selected.id ? { ...astronaut, ...values } : astronaut
			);
			announcement = `Perfil actualizado: ${values.first_name} ${values.last_name}`;
		}

		dialogMode = 'closed';
	}

	function handleDelete(): void {
		if (!selected) return;
		if (!confirm(`¿Eliminar a ${astronautName(selected)} de la tripulación?`)) return;

		const index = selectedIndex;
		const remaining = crew.filter((astronaut) => astronaut.id !== selected.id);
		crew = remaining;

		const neighbor = remaining[Math.min(index, remaining.length - 1)] ?? null;
		selectedId = neighbor?.id ?? null;
		dialogMode = 'closed';
		announcement = 'Tripulante eliminado de la tripulación.';
	}

	function handleSettingChange(key: keyof CrewSettings, value: boolean): void {
		settings = { ...settings, [key]: value };
	}

	function resetDemo(): void {
		crew = structuredClone(initialCrew);
		settings = { ...DEFAULT_CREW_SETTINGS };
		nextId = initialNextId;
		selectedId = crew[0]?.id ?? null;
		sheetId = null;
		dialogMode = 'closed';
		settingsOpen = false;
		announcement = 'Demo restablecida.';
	}

	async function toggleFullscreen(): Promise<void> {
		if (!browser || !fullscreenSupported) return;

		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			} else {
				await document.documentElement.requestFullscreen();
			}
		} catch {
			// Browsers can reject fullscreen without a user gesture; ignore.
		}
	}

	function handleFullscreenChange(): void {
		isFullscreen = browser && document.fullscreenElement !== null;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (dialogMode !== 'closed' || sheetId !== null || settingsOpen) return;
		if (event.defaultPrevented || event.isComposing) return;
		if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

		const target = event.target;
		if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
			return;
		}

		const onControl =
			target instanceof HTMLElement &&
			target.closest('button, a, [role="button"], [role="switch"], [role="radio"]') !== null;

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			moveSelection(-1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			moveSelection(1);
		} else if (event.key === 'Enter' && selected && !onControl) {
			event.preventDefault();
			openSheet(selected);
		}
	}
</script>

<svelte:head>
	<title>Tripulación · Astrolife · Centro de control</title>
	<meta
		name="description"
		content="Escenario de tripulación: selecciona un astronauta para revisar su nivel, su racha y sus tareas del día."
	/>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />
<svelte:document onfullscreenchange={handleFullscreenChange} />

<div class="relative flex min-h-dvh flex-col overflow-x-hidden text-slate-100">
	<div class="crew-backdrop absolute inset-0" aria-hidden="true"></div>
	<div class="star-field absolute inset-0 opacity-20" aria-hidden="true"></div>
	<div
		class="absolute top-1/3 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px] {selected
			? crewTones[selected.tone].glow
			: 'bg-slate-500/20'} {settings.reduced_motion ? '' : 'transition-colors duration-700'}"
		aria-hidden="true"
	></div>
	<div
		class="absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-slate-950 via-slate-950/80 to-transparent"
		aria-hidden="true"
	></div>

	<h1 class="sr-only">Tripulación</h1>
	<p class="sr-only" aria-live="polite">{announcement}</p>

	<header class="relative z-20 flex items-start justify-between gap-4 px-5 pt-5 sm:px-8">
		<div class="min-w-0">
			<p class="font-mono text-xs font-semibold tracking-[0.3em] text-white">ASTROLIFE</p>
			<p class="mt-1 text-xs text-slate-400">Centro de control</p>
		</div>

		<div class="flex items-center gap-2">
			<div class="hidden text-right sm:block">
				<p class="font-mono text-[11px] tracking-[0.18em] text-slate-400 uppercase">
					{crew.length}
					{crew.length === 1 ? 'ASTRONAUTA' : 'ASTRONAUTAS'} · DÍA {missionDay}
				</p>
				<p class="mt-1 font-mono text-[10px] tracking-[0.16em] text-slate-500 uppercase">
					{activeCount} activos · {pendingTotal} pendientes
				</p>
			</div>

			<button
				type="button"
				disabled={!fullscreenSupported}
				aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
				onclick={toggleFullscreen}
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
				onclick={() => (settingsOpen = true)}
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

	<main class="relative z-10 flex flex-1 flex-col pb-44 sm:pb-40">
		<section aria-labelledby="crew-rail-heading" class="mt-4">
			<h2 id="crew-rail-heading" class="sr-only">Selecciona un astronauta</h2>

			<!--
				The scroll container and the flex track are separate on purpose:
				`justify-center` on an overflowing flex container clips the leading
				items and makes them unreachable. `mx-auto` on a `w-max` track
				centers short crews and collapses to 0 when the rail overflows.
			-->
			<div
				bind:this={railEl}
				class="touch-pan-x snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto py-4 sm:py-6 [&::-webkit-scrollbar]:hidden"
			>
				<ul class="mx-auto flex w-max items-end gap-3 px-5 sm:gap-4 sm:px-8">
					{#if crew.length === 0}
						<li class="shrink-0 snap-center">
							<button
								type="button"
								onclick={openCreate}
								class="flex h-[20rem] w-[min(80vw,21rem)] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/20 bg-white/5 text-slate-300 transition hover:border-teal-400/60 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none sm:h-[29rem]"
							>
								<span
									class="grid size-16 place-items-center rounded-full border border-white/20 text-3xl"
									aria-hidden="true">+</span
								>
								<span class="text-base font-medium">Agregar astronauta</span>
							</button>
						</li>
					{:else}
						{#each railItems as item (item.astronaut.id)}
							<li class="shrink-0 snap-center" data-astronaut-id={item.astronaut.id}>
								<CrewPoster
									astronaut={item.astronaut}
									tier={item.tier}
									selected={item.astronaut.id === selectedId}
									reducedMotion={settings.reduced_motion}
									onselect={handleSelect}
								/>
							</li>
						{/each}

						<li class="shrink-0 snap-center">
							<button
								type="button"
								onclick={openCreate}
								class="flex h-[15rem] w-[min(36vw,13.5rem)] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/20 bg-white/5 text-slate-300 transition hover:border-teal-400/60 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none sm:h-[21rem]"
							>
								<span
									class="grid size-12 place-items-center rounded-full border border-white/20 text-2xl"
									aria-hidden="true">+</span
								>
								<span class="text-sm font-medium">Agregar astronauta</span>
							</button>
						</li>
					{/if}
				</ul>
			</div>
		</section>

		{#if selected}
			<CrewInfo
				astronaut={selected}
				reducedMotion={settings.reduced_motion}
				largeText={settings.large_text}
				highContrast={settings.high_contrast}
				onopen={openSelected}
				onedit={openEdit}
			/>
		{:else}
			<section
				class="relative z-10 mx-auto mt-6 w-full max-w-3xl px-5 sm:px-8"
				aria-labelledby="crew-empty-heading"
			>
				<div
					class="rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur"
				>
					<h2 id="crew-empty-heading" class="text-xl font-semibold tracking-tight text-white">
						Todavía no hay astronautas
					</h2>
					<p class="mx-auto mt-1 max-w-md text-sm text-slate-400">
						Agrega el primer tripulante para empezar a registrar la misión.
					</p>
					<button
						type="button"
						onclick={openCreate}
						class="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
					>
						Agregar astronauta
					</button>
				</div>
			</section>
		{/if}
	</main>

	<CrewDock
		total={crew.length}
		index={selectedIndex}
		{canPrev}
		{canNext}
		onprev={() => moveSelection(-1)}
		onnext={() => moveSelection(1)}
		onselect={selectAt}
		onadd={openCreate}
	/>
</div>

{#if dialogMode !== 'closed'}
	<AstronautDialog
		mode={dialogMode}
		astronaut={dialogMode === 'edit' ? selected : null}
		onclose={closeDialog}
		onsave={handleSave}
		ondelete={dialogMode === 'edit' ? handleDelete : undefined}
	/>
{/if}

{#if settingsOpen}
	<SettingsDialog
		{settings}
		onchange={handleSettingChange}
		onclose={() => (settingsOpen = false)}
		onreset={resetDemo}
	/>
{/if}

<AstronautSheet
	astronaut={sheetAstronaut}
	ontoggle={handleToggle}
	onclose={() => (sheetId = null)}
	onedit={handleSheetEdit}
/>

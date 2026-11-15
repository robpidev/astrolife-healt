<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/env';
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import type { CrewSettings } from '#lib/interfaces/settings.js';
	import { DEFAULT_CREW_SETTINGS } from '#lib/interfaces/settings.js';
	import { astronautName, crewTaskProgress } from '#lib/utils/crew.js';
	import { crewTones } from '#lib/utils/crew-theme.js';
	import CrewPoster from './CrewPoster.svelte';
	import CrewDock from './CrewDock.svelte';
	import AstronautSheet from './AstronautSheet.svelte';
	import AstronautDialog from './AstronautDialog.svelte';
	import SettingsDialog from './SettingsDialog.svelte';
	import type { PageProps } from './$types';

	type DialogMode = 'closed' | 'create' | 'edit';

	let { data }: PageProps = $props();
	const initialCrew = untrack(() => data.crew.astronauts);
	let crew = $derived(data.crew.astronauts);
	let selectedId = $state<number | null>(initialCrew[0]?.id ?? null);
	let settings = $state<CrewSettings>({ ...DEFAULT_CREW_SETTINGS });
	let sheetId = $state<number | null>(null);
	let dialogMode = $state<DialogMode>('closed');
	let settingsOpen = $state(false);
	let announcement = $state('');
	let isFullscreen = $state(false);
	let railEl = $state<HTMLDivElement | null>(null);
	let isDragging = $state(false);

	// The rail's scroll position is driven by a tween instead of the browser's
	// native smooth scroll: native scrolling overshoots when a second scroll
	// starts mid-animation, and it cannot be cancelled cleanly on drag.
	const railScroll = new Tween(0, { duration: 420, easing: cubicOut });

	// Mirror the tween onto the real scroll position every frame.
	$effect(() => {
		const rail = railEl;
		if (!rail) return;
		rail.scrollLeft = railScroll.current;
	});

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
			// 1 = at the rail centre, 0 = far away. Drives scale and opacity.
			const nearness = Math.max(0, 1 - distance / 2.5);
			return { astronaut, distance, nearness, scale: 0.62 + 0.38 * nearness };
		})
	);

	// The dashboard keeps its state in memory, so it resets when we come back
	// from a profile. Re-select the astronaut whose page we just left.
	afterNavigate((navigation) => {
		const from = navigation.from;
		if (from?.route?.id !== '/(crew)/crew/[id]') return;

		const id = Number(from.params?.id);
		if (Number.isInteger(id) && crew.some((astronaut) => astronaut.id === id)) {
			selectedId = id;
		}
	});

	/** Final scale for a card `distance` positions away from the selection. */
	function scaleAt(distance: number): number {
		return 0.62 + 0.38 * Math.max(0, 1 - Math.abs(distance) / 2.5);
	}

	/**
	 * Scrolls the rail so the selected poster ends up centred once every card
	 * has reached its final size. The target is computed from the final
	 * widths, not the current ones, so the tween and the width transition land
	 * on the same spot: the previous centre card shrinks and slides aside while
	 * the new one grows in place.
	 */
	function centerOn(index: number, smooth: boolean): void {
		const rail = railEl;
		if (!rail) return;

		const ul = rail.querySelector<HTMLElement>('ul.crew-rail-track');
		if (!ul) return;

		const items = [...ul.querySelectorAll<HTMLElement>('li[data-astronaut-id]')];
		const first = items[0]?.firstElementChild;
		if (items.length === 0 || !(first instanceof HTMLElement)) return;

		const style = getComputedStyle(ul);
		const gap = parseFloat(style.columnGap) || 0;
		const pad = parseFloat(style.paddingLeft) || 0;
		// The wrapper width is `min(84vw, 23rem) * scale`; recover the base
		// from the viewport instead of the mid-transition measured width.
		const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
		const baseWidth = Math.min(window.innerWidth * 0.84, 23 * rootFont);

		let contentWidth = 0;
		let centre = 0;
		for (let i = 0; i < items.length; i++) {
			const width = baseWidth * scaleAt(i - index);
			if (i === index) centre = pad + contentWidth + width / 2;
			contentWidth += width + gap;
		}
		contentWidth = Math.max(0, contentWidth - gap);

		const max = Math.max(0, 2 * pad + contentWidth - rail.clientWidth);
		const next = Math.max(0, Math.min(max, Math.round(centre - rail.clientWidth / 2)));
		if (Math.abs(next - rail.scrollLeft) < 2) return;

		// Start from the real scroll position: the tween's own value is stale
		// after a manual drag or wheel scroll.
		railScroll.set(rail.scrollLeft, { duration: 0 });
		railScroll.set(next, smooth ? {} : { duration: 0 });
	}

	// Re-centre whenever the selection or the motion setting changes. Widths
	// transition in CSS, so the target is computed for their final values.
	$effect(() => {
		if (!browser) return;

		const index = selectedIndex;
		if (index < 0 || isDragging) return;

		const smooth = !untrack(() => settings.reduced_motion);
		requestAnimationFrame(() => centerOn(index, smooth));
	});

	/**
	 * Touch dragging must win over auto-centring, otherwise the rail snaps back
	 * under the finger. Implemented as an attachment so the scroll container
	 * stays a plain presentational element for assistive tech.
	 */
	function railDrag(node: HTMLElement): () => void {
		const stopTween = (): void => {
			// Taking over the scroll must freeze the tween where the rail is.
			railScroll.set(node.scrollLeft, { duration: 0 });
		};
		const start = (): void => {
			isDragging = true;
			stopTween();
		};
		const end = (): void => {
			if (!isDragging) return;
			isDragging = false;
			if (selectedIndex >= 0) centerOn(selectedIndex, true);
		};

		node.addEventListener('pointerdown', start, { passive: true });
		node.addEventListener('pointerup', end, { passive: true });
		node.addEventListener('pointercancel', end, { passive: true });
		node.addEventListener('pointerleave', end, { passive: true });
		node.addEventListener('wheel', stopTween, { passive: true });

		return () => {
			node.removeEventListener('pointerdown', start);
			node.removeEventListener('pointerup', end);
			node.removeEventListener('pointercancel', end);
			node.removeEventListener('pointerleave', end);
			node.removeEventListener('wheel', stopTween);
		};
	}

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
		// First click selects the poster, second click (anywhere on it) opens
		// the profile page.
		if (astronaut.id === selectedId) {
			goto(resolve('/(crew)/crew/[id]', { id: String(astronaut.id) })).catch(() => {
				// Navigation failures keep the user on the dashboard; nothing to
				// announce because the rail already shows the selected poster.
			});
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

	function handleSettingChange(key: keyof CrewSettings, value: boolean): void {
		settings = { ...settings, [key]: value };
	}

	function resetDemo(): void {
		settings = { ...DEFAULT_CREW_SETTINGS };
		settingsOpen = false;
		announcement = 'Preferencias restablecidas.';
	}

	$effect(() => {
		if (!crew.some((astronaut) => astronaut.id === selectedId)) {
			selectedId = crew[0]?.id ?? null;
		}
	});

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
			<p class="mt-1 text-[11px] text-teal-300">Datos iniciales ficticios</p>
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

	<!--
		The rail owns the space left between the header and the dock. Cards are
		centred on that free area and grow symmetrically from its mid line.
	-->
	<!--
		One poster is pinned to the centre of the free area; the rest ride behind
		it in a scrollable rail. A reserved slot inside the rail keeps the same
		footprint as the pinned poster, so neighbours are never covered.
	-->
	<main class="relative z-10 flex min-h-0 flex-1 flex-col pb-44 sm:pb-40">
		<section aria-labelledby="crew-rail-heading" class="flex min-h-0 flex-1 flex-col">
			<h2 id="crew-rail-heading" class="sr-only">Selecciona un astronauta</h2>

			<div
				bind:this={railEl}
				{@attach railDrag}
				class="relative flex min-h-0 flex-1 touch-pan-x [scrollbar-width:none] items-center overflow-x-auto py-4 sm:py-6 [&::-webkit-scrollbar]:hidden"
			>
				<ul class="crew-rail-track mx-auto flex w-max items-center gap-3 sm:gap-4">
					{#if crew.length === 0}
						<li class="shrink-0">
							<button
								type="button"
								onclick={openCreate}
								class="flex aspect-[3/4] w-[min(84vw,23rem)] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/20 bg-white/5 text-slate-300 transition hover:border-teal-400/60 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
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
							<li
								class="shrink-0"
								data-astronaut-id={item.astronaut.id}
								data-focused={item.astronaut.id === selectedId}
							>
								<div
									class="crew-rail-poster {settings.reduced_motion ? 'crew-rail-instant' : ''}"
									style:--scale={item.scale}
								>
									<CrewPoster
										astronaut={item.astronaut}
										focused={item.astronaut.id === selectedId}
										nearness={item.nearness}
										reducedMotion={settings.reduced_motion}
										onselect={handleSelect}
									/>
								</div>
							</li>
						{/each}

						<li class="shrink-0">
							<button
								type="button"
								onclick={openCreate}
								class="flex aspect-[3/4] w-[min(55vw,16.5rem)] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/20 bg-white/5 text-slate-300 transition hover:border-teal-400/60 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
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
	onclose={() => (sheetId = null)}
	onedit={handleSheetEdit}
/>

<script lang="ts">
	import { untrack } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/env';
	import type { Astronaut } from '#lib/interfaces/astronaut.js';
	import type { CrewSettings } from '#lib/interfaces/settings.js';
	import { DEFAULT_CREW_SETTINGS } from '#lib/interfaces/settings.js';
	import { astronautName, crewTaskProgress } from '#lib/utils/crew.js';
	import { crewTones } from '#lib/utils/crew-theme.js';
	import CrewHeader from './CrewHeader.svelte';
	import CrewRail from './CrewRail.svelte';
	import CrewDock from './CrewDock.svelte';
	import AstronautSheet from './AstronautSheet.svelte';
	import AstronautDialog from './AstronautDialog.svelte';
	import SettingsDialog from './SettingsDialog.svelte';
	import HealthStatusBadge from '#lib/components/health/HealthStatusBadge.svelte';
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
	let focusId = $state<number | null>(null);

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

	let fleetLabel = $derived.by(() => {
		switch (data.health.overall) {
			case 'green':
				return 'All clear';
			case 'yellow':
				return 'Caution';
			case 'red':
				return 'Critical';
			default:
				return 'No data';
		}
	});

	let fleetCounts = $derived.by(() => {
		const counts = [
			{
				key: 'green',
				count: data.health.green,
				label: 'ready',
				tone: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
				dot: 'bg-emerald-400'
			},
			{
				key: 'yellow',
				count: data.health.yellow,
				label: 'caution',
				tone: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
				dot: 'bg-amber-400'
			},
			{
				key: 'red',
				count: data.health.red,
				label: 'critical',
				tone: 'border-rose-300/30 bg-rose-400/10 text-rose-200',
				dot: 'bg-rose-400'
			},
			{
				key: 'unknown',
				count: data.health.unknown,
				label: 'no data',
				tone: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
				dot: 'bg-slate-400'
			}
		];
		const present = counts.filter((entry) => entry.count > 0);
		return present.length > 0
			? present
			: [
					{
						key: 'unknown',
						count: data.health.unknown,
						label: 'no data',
						tone: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
						dot: 'bg-slate-400'
					}
				];
	});

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

	function selectAt(index: number): void {
		const astronaut = crew[index];
		if (!astronaut) return;

		selectedId = astronaut.id;
		announcement = `Selected: ${astronautName(astronaut)}`;
	}

	function moveSelection(delta: number): void {
		if (crew.length === 0) return;

		const current = selectedIndex < 0 ? 0 : selectedIndex;
		const next = Math.min(crew.length - 1, Math.max(0, current + delta));
		const astronaut = crew[next];
		if (!astronaut) return;

		selectedId = astronaut.id;
		announcement = `Selected: ${astronautName(astronaut)}`;

		// Roving focus: Enter after arrowing must act on the new poster, not on
		// the one that still owns DOM focus. The rail watches `focusId`.
		focusId = astronaut.id;
	}

	function handleSelect(astronaut: Astronaut): void {
		// Clicking the enlarged poster opens its profile; any other poster just
		// becomes the selected one.
		if (astronaut.id === selectedId) {
			openProfile(astronaut);
			return;
		}

		selectedId = astronaut.id;
		announcement = `Selected: ${astronautName(astronaut)}`;
	}

	function viewSelectedProfile(): void {
		if (!selected) return;
		openProfile(selected);
	}

	function openProfile(astronaut: Astronaut): void {
		goto(resolve('/(crew)/crew/[id]', { id: String(astronaut.id) })).catch(() => {
			announcement = 'Could not open the astronaut profile.';
		});
	}

	function openSheet(astronaut: Astronaut): void {
		selectedId = astronaut.id;
		sheetId = astronaut.id;
		announcement = `Profile opened: ${astronautName(astronaut)}`;
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
		announcement = 'Preferences reset.';
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
	<title>Crew · Astrolife · Control center</title>
	<meta
		name="description"
		content="Crew scenario: select an astronaut to review their level, streak, and tasks of the day."
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

	<h1 class="sr-only">Crew</h1>
	<p class="sr-only" aria-live="polite">{announcement}</p>

	<CrewHeader
		crewCount={crew.length}
		{missionDay}
		{activeCount}
		{pendingTotal}
		{isFullscreen}
		{fullscreenSupported}
		ontogglefullscreen={toggleFullscreen}
		onopensettings={() => (settingsOpen = true)}
	/>

	<!-- The rail owns the space left between the header and the dock. -->
	<main class="relative z-10 flex min-h-0 flex-1 flex-col pb-44 sm:pb-40">
		<section
			aria-labelledby="fleet-health-heading"
			class="mx-5 mt-4 shrink-0 rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-4 sm:mx-8"
		>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex flex-wrap items-center gap-2.5">
					<h2
						id="fleet-health-heading"
						class="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase"
					>
						Fleet health
					</h2>
					<HealthStatusBadge severity={data.health.overall} label={fleetLabel} />
				</div>
				<ul class="flex flex-wrap items-center gap-2">
					{#each fleetCounts as chip (chip.key)}
						<li
							class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium {chip.tone}"
						>
							<span aria-hidden="true" class="size-1.5 rounded-full {chip.dot}"></span>
							{chip.count}
							{chip.label}
						</li>
					{/each}
				</ul>
			</div>
		</section>
		<CrewRail
			{crew}
			{selectedId}
			reducedMotion={settings.reduced_motion}
			{focusId}
			onselect={handleSelect}
			onadd={openCreate}
		/>
	</main>

	<CrewDock
		{crew}
		index={selectedIndex}
		{canPrev}
		{canNext}
		onprev={() => moveSelection(-1)}
		onnext={() => moveSelection(1)}
		onselect={selectAt}
		onopen={viewSelectedProfile}
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

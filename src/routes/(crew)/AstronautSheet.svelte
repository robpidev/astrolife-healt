<script lang="ts">
	import { browser } from '$app/env';
	import { resolve } from '$app/paths';
	import type { Astronaut, CrewTask } from '#lib/interfaces/astronaut.js';
	import AstronautAvatar from '#lib/components/AstronautAvatar.svelte';
	import CrewTaskIcon from '#lib/components/CrewTaskIcon.svelte';
	import {
		astronautName,
		crewTaskProgress,
		levelProgress,
		pendingCrewTasks,
		xpSegments
	} from '#lib/utils/crew.js';
	import { crewStatuses, crewTaskKinds, crewTones } from '#lib/utils/crew-theme.js';

	interface Props {
		astronaut: Astronaut | null;
		ontoggle: (astronautId: number, taskId: number) => void;
		onclose: () => void;
		onedit: () => void;
	}

	let { astronaut, ontoggle, onclose, onedit }: Props = $props();

	const numberFormat = new Intl.NumberFormat('es', { useGrouping: 'always' });
	const XP_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let announcement = $state('');

	// Single driver for opening/closing. The parent owns `astronaut`, so any
	// user-initiated close only notifies the parent and lets this effect close
	// the native dialog once the prop becomes null. That avoids the reopen race.
	$effect(() => {
		if (!browser) return;

		const dialog = dialogEl;
		if (!dialog) return;

		if (astronaut && !dialog.open) {
			dialog.showModal();
		} else if (!astronaut && dialog.open) {
			dialog.close();
		}
	});

	function requestClose(): void {
		onclose();
	}

	function handleBackdropClick(event: MouseEvent): void {
		// Clicks on the ::backdrop are dispatched to the dialog element itself.
		if (event.target === dialogEl) requestClose();
	}

	function handleDialogClose(): void {
		// Safety net for native closes (Escape). When the parent already cleared
		// the selection this is a no-op.
		if (astronaut) requestClose();
	}

	function toggleTask(task: CrewTask): void {
		const current = astronaut;
		if (!current) return;

		announcement = task.done
			? `Tarea reabierta: ${task.title}`
			: `Tarea completada: ${task.title}, +${task.xp} XP`;
		ontoggle(current.id, task.id);
	}
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby="crew-sheet-title"
	aria-modal="true"
	class="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 p-0 text-slate-100 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm sm:mt-0 sm:mr-0 sm:ml-auto sm:h-dvh sm:max-h-dvh sm:w-full sm:max-w-md sm:rounded-none sm:border-y-0 sm:border-r-0"
	onclick={handleBackdropClick}
	onclose={handleDialogClose}
>
	<p class="sr-only" aria-live="polite">{announcement}</p>

	{#if astronaut}
		{@const tone = crewTones[astronaut.tone]}
		{@const status = crewStatuses[astronaut.status]}
		{@const level = levelProgress(astronaut.xp_total)}
		{@const progress = crewTaskProgress(astronaut.tasks)}
		{@const preview = pendingCrewTasks(astronaut.tasks)}
		{@const filledCells = xpSegments(level.xp, level.xp_next)}
		{@const name = astronautName(astronaut)}
		{@const completionLabel = `${progress.done} de ${progress.total} ${progress.total === 1 ? 'completada' : 'completadas'}`}

		<div class="flex max-h-[88dvh] flex-col sm:h-full sm:max-h-dvh">
			<header
				class="flex shrink-0 items-start gap-3 border-b border-white/10 bg-slate-950 px-5 py-4"
			>
				<AstronautAvatar {astronaut} size="sm" />

				<div class="min-w-0 flex-1">
					<p class="text-[11px] font-semibold tracking-[0.14em] text-teal-300 uppercase">
						Ficha de tripulación
					</p>
					<h2
						id="crew-sheet-title"
						class="mt-1 truncate text-xl font-semibold tracking-tight text-white"
					>
						{name}
					</h2>
					<p class="truncate text-sm text-slate-400">{astronaut.role}</p>
					<span
						class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset {status.pill}"
					>
						<span class="size-1.5 rounded-full {status.dot}" aria-hidden="true"></span>
						{status.label}
					</span>
				</div>

				<button
					type="button"
					class="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
					aria-label="Cerrar ficha"
					onclick={requestClose}
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
						<path d="M6 6l12 12M18 6 6 18" />
					</svg>
				</button>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
				<dl class="grid grid-cols-2 gap-3">
					<div class="rounded-xl border border-white/10 bg-white/5 p-3">
						<dt class="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
							Nivel
						</dt>
						<dd class="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
							{level.level}
						</dd>
					</div>
					<div class="rounded-xl border border-white/10 bg-white/5 p-3">
						<dt class="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
							Racha
						</dt>
						<dd class="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
							{astronaut.streak_days}<span class="text-sm font-medium text-slate-400"
								>&nbsp;{astronaut.streak_days === 1 ? 'día' : 'días'}</span
							>
						</dd>
					</div>
					<div class="rounded-xl border border-white/10 bg-white/5 p-3">
						<dt class="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
							Misiones
						</dt>
						<dd class="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
							{astronaut.missions_completed}
						</dd>
					</div>
					<div class="rounded-xl border border-white/10 bg-white/5 p-3">
						<dt class="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
							Tareas
						</dt>
						<dd class="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
							{progress.done}/{progress.total}
						</dd>
					</div>
				</dl>

				<section class="mt-6" aria-labelledby="crew-sheet-badges">
					<h3
						id="crew-sheet-badges"
						class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase"
					>
						Insignias
					</h3>
					{#if astronaut.badges.length > 0}
						<ul class="mt-2 flex flex-wrap gap-2">
							{#each astronaut.badges as badge (badge)}
								<li
									class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset {tone.chip}"
								>
									{badge}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mt-2 text-sm text-slate-400">Sin insignias todavía.</p>
					{/if}
				</section>

				<section class="mt-6" aria-labelledby="crew-sheet-tasks">
					<div class="flex items-center justify-between gap-3">
						<h3
							id="crew-sheet-tasks"
							class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase"
						>
							Tareas del día
						</h3>
						<span class="text-xs font-medium text-slate-400">
							{completionLabel}
						</span>
					</div>

					{#if astronaut.tasks.length > 0}
						<ul class="mt-3 space-y-2">
							{#each astronaut.tasks as task (task.id)}
								<li>
									<button
										type="button"
										aria-pressed={task.done}
										class="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
										onclick={() => toggleTask(task)}
									>
										{#if task.done}
											<span
												class="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30 ring-inset"
												aria-hidden="true"
											>
												<svg
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="size-4"
												>
													<path d="m5 12.5 4.5 4.5L19 7" />
												</svg>
											</span>
										{:else}
											<span
												class="grid size-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset {crewTaskKinds[
													task.kind
												].chip}"
											>
												<CrewTaskIcon kind={task.kind} />
											</span>
										{/if}

										<span class="min-w-0 flex-1">
											<span
												class="block text-sm font-medium {task.done
													? 'text-slate-500 line-through'
													: 'text-slate-100'}"
											>
												{task.title}
											</span>
											<span class="mt-0.5 block text-xs text-slate-400">
												{crewTaskKinds[task.kind].label}
											</span>
										</span>

										<span
											class="shrink-0 font-mono text-xs font-medium tabular-nums {task.done
												? 'text-slate-500'
												: 'text-teal-300'}"
										>
											{task.done ? 'Completada' : `+${task.xp} XP`}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-400">
							Sin tareas programadas para hoy.
						</p>
					{/if}

					{#if preview.length === 0 && astronaut.tasks.length > 0}
						<p
							class="mt-3 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-400/30 ring-inset"
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-4 shrink-0"
								aria-hidden="true"
							>
								<path d="m5 12.5 4.5 4.5L19 7" />
							</svg>
							Todo completado por hoy
						</p>
					{/if}
				</section>

				<section class="mt-6" aria-labelledby="crew-sheet-xp">
					<div class="flex items-end justify-between gap-3">
						<h3
							id="crew-sheet-xp"
							class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase"
						>
							Progreso de nivel
						</h3>
						<span class="font-mono text-xs font-medium text-slate-400 tabular-nums">
							{numberFormat.format(level.xp)} / {numberFormat.format(level.xp_next)} XP
						</span>
					</div>
					<div class="mt-2 flex gap-1" aria-hidden="true">
						{#each XP_CELLS as cell (cell)}
							<span
								class="h-1.5 w-full rounded-full {cell < filledCells ? tone.bar : 'bg-white/15'}"
							></span>
						{/each}
					</div>
				</section>

				<p class="mt-6 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-400">
					Vista previa: los cambios no se guardan todavía.
				</p>

				<div class="mt-3 grid gap-2">
					<button
						type="button"
						class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
						onclick={onedit}
					>
						Editar perfil
					</button>

					<a
						href={resolve('/(app)/mediciones')}
						class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
					>
						Ver historial de salud
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
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</a>
				</div>
			</div>
		</div>
	{/if}
</dialog>

<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/env';
	import { CREW_ROLES } from '#lib/interfaces/astronaut.js';
	import type { Astronaut, CrewTone } from '#lib/interfaces/astronaut.js';
	import { crewTones } from '#lib/utils/crew-theme.js';

	interface Values {
		first_name: string;
		last_name: string;
		role: string;
		tone: CrewTone;
	}

	interface Props {
		mode: 'create' | 'edit';
		astronaut: Astronaut | null;
		onclose: () => void;
		onsave: (values: Values) => void;
		ondelete?: () => void;
	}

	let { mode, astronaut, onclose, onsave, ondelete }: Props = $props();

	const TONES: CrewTone[] = ['indigo', 'cyan', 'violet', 'amber', 'emerald'];
	const TONE_LABELS: Record<CrewTone, string> = {
		indigo: 'Índigo',
		cyan: 'Cian',
		violet: 'Violeta',
		amber: 'Ámbar',
		emerald: 'Esmeralda'
	};

	// The dialog is mounted only while open, so seeding from the current
	// astronaut once is intentional; untrack keeps the compiler from treating
	// the prop as a live dependency of the form state.
	let first_name = $state(untrack(() => astronaut?.first_name ?? ''));
	let last_name = $state(untrack(() => astronaut?.last_name ?? ''));
	let role = $state(untrack(() => astronaut?.role ?? ''));
	let tone = $state<CrewTone>(untrack(() => astronaut?.tone ?? 'indigo'));
	let errors = $state<{ first_name?: string; last_name?: string; role?: string }>({});

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!browser) return;

		const dialog = dialogEl;
		if (dialog && !dialog.open) dialog.showModal();
	});

	function requestClose(): void {
		onclose();
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl) requestClose();
	}

	function handleDialogClose(): void {
		onclose();
	}

	function handleToneKeydown(event: KeyboardEvent): void {
		const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
		if (!keys.includes(event.key)) return;

		event.preventDefault();
		const current = TONES.indexOf(tone);
		const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
		const next =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? TONES.length - 1
					: (current + delta + TONES.length) % TONES.length;

		tone = TONES[next];
		(event.currentTarget as HTMLElement)
			.closest('[role="radiogroup"]')
			?.querySelector<HTMLButtonElement>(`[data-tone="${TONES[next]}"]`)
			?.focus();
	}

	function submit(): void {
		const next: typeof errors = {};
		if (!first_name.trim()) next.first_name = 'Ingresa el nombre.';
		if (!last_name.trim()) next.last_name = 'Ingresa el apellido.';
		if (!role) next.role = 'Selecciona un rol.';

		errors = next;
		if (Object.keys(next).length > 0) return;

		onsave({
			first_name: first_name.trim(),
			last_name: last_name.trim(),
			role,
			tone
		});
	}
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby="astronaut-dialog-title"
	aria-modal="true"
	class="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 p-0 text-slate-100 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-3xl"
	onclick={handleBackdropClick}
	onclose={handleDialogClose}
>
	<div class="flex max-h-[90dvh] flex-col">
		<header
			class="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6"
		>
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.14em] text-teal-300 uppercase">
					{mode === 'create' ? 'Nuevo tripulante' : 'Editar perfil'}
				</p>
				<h2
					id="astronaut-dialog-title"
					class="mt-1 text-xl font-semibold tracking-tight text-white"
				>
					{mode === 'create' ? 'Agregar astronauta' : 'Editar astronauta'}
				</h2>
			</div>
			<button
				type="button"
				class="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
				aria-label="Cerrar"
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

		<form
			class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
			onsubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="astronaut-first-name" class="block text-sm font-medium text-slate-200">
						Nombre
					</label>
					<input
						id="astronaut-first-name"
						name="first_name"
						type="text"
						bind:value={first_name}
						autocomplete="given-name"
						aria-invalid={errors.first_name ? 'true' : undefined}
						aria-describedby={errors.first_name ? 'astronaut-first-name-error' : undefined}
						class="mt-1 block min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
					/>
					{#if errors.first_name}
						<p id="astronaut-first-name-error" class="mt-1 text-xs text-rose-300">
							{errors.first_name}
						</p>
					{/if}
				</div>

				<div>
					<label for="astronaut-last-name" class="block text-sm font-medium text-slate-200">
						Apellido
					</label>
					<input
						id="astronaut-last-name"
						name="last_name"
						type="text"
						bind:value={last_name}
						autocomplete="family-name"
						aria-invalid={errors.last_name ? 'true' : undefined}
						aria-describedby={errors.last_name ? 'astronaut-last-name-error' : undefined}
						class="mt-1 block min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
					/>
					{#if errors.last_name}
						<p id="astronaut-last-name-error" class="mt-1 text-xs text-rose-300">
							{errors.last_name}
						</p>
					{/if}
				</div>
			</div>

			<div class="mt-4">
				<label for="astronaut-role" class="block text-sm font-medium text-slate-200">Rol</label>
				<select
					id="astronaut-role"
					name="role"
					bind:value={role}
					aria-invalid={errors.role ? 'true' : undefined}
					aria-describedby={errors.role ? 'astronaut-role-error' : undefined}
					class="mt-1 block min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white focus:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
				>
					<option value="" disabled>Selecciona un rol</option>
					{#each CREW_ROLES as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
				{#if errors.role}
					<p id="astronaut-role-error" class="mt-1 text-xs text-rose-300">{errors.role}</p>
				{/if}
			</div>

			<fieldset class="mt-5">
				<legend class="text-sm font-medium text-slate-200">Tono</legend>
				<div role="radiogroup" aria-label="Tono del perfil" class="mt-2 flex flex-wrap gap-2">
					{#each TONES as option (option)}
						<button
							type="button"
							role="radio"
							aria-checked={tone === option}
							aria-label={TONE_LABELS[option]}
							tabindex={tone === option ? 0 : -1}
							data-tone={option}
							onkeydown={handleToneKeydown}
							onclick={() => (tone = option)}
							class="grid size-11 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-slate-950 transition focus-visible:ring-teal-400 focus-visible:outline-none {crewTones[
								option
							].bar} {tone === option ? 'ring-white' : 'ring-transparent'}"
						>
							{#if tone === option}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="size-5 text-white"
									aria-hidden="true"
								>
									<path d="m5 12.5 4.5 4.5L19 7" />
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			</fieldset>

			<p class="mt-5 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-400">
				Vista previa: los cambios no se guardan todavía.
			</p>

			<div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					{#if mode === 'edit' && ondelete}
						<button
							type="button"
							class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rose-400/30 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/10 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none sm:w-auto"
							onclick={() => ondelete?.()}
						>
							Eliminar tripulante
						</button>
					{/if}
				</div>

				<div class="flex flex-col-reverse gap-2 sm:flex-row">
					<button
						type="button"
						class="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
						onclick={requestClose}
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
					>
						{mode === 'create' ? 'Crear tripulante' : 'Guardar cambios'}
					</button>
				</div>
			</div>
		</form>
	</div>
</dialog>

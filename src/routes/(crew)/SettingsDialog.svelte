<script lang="ts">
	import { browser } from '$app/env';
	import type { CrewSettings } from '#lib/interfaces/settings.js';

	interface Props {
		settings: CrewSettings;
		onchange: (key: keyof CrewSettings, value: boolean) => void;
		onclose: () => void;
		onreset: () => void;
	}

	let { settings, onchange, onclose, onreset }: Props = $props();

	type ToggleKey = Exclude<keyof CrewSettings, 'large_text'>;

	interface ToggleRow {
		key: ToggleKey;
		label: string;
		description: string;
	}

	const APPEARANCE: ToggleRow[] = [
		{
			key: 'reduced_motion',
			label: 'Reducir movimiento',
			description: 'Desactiva transiciones y animaciones del escenario.'
		},
		{
			key: 'high_contrast',
			label: 'Alto contraste',
			description: 'Refuerza textos y bordes para pantallas con luz directa.'
		}
	];

	const SOUND: ToggleRow[] = [
		{
			key: 'sound',
			label: 'Sonidos de interfaz',
			description: 'Reproduce un tono al completar tareas.'
		}
	];

	const KIOSK: ToggleRow[] = [
		{
			key: 'keep_awake',
			label: 'Mantener despierto',
			description: 'Evita que la pantalla se apague en modo kiosco.'
		},
		{
			key: 'kiosk_lock',
			label: 'Bloqueo de kiosco',
			description: 'Oculta salidas de navegación mientras la demo está activa.'
		}
	];

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
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby="settings-dialog-title"
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
					Centro de control
				</p>
				<h2 id="settings-dialog-title" class="mt-1 text-xl font-semibold tracking-tight text-white">
					Ajustes de la vista
				</h2>
			</div>
			<button
				type="button"
				class="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
				aria-label="Cerrar ajustes"
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

		<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
			<section aria-labelledby="settings-appearance">
				<h3
					id="settings-appearance"
					class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					Apariencia
				</h3>

				<div class="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
					{#each APPEARANCE as row (row.key)}
						<div class="flex items-center justify-between gap-4 px-4 py-2">
							<div class="min-w-0">
								<p class="text-sm font-medium text-slate-100">{row.label}</p>
								<p class="text-xs text-slate-400">{row.description}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={settings[row.key]}
								aria-label={row.label}
								onclick={() => onchange(row.key, !settings[row.key])}
								class="relative inline-flex h-11 w-14 shrink-0 items-center rounded-full border border-white/10 transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none {settings[
									row.key
								]
									? 'bg-teal-500/30'
									: 'bg-slate-800'}"
							>
								<span
									class="absolute top-1/2 left-0 size-7 -translate-y-1/2 rounded-full transition-transform {settings[
										row.key
									]
										? 'translate-x-6 bg-teal-400'
										: 'translate-x-2 bg-slate-500'}"
									aria-hidden="true"
								></span>
							</button>
						</div>
					{/each}

					<div class="flex items-center justify-between gap-4 px-4 py-2">
						<div class="min-w-0">
							<p class="text-sm font-medium text-slate-100">Tamaño de texto</p>
							<p class="text-xs text-slate-400">Amplía el nombre y el detalle del perfil.</p>
						</div>
						<div
							role="group"
							aria-label="Tamaño de texto"
							class="flex shrink-0 gap-1 rounded-xl border border-white/10 bg-slate-900 p-1"
						>
							<button
								type="button"
								aria-pressed={!settings.large_text}
								onclick={() => onchange('large_text', false)}
								class="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none {!settings.large_text
									? 'bg-teal-500 text-slate-950'
									: 'text-slate-300 hover:bg-white/10'}"
							>
								Normal
							</button>
							<button
								type="button"
								aria-pressed={settings.large_text}
								onclick={() => onchange('large_text', true)}
								class="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none {settings.large_text
									? 'bg-teal-500 text-slate-950'
									: 'text-slate-300 hover:bg-white/10'}"
							>
								Grande
							</button>
						</div>
					</div>
				</div>
			</section>

			<section class="mt-5" aria-labelledby="settings-sound">
				<h3
					id="settings-sound"
					class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					Sonido
				</h3>
				<div class="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
					{#each SOUND as row (row.key)}
						<div class="flex items-center justify-between gap-4 px-4 py-2">
							<div class="min-w-0">
								<p class="text-sm font-medium text-slate-100">{row.label}</p>
								<p class="text-xs text-slate-400">{row.description}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={settings[row.key]}
								aria-label={row.label}
								onclick={() => onchange(row.key, !settings[row.key])}
								class="relative inline-flex h-11 w-14 shrink-0 items-center rounded-full border border-white/10 transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none {settings[
									row.key
								]
									? 'bg-teal-500/30'
									: 'bg-slate-800'}"
							>
								<span
									class="absolute top-1/2 left-0 size-7 -translate-y-1/2 rounded-full transition-transform {settings[
										row.key
									]
										? 'translate-x-6 bg-teal-400'
										: 'translate-x-2 bg-slate-500'}"
									aria-hidden="true"
								></span>
							</button>
						</div>
					{/each}
				</div>
			</section>

			<section class="mt-5" aria-labelledby="settings-kiosk">
				<h3
					id="settings-kiosk"
					class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					Kiosco
				</h3>
				<div class="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
					{#each KIOSK as row (row.key)}
						<div class="flex items-center justify-between gap-4 px-4 py-2">
							<div class="min-w-0">
								<p class="text-sm font-medium text-slate-100">{row.label}</p>
								<p class="text-xs text-slate-400">{row.description}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={settings[row.key]}
								aria-label={row.label}
								onclick={() => onchange(row.key, !settings[row.key])}
								class="relative inline-flex h-11 w-14 shrink-0 items-center rounded-full border border-white/10 transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none {settings[
									row.key
								]
									? 'bg-teal-500/30'
									: 'bg-slate-800'}"
							>
								<span
									class="absolute top-1/2 left-0 size-7 -translate-y-1/2 rounded-full transition-transform {settings[
										row.key
									]
										? 'translate-x-6 bg-teal-400'
										: 'translate-x-2 bg-slate-500'}"
									aria-hidden="true"
								></span>
							</button>
						</div>
					{/each}
				</div>
			</section>

			<section class="mt-5" aria-labelledby="settings-data">
				<h3
					id="settings-data"
					class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase"
				>
					Datos
				</h3>
				<div class="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
					<p class="text-sm text-slate-300">
						Restablecer las preferencias recupera el
						estado inicial.
					</p>
					<button
						type="button"
						class="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none sm:w-auto"
						onclick={onreset}
					>
						Restablecer preferencias
					</button>
				</div>
			</section>

			<p class="mt-5 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-400">
				Vista previa: los ajustes no se guardan todavía.
			</p>
		</div>
	</div>
</dialog>

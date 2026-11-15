<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { healthAreas } from '#lib/data/healthAreas.js';
	import MeasurementTabs from '#lib/components/navigation/MeasurementTabs.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const area = healthAreas.find((area) => area.id === 'cardiovascular')!;
	const fields = [
		{ name: 'heart_rate', label: 'Frecuencia cardíaca', unit: 'lpm', min: 20, max: 250, step: '1' },
		{ name: 'systolic', label: 'Presión sistólica', unit: 'mmHg', min: 40, max: 300, step: '1' },
		{ name: 'diastolic', label: 'Presión diastólica', unit: 'mmHg', min: 20, max: 200, step: '1' },
		{ name: 'spo2', label: 'Saturación de oxígeno', unit: '%', min: 0, max: 100, step: 'any' }
	];
	let basePath = $derived('/crew/' + data.astronaut.id + '/measurements/cardiovascular');
	const registrations = [
		{ route: 'heart-rate', code: 'heart_rate', title: 'Frecuencia cardíaca', fields: ['heart_rate'] },
		{ route: 'blood-pressure', code: 'blood_pressure', title: 'Presión arterial', fields: ['systolic', 'diastolic'] },
		{ route: 'oxygen', code: 'spo2', title: 'Saturación de oxígeno', fields: ['spo2'] }
	];
	let activeMetric = $derived(registrations.find((registration) => page.url.pathname === basePath + '/' + registration.route) ?? null);
	let visibleFields = $derived(fields.filter((field) => activeMetric?.fields.includes(field.name)));
	let dialog = $state<HTMLDialogElement | null>(null);
	let registrationForm = $state<HTMLFormElement | null>(null);
	let pending = $state(false);
	let errors = $state<Record<string, string>>({});
	let requestError = $state('');
	let successMessage = $state('');
	let warningMessage = $state('');

	let previousPath = '';

	$effect(() => {
		// Reset only on navigation, never when opening the dialog or editing fields.
		const pathname = page.url.pathname;
		if (pathname === previousPath) return;
		previousPath = pathname;
		untrack(() => {
			dialog?.close();
			registrationForm?.reset();
			errors = {};
			requestError = '';
			successMessage = '';
			warningMessage = '';
		});
	});

	function openDialog(): void {
		if (!activeMetric || pending) return;
		errors = {};
		requestError = '';
		successMessage = '';
			warningMessage = '';
		dialog?.showModal();
	}

	const register: SubmitFunction = ({ cancel }) => {
		if (!activeMetric || pending) {
			cancel();
			return;
		}
		const submissionPath = page.url.pathname;
		pending = true;
		errors = {};
		requestError = '';

		return async ({ result, formElement }) => {
			try {
				if (page.url.pathname !== submissionPath) {
					if (result.type === 'success' && result.data?.success) await invalidateAll();
					return;
				}
				if (result.type === 'failure') {
					const validationErrors: unknown = result.data?.errors;
					if (validationErrors && typeof validationErrors === 'object') {
						errors = Object.fromEntries(
							Object.entries(validationErrors).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
						);
					}
					requestError = 'Revisa los campos indicados antes de guardar.';
				} else if (result.type === 'success' && result.data?.success) {
					warningMessage = typeof result.data.warning === 'string' ? result.data.warning : '';
					formElement.reset();
					dialog?.close();
					successMessage = 'La información de hoy se registró correctamente.';
					try {
						await invalidateAll();
					} catch {
						successMessage = 'La información se guardó. Recarga la página para actualizar las mediciones.';
					}
				} else {
					requestError = 'No se pudo guardar la información. Inténtalo de nuevo.';
				}
			} catch {
				requestError = 'No se pudieron actualizar las mediciones. Recarga la página para comprobar el registro.';
				successMessage = '';
			warningMessage = '';
			} finally {
				pending = false;
			}
		};
	};
</script>

<div>
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-slate-400">Seguimiento cardiovascular</p>
		{#if activeMetric}
		<button
			type="button"
			disabled={pending}
			onclick={openDialog}
			class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
		>
			<span aria-hidden="true" class="text-lg">+</span>
			Registrar información de hoy
		</button>
		{/if}
	</div>
	{#if successMessage}
		<p role="status" class="mb-5 rounded-xl border border-cyan-200/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">{successMessage}</p>
	{/if}
	{#if warningMessage}
		<p role="status" class="mb-5 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm leading-relaxed text-amber-100">{warningMessage}</p>
	{/if}
	<MeasurementTabs {basePath} tabs={area.metrics} />
	{@render children()}
</div>

{#if activeMetric}
<dialog
	bind:this={dialog}
	aria-labelledby="cardiovascular-register-title"
	aria-describedby="cardiovascular-register-description"
	oncancel={(event) => { if (pending) event.preventDefault(); }}
	class="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-cyan-200/25 bg-[#0b1729] p-0 text-slate-100 shadow-2xl shadow-black/60"
>
	<div class="p-5 sm:p-7">
		<header class="mb-6 flex items-start justify-between gap-4">
			<div>
				<p class="mb-2 text-xs tracking-widest text-cyan-300 uppercase">Registro cardiovascular</p>
				<h2 id="cardiovascular-register-title" class="text-xl font-semibold">{activeMetric.title} de hoy</h2>
				<p id="cardiovascular-register-description" class="mt-2 text-sm leading-relaxed text-slate-400">{activeMetric.code === 'blood_pressure' ? 'Completa la presión sistólica y diastólica para registrar la presión arterial de hoy.' : 'Completa la lectura para registrar ' + activeMetric.title.toLowerCase() + ' de hoy.'}</p>
			</div>
			<button
				type="button"
				disabled={pending}
				onclick={() => dialog?.close()}
				aria-label="Cerrar registro"
				class="grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 text-xl text-slate-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"
			>×</button>
		</header>
		<form bind:this={registrationForm} method="POST" action={basePath + '?/register'} use:enhance={register} aria-busy={pending}>
			<input type="hidden" name="metric_code" value={activeMetric.code} />
			{#if errors.metric_code}<p role="alert" class="mb-3 text-sm text-rose-200">{errors.metric_code}</p>{/if}
			{#if requestError}
				<p role="alert" class="mb-5 rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-200">{requestError}</p>
			{/if}
			<fieldset disabled={pending} class="grid gap-5 sm:grid-cols-2">
				<legend class="sr-only">{activeMetric.title} de hoy</legend>
				{#each visibleFields as field (field.name)}
					<div>
						<label for={'register-' + field.name} class="mb-2 block text-sm font-medium text-slate-200">{field.label} <span class="font-normal text-slate-500">({field.unit})</span></label>
						<input
							id={'register-' + field.name}
							name={field.name}
							type="number"
							required
							min={field.min}
							max={field.max}
							step={field.step}
							inputmode="decimal"
							aria-invalid={Boolean(errors[field.name])}
							aria-describedby={errors[field.name] ? 'error-' + field.name : undefined}
							class="min-h-11 w-full rounded-lg border border-cyan-200/20 bg-slate-950/70 px-3 py-2 text-slate-100 focus:border-cyan-300 focus:ring-cyan-300 disabled:opacity-60"
						/>
						{#if errors[field.name]}<p id={'error-' + field.name} class="mt-2 text-sm text-rose-200">{errors[field.name]}</p>{/if}
					</div>
				{/each}
			</fieldset>
			<div class="mt-7 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
				<button type="button" disabled={pending} onclick={() => dialog?.close()} class="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50">Cancelar</button>
				<button type="submit" disabled={pending} class="min-h-11 rounded-lg bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-60">{pending ? 'Guardando…' : 'Guardar información'}</button>
			</div>
		</form>
	</div>
</dialog>
{/if}

<style>
	dialog[open] {
		animation: expand-dialog 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	dialog::backdrop {
		background: rgb(2 6 23 / 78%);
		backdrop-filter: blur(6px);
		animation: reveal-backdrop 180ms ease-out both;
	}

	@keyframes expand-dialog {
		from { opacity: 0; transform: translateY(14px) scale(0.92); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	@keyframes reveal-backdrop {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		dialog[open], dialog::backdrop { animation: none; }
	}
</style>

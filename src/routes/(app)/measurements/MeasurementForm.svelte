<script lang="ts">
	import { enhance } from '#lib/forms/enhance.js';
	import { invalidateAll } from '$app/navigation';
	import type {
		MeasurementActionData,
		MeasurementFormValues,
		MeasurementWithBmi
	} from '#lib/interfaces/measurement.js';

	let {
		measurement = null,
		today,
		form = null,
		onSaved = () => {},
		onCancel = () => {}
	}: {
		measurement?: MeasurementWithBmi | null;
		today: string;
		form?: MeasurementActionData | null;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	const uid = $props.id();

	let submitting = $state(false);
	let formElement: HTMLFormElement;

	let action = $derived(measurement ? '?/update' : '?/create');
	let isEditing = $derived(measurement !== null);

	function initialValues(): MeasurementFormValues {
		return (
			form?.values ?? {
				measured_at: measurement?.measured_at ?? today,
				mass_kg: measurement ? String(measurement.mass_kg) : '',
				height_cm: measurement ? String(measurement.height_cm) : '',
				systolic: measurement?.systolic != null ? String(measurement.systolic) : '',
				diastolic: measurement?.diastolic != null ? String(measurement.diastolic) : '',
				pulse: measurement?.pulse != null ? String(measurement.pulse) : '',
				notes: measurement?.notes ?? ''
			}
		);
	}

	let values = $state<MeasurementFormValues>(initialValues());

	let errors = $derived(form?.errors ?? {});

	$effect(() => {
		if (!form?.errors) return;

		const firstInvalid = formElement?.querySelector<HTMLElement>('[aria-invalid="true"]');
		firstInvalid?.focus();
	});

	const inputClass =
		'mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 focus:outline-none aria-invalid:border-rose-400 aria-invalid:focus:border-rose-500 aria-invalid:focus:ring-rose-500/30';
	const labelClass = 'block text-sm font-medium text-slate-700';
	const optionalClass = 'ml-1 text-xs font-normal text-slate-500';
</script>

<form
	method="POST"
	{action}
	bind:this={formElement}
	use:enhance={() => {
		submitting = true;

		return async ({ result, update }) => {
			try {
				await update();
				if (result.type === 'success') {
					onSaved();
					await invalidateAll();
				}
			} finally {
				submitting = false;
			}
		};
	}}
	class="space-y-5"
>
	{#if isEditing && measurement}
		<input type="hidden" name="id" value={measurement.id} />
	{/if}

	{#if form?.error}
		<div
			role="alert"
			class="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mt-0.5 size-4 shrink-0"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 8v4M12 16h.01" />
			</svg>
			<p>{form.error}</p>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div>
			<label for="{uid}-measured_at" class={labelClass}>Date</label>
			<input
				id="{uid}-measured_at"
				name="measured_at"
				type="date"
				required
				max={today}
				bind:value={values.measured_at}
				aria-invalid={errors.measured_at ? 'true' : undefined}
				aria-describedby={errors.measured_at ? `${uid}-measured_at-error` : undefined}
				class={inputClass}
			/>
			{#if errors.measured_at}
				<p id="{uid}-measured_at-error" role="alert" class="mt-1.5 text-sm text-rose-600">
					{errors.measured_at}
				</p>
			{/if}
		</div>

		<div>
			<label for="{uid}-mass_kg" class={labelClass}>Mass</label>
			<div class="relative">
				<input
					id="{uid}-mass_kg"
					name="mass_kg"
					type="number"
					required
					step="0.1"
					min="1"
					max="500"
					inputmode="decimal"
					placeholder="72.5"
					bind:value={values.mass_kg}
					aria-invalid={errors.mass_kg ? 'true' : undefined}
					aria-describedby={errors.mass_kg ? `${uid}-mass_kg-error` : undefined}
					class="{inputClass} pr-10"
				/>
				<span
					class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500"
					aria-hidden="true">kg</span
				>
			</div>
			{#if errors.mass_kg}
				<p id="{uid}-mass_kg-error" role="alert" class="mt-1.5 text-sm text-rose-600">
					{errors.mass_kg}
				</p>
			{/if}
		</div>

		<div>
			<label for="{uid}-height_cm" class={labelClass}>Height</label>
			<div class="relative">
				<input
					id="{uid}-height_cm"
					name="height_cm"
					type="number"
					required
					step="0.1"
					min="30"
					max="300"
					inputmode="decimal"
					placeholder="170"
					bind:value={values.height_cm}
					aria-invalid={errors.height_cm ? 'true' : undefined}
					aria-describedby={errors.height_cm ? `${uid}-height_cm-error` : undefined}
					class="{inputClass} pr-10"
				/>
				<span
					class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500"
					aria-hidden="true">cm</span
				>
			</div>
			{#if errors.height_cm}
				<p id="{uid}-height_cm-error" role="alert" class="mt-1.5 text-sm text-rose-600">
					{errors.height_cm}
				</p>
			{/if}
		</div>

		<div>
			<label for="{uid}-systolic" class={labelClass}>
				Systolic pressure <span class={optionalClass}>optional</span>
			</label>
			<div class="relative">
				<input
					id="{uid}-systolic"
					name="systolic"
					type="number"
					step="1"
					min="40"
					max="300"
					inputmode="numeric"
					placeholder="120"
					bind:value={values.systolic}
					aria-invalid={errors.systolic ? 'true' : undefined}
					aria-describedby={errors.systolic ? `${uid}-systolic-error` : undefined}
					class="{inputClass} pr-14"
				/>
				<span
					class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500"
					aria-hidden="true">mmHg</span
				>
			</div>
			{#if errors.systolic}
				<p id="{uid}-systolic-error" role="alert" class="mt-1.5 text-sm text-rose-600">
					{errors.systolic}
				</p>
			{/if}
		</div>

		<div>
			<label for="{uid}-diastolic" class={labelClass}>
				Diastolic pressure <span class={optionalClass}>optional</span>
			</label>
			<div class="relative">
				<input
					id="{uid}-diastolic"
					name="diastolic"
					type="number"
					step="1"
					min="20"
					max="200"
					inputmode="numeric"
					placeholder="80"
					bind:value={values.diastolic}
					aria-invalid={errors.diastolic ? 'true' : undefined}
					aria-describedby={errors.diastolic ? `${uid}-diastolic-error` : undefined}
					class="{inputClass} pr-14"
				/>
				<span
					class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500"
					aria-hidden="true">mmHg</span
				>
			</div>
			{#if errors.diastolic}
				<p id="{uid}-diastolic-error" role="alert" class="mt-1.5 text-sm text-rose-600">
					{errors.diastolic}
				</p>
			{/if}
		</div>

		<div>
			<label for="{uid}-pulse" class={labelClass}>
				Pulse <span class={optionalClass}>optional</span>
			</label>
			<div class="relative">
				<input
					id="{uid}-pulse"
					name="pulse"
					type="number"
					step="1"
					min="20"
					max="250"
					inputmode="numeric"
					placeholder="72"
					bind:value={values.pulse}
					aria-invalid={errors.pulse ? 'true' : undefined}
					aria-describedby={errors.pulse ? `${uid}-pulse-error` : undefined}
					class="{inputClass} pr-12"
				/>
				<span
					class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500"
					aria-hidden="true">bpm</span
				>
			</div>
			{#if errors.pulse}
				<p id="{uid}-pulse-error" role="alert" class="mt-1.5 text-sm text-rose-600">
					{errors.pulse}
				</p>
			{/if}
		</div>

		<div class="sm:col-span-2 lg:col-span-3">
			<label for="{uid}-notes" class={labelClass}>
				Notes <span class={optionalClass}>optional</span>
			</label>
			<textarea
				id="{uid}-notes"
				name="notes"
				rows="3"
				maxlength="500"
				placeholder="Feelings, context, or routine changes"
				bind:value={values.notes}
				aria-invalid={errors.notes ? 'true' : undefined}
				aria-describedby="{uid}-notes-help{errors.notes ? ` ${uid}-notes-error` : ''}"
				class="{inputClass} resize-y"></textarea>
			<div class="mt-1.5 flex items-center justify-between gap-3">
				<p id="{uid}-notes-help" class="text-xs text-slate-500">Maximum 500 characters</p>
				<p class="text-xs text-slate-500 tabular-nums" aria-hidden="true">
					{values.notes.length}/500
				</p>
			</div>
			{#if errors.notes}
				<p id="{uid}-notes-error" role="alert" class="mt-1 text-sm text-rose-600">{errors.notes}</p>
			{/if}
		</div>
	</div>

	<div
		class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end"
	>
		{#if isEditing}
			<button
				type="button"
				onclick={onCancel}
				class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none"
			>
				Cancel
			</button>
		{/if}
		<button
			type="submit"
			disabled={submitting}
			aria-busy={submitting}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-teal-600/60"
		>
			{#if submitting}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					class="size-4 animate-spin"
					aria-hidden="true"
				>
					<path d="M12 3a9 9 0 1 0 9 9" />
				</svg>
			{/if}
			{submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Save measurement'}
		</button>
	</div>
</form>

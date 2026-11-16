<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { MedicalProfile, MedicalProfileInput } from '#lib/interfaces/medical-profile.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const timestampFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	let profile: MedicalProfile | null = $derived(data.profile);
	let values = $derived(form && 'values' in form ? form.values : profile);
	let errors: Partial<Record<keyof MedicalProfileInput, string>> = $derived(
		form && 'errors' in form ? (form.errors ?? {}) : {}
	);
	let pending = $state(false);
	let saved = $state(false);

	let updatedLabel = $derived.by(() => {
		if (!profile?.updated_at) return null;
		const date = new Date(profile.updated_at);
		return Number.isNaN(date.getTime()) ? null : timestampFormatter.format(date);
	});

	let status = $derived.by(() => {
		if (saved) return { success: true, message: 'Medical dossier saved.' };
		if (!form || !('message' in form) || !form.message) return null;
		return { success: 'success' in form && form.success === true, message: form.message };
	});

	const submit: SubmitFunction = () => {
		pending = true;
		saved = false;
		return async ({ result, update }) => {
			pending = false;
			saved = result.type === 'success';
			if (result.type === 'success') await invalidateAll();
			// Default update resets the form prop so a stale failure message cannot
			// resurface after a later successful save.
			await update();
		};
	};

	const fieldClass =
		'mt-1 block w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition placeholder:text-slate-600 hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300';
	const labelClass = 'block text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80 uppercase';
</script>

<svelte:head>
	<title>Medical dossier · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<header class="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-200/10 pb-4">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
				Crew record
			</p>
			<h1 class="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
				Medical dossier
			</h1>
			<p class="mt-1 text-sm text-slate-400">Personal baseline and medical context.</p>
		</div>
		{#if updatedLabel}
			<p class="font-mono text-[11px] text-slate-500">Last saved {updatedLabel}</p>
		{/if}
	</header>

	<form
		method="POST"
		action="?/save"
		use:enhance={submit}
		oninput={() => (saved = false)}
		class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-5"
	>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="medical-blood-type" class={labelClass}>Blood type</label>
				<input
					id="medical-blood-type"
					name="blood_type"
					type="text"
					maxlength="10"
					value={values?.blood_type ?? ''}
					placeholder="O+"
					autocomplete="off"
					spellcheck="false"
					aria-invalid={errors.blood_type ? 'true' : undefined}
					aria-describedby={errors.blood_type ? 'medical-blood-type-error' : undefined}
					class="{fieldClass} min-h-10 max-w-56"
				/>
				{#if errors.blood_type}
					<p id="medical-blood-type-error" class="mt-1 text-xs text-rose-300">
						{errors.blood_type}
					</p>
				{/if}
			</div>

			<div>
				<label for="medical-allergies" class={labelClass}>Allergies</label>
				<textarea
					id="medical-allergies"
					name="allergies"
					rows="3"
					value={values?.allergies ?? ''}
					placeholder="None reported"
					aria-invalid={errors.allergies ? 'true' : undefined}
					aria-describedby={errors.allergies ? 'medical-allergies-error' : undefined}
					class="{fieldClass} min-h-24 resize-y py-2"></textarea>
				{#if errors.allergies}
					<p id="medical-allergies-error" class="mt-1 text-xs text-rose-300">{errors.allergies}</p>
				{/if}
			</div>

			<div>
				<label for="medical-medications" class={labelClass}>Medications</label>
				<textarea
					id="medical-medications"
					name="medications"
					rows="3"
					value={values?.medications ?? ''}
					placeholder="None reported"
					aria-invalid={errors.medications ? 'true' : undefined}
					aria-describedby={errors.medications ? 'medical-medications-error' : undefined}
					class="{fieldClass} min-h-24 resize-y py-2"></textarea>
				{#if errors.medications}
					<p id="medical-medications-error" class="mt-1 text-xs text-rose-300">
						{errors.medications}
					</p>
				{/if}
			</div>

			<div>
				<label for="medical-history" class={labelClass}>Medical history</label>
				<textarea
					id="medical-history"
					name="medical_history"
					rows="4"
					value={values?.medical_history ?? ''}
					placeholder="Relevant conditions, surgeries, or prior findings"
					aria-invalid={errors.medical_history ? 'true' : undefined}
					aria-describedby={errors.medical_history ? 'medical-history-error' : undefined}
					class="{fieldClass} min-h-28 resize-y py-2"></textarea>
				{#if errors.medical_history}
					<p id="medical-history-error" class="mt-1 text-xs text-rose-300">
						{errors.medical_history}
					</p>
				{/if}
			</div>

			<div>
				<label for="medical-baseline" class={labelClass}>Baseline notes</label>
				<textarea
					id="medical-baseline"
					name="baseline_notes"
					rows="4"
					value={values?.baseline_notes ?? ''}
					placeholder="Resting values, tolerances, and mission-specific context"
					aria-invalid={errors.baseline_notes ? 'true' : undefined}
					aria-describedby={errors.baseline_notes ? 'medical-baseline-error' : undefined}
					class="{fieldClass} min-h-28 resize-y py-2"></textarea>
				{#if errors.baseline_notes}
					<p id="medical-baseline-error" class="mt-1 text-xs text-rose-300">
						{errors.baseline_notes}
					</p>
				{/if}
			</div>
		</div>

		<div class="mt-5 flex flex-wrap items-center gap-3 border-t border-cyan-200/10 pt-4">
			<button
				type="submit"
				disabled={pending}
				class="inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{pending ? 'Saving…' : 'Save dossier'}
			</button>
			<p
				class="min-h-5 text-xs {status?.success
					? 'text-cyan-200'
					: status
						? 'text-rose-300'
						: 'text-slate-500'}"
				aria-live="polite"
			>
				{status?.message ?? ''}
			</p>
		</div>
	</form>
</div>

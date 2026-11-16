<script lang="ts">
	import BloodTypeField from '#lib/components/medical/BloodTypeField.svelte';
	import MedicalBirthDateField from '#lib/components/medical/MedicalBirthDateField.svelte';
	import MedicalEntryList from '#lib/components/medical/MedicalEntryList.svelte';
	import MedicalEvaluationList from '#lib/components/medical/MedicalEvaluationList.svelte';
	import MarkdownField from '#lib/components/medical/MarkdownField.svelte';
	import { formatAge } from '#lib/utils/age.js';
	import { formatDate } from '#lib/utils/date.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const timestampFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	let profile = $derived(data.profile);
	let ageLabel = $derived(profile ? formatAge(profile.birth_date) : null);
	let updatedLabel = $derived.by(() => {
		if (!profile?.updated_at) return null;
		const date = new Date(profile.updated_at);
		return Number.isNaN(date.getTime()) ? null : timestampFormatter.format(date);
	});
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

	{#if profile}
		<MedicalBirthDateField value={profile.birth_date} {ageLabel} />
		<BloodTypeField value={profile.blood_type} />

		<div class="grid items-start gap-4 xl:grid-cols-2">
			<MedicalEntryList
				kind="allergy"
				title="Allergies"
				entries={profile.allergies}
				emptyLabel="No allergies recorded."
			/>
			<MedicalEntryList
				kind="medication"
				title="Medications"
				entries={profile.medications}
				emptyLabel="No medications recorded."
			/>
		</div>

		<MedicalEvaluationList evaluations={profile.evaluations} />

		<section class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-5">
			<div>
				<h2 class="text-sm font-semibold text-white">Initial physical condition</h2>
				<p class="mt-0.5 text-xs text-slate-400">Recorded baseline values at mission start.</p>
			</div>

			{#if profile.baselines.length}
				<ul class="mt-4 divide-y divide-white/10">
					{#each profile.baselines as baseline (baseline.id)}
						<li class="py-3">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<p class="text-sm font-medium text-slate-100">{baseline.label}</p>
								<p class="text-sm text-slate-200 tabular-nums">
									{baseline.baseline_value}
									<span class="ml-1 text-xs text-slate-400">{baseline.unit}</span>
								</p>
							</div>
							<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
								<span>Valid from {formatDate(baseline.valid_from)}</span>
								{#if baseline.method}
									<span
										class="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-cyan-200"
									>
										{baseline.method}
									</span>
								{/if}
							</div>
							{#if baseline.notes}
								<p class="mt-1 text-xs leading-relaxed text-slate-400">{baseline.notes}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p
					class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400"
				>
					No baseline values recorded yet.
				</p>
			{/if}
		</section>

		<MarkdownField
			field="medical_history"
			label="Medical history"
			value={profile.medical_history}
			maxlength={1000}
			placeholder="Relevant conditions, surgeries, or prior findings. Click Add to start writing."
		/>

		<MarkdownField
			field="baseline_notes"
			label="Baseline notes"
			value={profile.baseline_notes}
			maxlength={1000}
			placeholder="Resting values, tolerances, and mission-specific context. Click Add to start writing."
		/>
	{:else}
		<div class="rounded-xl border border-dashed border-white/15 p-6 text-center">
			<p class="text-sm text-slate-400">Medical dossier not available for this astronaut.</p>
		</div>
	{/if}
</div>

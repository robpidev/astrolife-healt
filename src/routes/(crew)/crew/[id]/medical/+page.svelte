<script lang="ts">
	import BloodTypeField from '#lib/components/medical/BloodTypeField.svelte';
	import MedicalEntryList from '#lib/components/medical/MedicalEntryList.svelte';
	import MarkdownField from '#lib/components/medical/MarkdownField.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const timestampFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	let profile = $derived(data.profile);
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

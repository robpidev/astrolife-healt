<script lang="ts">
	import { enhance } from '#lib/forms/enhance.js';
	import { resolve } from '$app/paths';
	import HealthIcon from '#lib/components/astronaut/HealthIcon.svelte';
	import { mentalSurveyScale, sleepHoursOptions } from '#lib/data/mentalSurvey.js';
	import type { MentalSurveyStepActionData } from '#lib/interfaces/mental-survey.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);

	let stepForm = $derived(form as MentalSurveyStepActionData | null);
	let errorMessage = $derived(stepForm?.errors?.value ?? null);

	// The selection is rebuilt from the server data whenever the step or the
	// action result changes, so the radio group resets without an effect.
	class SurveySelection {
		value = $state('');

		constructor(initial: string) {
			this.value = initial;
		}
	}

	let selection = $derived(
		new SurveySelection(String(stepForm?.values?.value ?? data.answer ?? data.sleepHours ?? ''))
	);

	let detailHref = $derived(`/crew/${data.astronaut.id}/measurements/mental/${data.topic.id}`);
	let detailLink = $derived(resolve(detailHref.slice(1) as `crew/${string}`));

	let progressPercent = $derived((data.step / data.total) * 100);
	let nextLabel = $derived(data.step === data.total ? 'Finish' : 'Next');
</script>

<svelte:head>
	<title>{data.topic.label} survey · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<header class="flex flex-wrap items-start gap-3 border-b border-cyan-200/10 pb-4">
		<span class="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200">
			<HealthIcon name="mental" />
		</span>
		<div class="min-w-0 flex-1">
			<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Mental health survey</p>
			<h1 class="text-xl font-semibold tracking-tight text-white sm:text-2xl">
				{data.topic.label}
			</h1>
			<p class="mt-1 text-sm leading-relaxed text-slate-400">{data.topic.description}</p>
		</div>
		<a
			href={detailLink}
			class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
		>
			Back to {data.topic.label}
		</a>
	</header>

	<section class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-sm font-medium text-slate-300">Question {data.step} of {data.total}</p>
			<p class="text-xs text-slate-500">{data.topic.label}</p>
		</div>
		<div
			class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
			role="progressbar"
			aria-valuemin={1}
			aria-valuemax={data.total}
			aria-valuenow={data.step}
			aria-label="Survey progress"
		>
			<div class="h-full rounded-full bg-teal-400" style:width={`${progressPercent}%`}></div>
		</div>
	</section>

	{#key `${data.topic.id}-${data.step}`}
		<form
			method="POST"
			action="?/answer"
			class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4"
			use:enhance={() => {
				submitting = true;

				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			{#if data.runId !== null}
				<input type="hidden" name="run" value={data.runId} />
			{/if}

			{#if errorMessage}
				<div
					id="answer-error"
					role="alert"
					class="mb-4 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
				>
					{errorMessage}
				</div>
			{/if}

			<fieldset aria-describedby={errorMessage ? 'answer-error' : undefined}>
				<legend class="text-sm leading-relaxed font-medium text-slate-200">
					{data.question.statement}
				</legend>

				{#if data.question.kind === 'likert'}
					<div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
						{#each mentalSurveyScale as option (option.value)}
							<label class="relative cursor-pointer">
								<input
									type="radio"
									name="value"
									value={String(option.value)}
									bind:group={selection.value}
									required
									class="peer sr-only"
								/>
								<span
									class="flex h-full flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#081322] px-2 py-3 text-center text-xs text-slate-300 transition-colors peer-checked:border-teal-300/60 peer-checked:bg-teal-400/10 peer-checked:font-semibold peer-checked:text-teal-100 peer-checked:ring-2 peer-checked:ring-teal-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-300"
								>
									<span
										aria-hidden="true"
										class="grid size-6 place-items-center rounded-full border border-white/15 font-mono text-[11px]"
									>
										{option.value}
									</span>
									<span>{option.label}</span>
								</span>
								<span
									aria-hidden="true"
									class="absolute top-1.5 right-1.5 size-2 rounded-full bg-teal-300 opacity-0 peer-checked:opacity-100"
								></span>
							</label>
						{/each}
					</div>
				{:else}
					<div class="mt-4 grid gap-2 sm:grid-cols-2">
						{#each sleepHoursOptions as option (option.id)}
							<label class="relative cursor-pointer">
								<input
									type="radio"
									name="value"
									value={option.id}
									bind:group={selection.value}
									required
									class="peer sr-only"
								/>
								<span
									class="flex h-full flex-col gap-1 rounded-lg border border-white/10 bg-[#081322] px-3 py-3 pr-10 text-slate-200 transition-colors peer-checked:border-teal-300/60 peer-checked:bg-teal-400/10 peer-checked:font-semibold peer-checked:text-teal-100 peer-checked:ring-2 peer-checked:ring-teal-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-300"
								>
									<span class="text-sm font-medium">
										{option.label}
									</span>
									<span class="text-xs leading-relaxed text-slate-400">
										{option.interpretation}
									</span>
								</span>
								<span
									aria-hidden="true"
									class="absolute top-3 right-3 grid size-4 place-items-center rounded-full bg-teal-300 text-[10px] font-bold text-slate-950 opacity-0 peer-checked:opacity-100"
								>
									✓
								</span>
							</label>
						{/each}
					</div>
				{/if}
			</fieldset>

			<div class="mt-5 flex flex-wrap items-center gap-2 border-t border-cyan-200/10 pt-4">
				{#if data.step > 1}
					<a
						href={resolve(
							`/(crew)/crew/[id]/measurements/mental/survey/[topic]/[step]?run=${data.runId ?? ''}`,
							{
								id: String(data.astronaut.id),
								topic: data.topic.id,
								step: String(data.step - 1)
							}
						)}
						class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
					>
						Back
					</a>
				{:else}
					<a
						href={detailLink}
						class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
					>
						Back
					</a>
				{/if}
				<a
					href={detailLink}
					class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={submitting}
					aria-busy={submitting}
					class="ml-auto rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{nextLabel}
				</button>
			</div>
		</form>
	{/key}
</div>

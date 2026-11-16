<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { radiationEnvironments } from '#lib/data/radiation.js';
	import HealthAreaOverview from '#lib/components/metrics/HealthAreaOverview.svelte';
	import RadiationStatusPanel from '#lib/components/metrics/RadiationStatusPanel.svelte';
	import type { RadiationAssessment } from '#lib/interfaces/radiation.js';
	import { isRadiationEnvironment } from '#lib/utils/radiation.js';
	import type { PageProps } from './$types';

	type ActionName = 'environment' | 'startSpe' | 'closeSpe';
	type FieldErrors = Partial<
		Record<'environment' | 'shielding' | 'organ' | 'value' | 'kind', string>
	>;

	let { data, form }: PageProps = $props();

	let basePath = $derived('/crew/' + data.astronaut.id);
	let summary = $derived(data.summary);

	let tones = $derived.by(() => {
		const map: Record<string, 'green' | 'yellow' | 'red' | null> = {};
		for (const assessment of summary?.assessments ?? []) {
			map[assessment.guideline.id] =
				assessment.status === 'stale'
					? 'yellow'
					: assessment.status === 'unknown'
						? null
						: assessment.status;
		}

		return map;
	});

	// The card values are derived by the server (career total, daily rate), while
	// the sparkline still shows the raw interval readings behind them.
	let cardSnapshots = $derived.by(() => {
		const assessmentByGuideline = new Map<string, RadiationAssessment>(
			(summary?.assessments ?? []).map((assessment) => [assessment.guideline.id, assessment])
		);

		return data.snapshots.map((snapshot) => {
			const assessment = assessmentByGuideline.get(snapshot.metric_id);
			if (!assessment) return snapshot;

			return {
				...snapshot,
				latest: assessment.measured,
				display: assessment.measured === null ? null : assessment.measured.toFixed(2)
			};
		});
	});

	let formErrors: FieldErrors = $derived(
		form && 'errors' in form && form.errors ? form.errors : {}
	);
	let formSuccess: string | null = $derived(
		form && 'success' in form ? (form.message ?? null) : null
	);
	let formError: string | null = $derived(form && 'error' in form ? (form.error ?? null) : null);

	let pending = $state<ActionName | null>(null);
	let lastAction = $state<ActionName | null>(null);

	// The form fields keep what the user typed; only the first render seeds them.
	let environment = $state<string>(
		untrack(() =>
			form && 'values' in form && form.values && isRadiationEnvironment(form.values.environment)
				? form.values.environment
				: (data.summary?.profile.environment ?? data.summary?.environment ?? 'space')
		)
	);
	let shielding = $state<string>(
		untrack(() =>
			form && 'values' in form
				? (form.values?.shielding ?? '')
				: (data.summary?.profile.habitat_shielding ?? '')
		)
	);

	let speStartedAt = $derived(summary?.profile.spe_alert_started_at?.slice(0, 10) ?? null);

	function enhanceWith(action: ActionName): SubmitFunction {
		return () => {
			pending = action;
			lastAction = action;
			return async ({ result, update }) => {
				try {
					await update();
					if (result.type === 'success') await invalidateAll();
				} finally {
					// A thrown update (network failure) must not leave every button disabled.
					pending = null;
				}
			};
		};
	}
</script>

<svelte:head>
	<title>Radiation · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<HealthAreaOverview
		areaId="radiation"
		{basePath}
		snapshots={cardSnapshots}
		toneByMetric={tones}
	/>

	{#if formSuccess}
		<div
			role="status"
			class="rounded-xl border border-teal-300/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-200"
		>
			{formSuccess}
		</div>
	{/if}
	{#if formError && lastAction !== 'environment'}
		<p
			role="alert"
			class="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
		>
			{formError}
		</p>
	{/if}

	{#if summary}
		<RadiationStatusPanel
			{summary}
			saveFailed={lastAction === 'environment' && formError !== null}
		/>

		<section
			aria-labelledby="radiation-habitat-title"
			class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
		>
			<h2 id="radiation-habitat-title" class="text-base font-semibold text-white">Habitat</h2>
			<p class="mt-1 text-sm leading-relaxed text-slate-400">
				The habitat sets the GCR daily limit. The shielding note records what protects the crew
				member.
			</p>

			<form
				method="POST"
				action="?/environment"
				use:enhance={enhanceWith('environment')}
				class="mt-4 grid gap-4 sm:grid-cols-2"
			>
				<input type="hidden" name="kind" value="environment" />

				<div>
					<label for="radiation-environment" class="block text-sm font-medium text-slate-300">
						Environment
					</label>
					<select
						id="radiation-environment"
						name="environment"
						bind:value={environment}
						class="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-[#081322] px-3 text-sm text-slate-100 transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
					>
						{#each radiationEnvironments as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if formErrors.environment}
						<p class="mt-1 text-xs text-rose-300">{formErrors.environment}</p>
					{/if}
				</div>

				<div>
					<label for="radiation-shielding" class="block text-sm font-medium text-slate-300">
						Shielding
					</label>
					<input
						id="radiation-shielding"
						name="shielding"
						type="text"
						maxlength="120"
						bind:value={shielding}
						placeholder="e.g. 10 g/cm² aluminium"
						class="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-[#081322] px-3 text-sm text-slate-100 transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
					/>
					{#if formErrors.shielding}
						<p class="mt-1 text-xs text-rose-300">{formErrors.shielding}</p>
					{/if}
				</div>

				<div class="sm:col-span-2">
					<button
						type="submit"
						disabled={pending !== null}
						class="min-h-11 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{pending === 'environment' ? 'Saving…' : 'Save habitat'}
					</button>
				</div>
			</form>
		</section>

		<section
			aria-labelledby="radiation-spe-title"
			class="rounded-2xl border border-cyan-200/15 bg-[#0b1b2e] p-5"
		>
			<h2 id="radiation-spe-title" class="text-base font-semibold text-white">
				Solar particle event
			</h2>
			<p class="mt-1 text-sm leading-relaxed text-slate-400">
				Segments logged during an open event sum towards the 250 mSv effective dose limit.
			</p>

			{#if summary.profile.spe_alert_active}
				<div class="mt-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-4">
					<p class="text-sm font-semibold text-rose-200">Solar particle event in progress</p>
					<p class="mt-1 text-xs text-rose-200/80">
						Open since {speStartedAt ?? 'an unknown date'}.
					</p>
					<form
						method="POST"
						action="?/closeSpe"
						use:enhance={enhanceWith('closeSpe')}
						class="mt-3"
					>
						<button
							type="submit"
							disabled={pending !== null}
							class="min-h-11 rounded-lg border border-rose-300/40 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{pending === 'closeSpe' ? 'Closing…' : 'Close event'}
						</button>
					</form>
				</div>
			{:else}
				<form method="POST" action="?/startSpe" use:enhance={enhanceWith('startSpe')} class="mt-4">
					<button
						type="submit"
						disabled={pending !== null}
						class="min-h-11 rounded-lg border border-cyan-300/25 px-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{pending === 'startSpe' ? 'Opening…' : 'Open SPE alert'}
					</button>
				</form>
			{/if}
		</section>
	{:else}
		<p
			class="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400"
		>
			Radiation settings are unavailable for this crew member.
		</p>
	{/if}
</div>

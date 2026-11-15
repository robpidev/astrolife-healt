<script lang="ts">
	import { enhance } from '$app/forms';
	import type {
		CardiovascularActionData,
		CardiovascularField,
		CardiovascularMetricCode
	} from '#lib/server/cardiovascular-validation.js';

	interface Field {
		name: CardiovascularField;
		label: string;
		unit: string;
		min: number;
		max: number;
		step: string;
	}

	interface Props {
		metricId: CardiovascularMetricCode;
		fields: readonly Field[];
		form: CardiovascularActionData | null;
	}

	let { metricId, fields, form }: Props = $props();

	let pending = $state(false);
</script>

<section class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
	<h2 class="text-base font-semibold text-white">Record measurement</h2>

	{#if form?.success}
		<div
			role="status"
			class="mt-3 rounded-xl border border-teal-300/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-200"
		>
			Measurement saved.
		</div>
	{/if}

	{#if form?.success && form.warning}
		<div
			role="status"
			class="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-200"
		>
			{form.warning}
		</div>
	{/if}

	{#if form?.errors?.metric_code}
		<p role="alert" class="mt-3 text-sm text-rose-200">{form.errors.metric_code}</p>
	{/if}

	<form
		method="POST"
		action="?/register"
		use:enhance={() => {
			pending = true;

			return async ({ update }) => {
				try {
					await update();
				} finally {
					pending = false;
				}
			};
		}}
	>
		<input type="hidden" name="metric_code" value={metricId} />

		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			{#each fields as field (field.name)}
				{@const inputId = `cardiovascular-${metricId}-${field.name}`}
				{@const errorId = `${inputId}-error`}
				{@const error = form?.errors?.[field.name]}
				<div>
					<label for={inputId} class="mb-2 block text-sm font-medium text-slate-200">
						{field.label}
						<span class="font-normal text-slate-500">({field.unit})</span>
					</label>
					<input
						id={inputId}
						name={field.name}
						type="number"
						required
						min={field.min}
						max={field.max}
						step={field.step}
						inputmode="decimal"
						value={form?.values?.[field.name] ?? ''}
						aria-invalid={Boolean(error)}
						aria-describedby={error ? errorId : undefined}
						class="min-h-11 w-full rounded-lg border border-cyan-200/20 bg-slate-950/70 px-3 py-2 text-slate-100 transition-colors focus:border-cyan-300 focus:ring-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-60 {error
							? 'border-rose-300/50'
							: ''}"
					/>
					{#if error}
						<p id={errorId} class="mt-1.5 text-sm text-rose-200">{error}</p>
					{/if}
				</div>
			{/each}
		</div>

		<button
			type="submit"
			disabled={pending}
			aria-busy={pending}
			class="mt-4 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{pending ? 'Saving…' : 'Save measurement'}
		</button>
	</form>
</section>

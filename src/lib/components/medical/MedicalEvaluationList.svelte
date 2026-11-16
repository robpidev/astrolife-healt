<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import MedicalEvaluationDialog from '#lib/components/medical/MedicalEvaluationDialog.svelte';
	import { evaluationKinds } from '#lib/data/medical.js';
	import type { MedicalEvaluation } from '#lib/interfaces/medical-profile.js';
	import { formatDate } from '#lib/utils/date.js';

	interface Props {
		evaluations: readonly MedicalEvaluation[];
	}

	let { evaluations }: Props = $props();

	let showDialog = $state(false);
	let removingId = $state<string | null>(null);
	let error = $state('');

	function kindLabel(value: string): string {
		return evaluationKinds.find((option) => option.value === value)?.label ?? value;
	}

	const removeSubmit: SubmitFunction = ({ formData }) => {
		const id = String(formData.get('id') ?? '');
		removingId = id || null;
		error = '';
		return async ({ result }) => {
			removingId = null;
			if (result.type === 'success') {
				await invalidateAll();
			} else {
				error =
					result.type === 'failure' && typeof result.data?.error === 'string'
						? result.data.error
						: 'Could not remove the evaluation.';
			}
		};
	};
</script>

<section class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-5">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold text-white">Medical evaluations</h2>
			<p class="mt-0.5 text-xs text-slate-400">{evaluations.length} recorded</p>
		</div>
		<button
			type="button"
			onclick={() => (showDialog = true)}
			aria-haspopup="dialog"
			class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
		>
			<span aria-hidden="true">+</span> Add
		</button>
	</div>

	{#if evaluations.length}
		<ul class="mt-4 divide-y divide-white/10">
			{#each evaluations as evaluation (evaluation.id)}
				<li class="flex items-start justify-between gap-3 py-3">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<p class="text-sm font-medium text-slate-100">{evaluation.summary}</p>
							<span
								class="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-cyan-200 uppercase"
							>
								{kindLabel(evaluation.kind)}
							</span>
							<span class="text-xs text-slate-500">{formatDate(evaluation.evaluated_at)}</span>
						</div>
						{#if evaluation.notes}
							<p class="mt-1 text-xs leading-relaxed text-slate-400">{evaluation.notes}</p>
						{/if}
					</div>
					<form method="POST" action="?/removeEvaluation" use:enhance={removeSubmit}>
						<input type="hidden" name="id" value={evaluation.id} />
						<button
							type="submit"
							disabled={removingId === evaluation.id}
							aria-label={`Remove ${evaluation.summary}`}
							class="min-h-9 rounded-lg border border-rose-300/20 px-2.5 text-xs font-medium text-rose-200 transition hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-rose-300 disabled:opacity-50"
						>
							{removingId === evaluation.id ? 'Removing…' : 'Remove'}
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<p
			class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400"
		>
			No prior medical evaluations recorded.
		</p>
	{/if}

	{#if error}
		<p role="alert" class="mt-2 text-xs text-rose-300">{error}</p>
	{/if}
</section>

{#if showDialog}
	<MedicalEvaluationDialog onclose={() => (showDialog = false)} />
{/if}

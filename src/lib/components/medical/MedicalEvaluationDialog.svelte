<script lang="ts">
	import { browser } from '$app/env';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { evaluationKinds } from '#lib/data/medical.js';
	import type { MedicalEvaluationKind } from '#lib/interfaces/medical-profile.js';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	function localIsoDate(date: Date): string {
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${date.getFullYear()}-${month}-${day}`;
	}
	const todayIso = localIsoDate(new Date());

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let summaryInput = $state<HTMLInputElement | null>(null);
	let kind = $state<MedicalEvaluationKind>('periodic');
	let evaluatedAt = $state(todayIso);
	let summary = $state('');
	let notes = $state('');
	let pending = $state(false);
	let error = $state('');

	$effect(() => {
		if (browser && dialogEl && !dialogEl.open) {
			dialogEl.showModal();
			summaryInput?.focus();
		}
	});

	function requestClose(): void {
		if (!pending) dialogEl?.close();
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl) requestClose();
	}

	const submit: SubmitFunction = ({ cancel }) => {
		if (!summary.trim()) {
			error = 'Enter a summary.';
			summaryInput?.focus();
			cancel();
			return;
		}
		pending = true;
		error = '';
		return async ({ result }) => {
			pending = false;
			if (result.type === 'success') {
				await invalidateAll();
				dialogEl?.close();
			} else {
				error =
					result.type === 'failure' && typeof result.data?.error === 'string'
						? result.data.error
						: 'Could not add the evaluation.';
			}
		};
	};

	const fieldClass =
		'mt-1 min-h-11 w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition placeholder:text-slate-600 hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300';
	const labelClass = 'block text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80 uppercase';
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby="medical-evaluation-dialog-title"
	aria-modal="true"
	class="m-0 mt-auto max-h-[95dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-cyan-200/20 bg-[#0b1729] p-0 text-slate-100 shadow-2xl shadow-black/50 backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
	onclick={handleBackdropClick}
	{onclose}
>
	<form method="POST" action="?/addEvaluation" use:enhance={submit} class="p-5 sm:p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs font-semibold tracking-widest text-cyan-300 uppercase">Medical dossier</p>
				<h2 id="medical-evaluation-dialog-title" class="mt-1 text-xl font-semibold text-white">
					Add medical evaluation
				</h2>
			</div>
			<button
				type="button"
				aria-label="Close dialog"
				onclick={requestClose}
				class="grid size-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-xl text-slate-200 transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-300"
				>×</button
			>
		</div>

		<div class="mt-5 space-y-3">
			<fieldset>
				<legend class={labelClass}>Type</legend>
				<div class="mt-1.5 grid grid-cols-2 gap-2">
					{#each evaluationKinds as option (option.value)}
						<label
							class="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-slate-300 transition select-none hover:border-cyan-300/40 hover:bg-white/10 has-[:checked]:border-cyan-300 has-[:checked]:bg-cyan-300/15 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan-300"
						>
							<input
								type="radio"
								name="kind"
								value={option.value}
								checked={kind === option.value}
								onchange={() => (kind = option.value)}
								class="sr-only"
							/>
							{option.label}
						</label>
					{/each}
				</div>
			</fieldset>

			<div>
				<label for="medical-evaluation-date" class={labelClass}>Evaluation date</label>
				<input
					id="medical-evaluation-date"
					name="evaluated_at"
					type="date"
					required
					max={todayIso}
					bind:value={evaluatedAt}
					class={fieldClass}
				/>
			</div>

			<div>
				<label for="medical-evaluation-summary" class={labelClass}>Summary</label>
				<input
					id="medical-evaluation-summary"
					name="summary"
					type="text"
					required
					maxlength="200"
					bind:this={summaryInput}
					bind:value={summary}
					placeholder="Annual fitness review"
					class={fieldClass}
				/>
			</div>

			<div>
				<label for="medical-evaluation-notes" class={labelClass}>Notes</label>
				<textarea
					id="medical-evaluation-notes"
					name="notes"
					maxlength="500"
					rows="3"
					bind:value={notes}
					placeholder="Optional detail"
					class="{fieldClass} resize-y py-2"></textarea>
			</div>
		</div>

		{#if error}
			<p
				role="alert"
				class="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200"
			>
				{error}
			</p>
		{/if}

		<div class="mt-5 grid grid-cols-[1fr_1.5fr] gap-3">
			<button
				type="button"
				disabled={pending}
				onclick={requestClose}
				class="min-h-13 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"
				>Cancel</button
			>
			<button
				type="submit"
				disabled={pending}
				class="min-h-13 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
				>{pending ? 'Saving…' : 'Add'}</button
			>
		</div>
	</form>
</dialog>

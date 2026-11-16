<script lang="ts">
	import { browser } from '$app/env';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { allergySeverities } from '#lib/data/medical.js';
	import type { MedicalEntryKind } from '#lib/interfaces/medical-profile.js';

	interface Props {
		kind: MedicalEntryKind;
		title: string;
		onclose: () => void;
	}

	let { kind, title, onclose }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let nameInput = $state<HTMLInputElement | null>(null);
	let name = $state('');
	let severity = $state('unknown');
	let dose = $state('');
	let note = $state('');
	let pending = $state(false);
	let error = $state('');

	$effect(() => {
		if (browser && dialogEl && !dialogEl.open) {
			dialogEl.showModal();
			nameInput?.focus();
		}
	});

	function requestClose(): void {
		if (!pending) dialogEl?.close();
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl) requestClose();
	}

	const submit: SubmitFunction = ({ cancel }) => {
		if (!name.trim()) {
			error = 'Enter a name.';
			nameInput?.focus();
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
						: 'Could not add the entry.';
			}
		};
	};

	const fieldClass =
		'mt-1 min-h-11 w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition placeholder:text-slate-600 hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300';
	const labelClass = 'block text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80 uppercase';
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby="medical-entry-dialog-title"
	aria-modal="true"
	class="m-0 mt-auto max-h-[95dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-cyan-200/20 bg-[#0b1729] p-0 text-slate-100 shadow-2xl shadow-black/50 backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
	onclick={handleBackdropClick}
	{onclose}
>
	<form method="POST" action="?/addEntry" use:enhance={submit} class="p-5 sm:p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs font-semibold tracking-widest text-cyan-300 uppercase">Medical dossier</p>
				<h2 id="medical-entry-dialog-title" class="mt-1 text-xl font-semibold text-white">
					Add {title.toLowerCase().replace(/s$/, '')}
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

		<input type="hidden" name="kind" value={kind} />

		<div class="mt-5 space-y-3">
			<div>
				<label for={`medical-${kind}-name`} class={labelClass}>Name</label>
				<input
					id={`medical-${kind}-name`}
					name="name"
					type="text"
					required
					maxlength="120"
					bind:this={nameInput}
					bind:value={name}
					placeholder={kind === 'allergy' ? 'Penicillin' : 'Ibuprofen'}
					class={fieldClass}
				/>
			</div>

			{#if kind === 'allergy'}
				<fieldset>
					<legend class={labelClass}>Severity</legend>
					<div class="mt-1.5 grid grid-cols-2 gap-2">
						{#each allergySeverities as option (option.value)}
							<label
								class="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-slate-300 transition select-none hover:border-cyan-300/40 hover:bg-white/10 has-[:checked]:border-cyan-300 has-[:checked]:bg-cyan-300/15 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan-300"
							>
								<input
									type="radio"
									name="severity"
									value={option.value}
									checked={severity === option.value}
									onchange={() => (severity = option.value)}
									class="sr-only"
								/>
								{option.label}
							</label>
						{/each}
					</div>
				</fieldset>
			{:else}
				<div>
					<label for="medical-medication-dose" class={labelClass}>Dose</label>
					<input
						id="medical-medication-dose"
						name="dose"
						type="text"
						maxlength="80"
						bind:value={dose}
						placeholder="200 mg"
						class={fieldClass}
					/>
				</div>
			{/if}

			<div>
				<label for={`medical-${kind}-note`} class={labelClass}>Note</label>
				<input
					id={`medical-${kind}-note`}
					name="note"
					type="text"
					maxlength="300"
					bind:value={note}
					placeholder="Optional detail"
					class={fieldClass}
				/>
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

<script lang="ts">
	import { browser } from '$app/env';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDate } from '#lib/utils/date.js';

	interface Props {
		value: string | null;
		ageLabel: string | null;
	}

	let { value, ageLabel }: Props = $props();

	function localIsoDate(date: Date): string {
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${date.getFullYear()}-${month}-${day}`;
	}
	const todayIso = localIsoDate(new Date());

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let dateInput = $state<HTMLInputElement | null>(null);
	let open = $state(false);
	let birthDate = $state('');
	let pending = $state(false);
	let error = $state('');

	$effect(() => {
		if (browser && open && dialogEl && !dialogEl.open) {
			dialogEl.showModal();
			dateInput?.focus();
		}
	});

	function openDialog(): void {
		birthDate = value ?? '';
		error = '';
		open = true;
	}

	function requestClose(): void {
		if (!pending) dialogEl?.close();
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl) requestClose();
	}

	function clearBirthDate(): void {
		birthDate = '';
		// Set the DOM value synchronously so the submitted form data is empty
		// even before Svelte flushes the state update.
		if (dateInput) dateInput.value = '';
	}

	const submit: SubmitFunction = () => {
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
						: 'Could not save the date of birth.';
			}
		};
	};
</script>

<section class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-sm font-semibold text-white">Date of birth</h2>
			<p class="mt-0.5 text-xs text-slate-500">Used to derive age for the crew record.</p>
		</div>
		<div class="flex items-center gap-3">
			<span
				class="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100 tabular-nums"
			>
				{value ? formatDate(value) : 'Not recorded'}
			</span>
			{#if ageLabel}
				<span class="text-xs text-slate-400">{ageLabel}</span>
			{/if}
			<button
				type="button"
				onclick={openDialog}
				aria-haspopup="dialog"
				class="inline-flex min-h-9 items-center rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				{value ? 'Edit' : 'Set'}
			</button>
		</div>
	</div>

	{#if error}
		<p role="alert" class="mt-2 text-xs text-rose-300">{error}</p>
	{/if}
</section>

{#if open}
	<dialog
		bind:this={dialogEl}
		aria-labelledby="birth-date-dialog-title"
		aria-modal="true"
		class="m-0 mt-auto max-h-[95dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-cyan-200/20 bg-[#0b1729] p-0 text-slate-100 shadow-2xl shadow-black/50 backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
		onclick={handleBackdropClick}
		onclose={() => (open = false)}
	>
		<form method="POST" action="?/saveBirthDate" use:enhance={submit} class="p-5 sm:p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-xs font-semibold tracking-widest text-cyan-300 uppercase">
						Medical dossier
					</p>
					<h2 id="birth-date-dialog-title" class="mt-1 text-xl font-semibold text-white">
						{value ? 'Edit date of birth' : 'Set date of birth'}
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

			<div class="mt-5">
				<label
					for="medical-birth-date"
					class="block text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80 uppercase"
				>
					Date of birth
				</label>
				<input
					id="medical-birth-date"
					name="birth_date"
					type="date"
					max={todayIso}
					bind:this={dateInput}
					bind:value={birthDate}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={error ? 'medical-birth-date-error' : undefined}
					class="mt-1 min-h-11 w-full rounded-lg border border-cyan-200/15 bg-[#081422] px-3 text-sm text-slate-100 transition placeholder:text-slate-600 hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
				/>
			</div>

			{#if error}
				<p
					id="medical-birth-date-error"
					role="alert"
					class="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200"
				>
					{error}
				</p>
			{/if}

			<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
				{#if value}
					<button
						type="submit"
						formaction="?/saveBirthDate"
						formnovalidate
						disabled={pending}
						onclick={clearBirthDate}
						class="min-h-11 rounded-xl border border-rose-300/20 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-rose-300 disabled:opacity-50"
					>
						Clear
					</button>
				{/if}
				<div class="ml-auto flex items-center gap-3">
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
						>{pending ? 'Saving…' : 'Save date of birth'}</button
					>
				</div>
			</div>
		</form>
	</dialog>
{/if}

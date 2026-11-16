<script lang="ts">
	import { browser } from '$app/env';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { bloodTypes } from '#lib/data/medical.js';

	interface Props {
		value: string | null;
	}

	let { value }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let open = $state(false);
	// A value saved before the list existed must stay selectable, otherwise
	// reopening the dialog would silently drop it.
	let options = $derived.by(() => {
		const list: string[] = [...bloodTypes];
		if (value && !list.includes(value)) list.push(value);
		return list;
	});
	let pending = $state(false);
	let error = $state('');

	$effect(() => {
		if (browser && open && dialogEl && !dialogEl.open) dialogEl.showModal();
	});

	function requestClose(): void {
		if (!pending) dialogEl?.close();
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl) requestClose();
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
						: 'Could not save the blood type.';
			}
		};
	};
</script>

<section class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-sm font-semibold text-white">Blood type</h2>
			<p class="mt-0.5 text-xs text-slate-500">Baseline for transfusion and mission planning.</p>
		</div>
		<div class="flex items-center gap-3">
			<span
				class="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100 tabular-nums"
			>
				{value ?? 'Not recorded'}
			</span>
			<button
				type="button"
				onclick={() => (open = true)}
				aria-haspopup="dialog"
				class="inline-flex min-h-9 items-center rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				{value ? 'Change' : 'Select'}
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
		aria-labelledby="blood-type-dialog-title"
		aria-modal="true"
		class="m-0 mt-auto max-h-[95dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-cyan-200/20 bg-[#0b1729] p-0 text-slate-100 shadow-2xl shadow-black/50 backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
		onclick={handleBackdropClick}
		onclose={() => (open = false)}
	>
		<form method="POST" action="?/saveBloodType" use:enhance={submit} class="p-5 sm:p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-xs font-semibold tracking-widest text-cyan-300 uppercase">
						Medical dossier
					</p>
					<h2 id="blood-type-dialog-title" class="mt-1 text-xl font-semibold text-white">
						Select blood type
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

			<fieldset class="mt-5">
				<legend class="text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80 uppercase">
					Blood type
				</legend>
				<div class="mt-3 grid grid-cols-3 gap-2.5">
					<label
						class="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-base font-semibold text-slate-200 transition select-none hover:border-cyan-300/40 hover:bg-white/10 has-[:checked]:border-cyan-300 has-[:checked]:bg-cyan-300/15 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan-300"
					>
						<input type="radio" name="blood_type" value="" checked={!value} class="sr-only" />
						<span class="text-xs font-medium">Not recorded</span>
					</label>
					{#each options as option (option)}
						<label
							class="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl font-semibold text-slate-200 transition select-none hover:border-cyan-300/40 hover:bg-white/10 has-[:checked]:border-cyan-300 has-[:checked]:bg-cyan-300/15 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan-300"
						>
							<input
								type="radio"
								name="blood_type"
								value={option}
								checked={option === value}
								class="sr-only"
							/>
							{option}
						</label>
					{/each}
				</div>
			</fieldset>

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
					>{pending ? 'Saving…' : 'Save blood type'}</button
				>
			</div>
		</form>
	</dialog>
{/if}

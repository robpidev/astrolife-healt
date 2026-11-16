<script lang="ts">
	import { browser } from '$app/env';
	import { enhance } from '#lib/forms/enhance.js';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '$app/forms';

	let { onclose }: { onclose: () => void } = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let temperatureText = $state('');
	let pending = $state(false);
	let errorMessage = $state('');
	let numericValue = $derived(Number(temperatureText));
	let isValid = $derived(
		/^\d{2}(?:\.\d)?$/.test(temperatureText) &&
			Number.isFinite(numericValue) &&
			numericValue >= 30 &&
			numericValue <= 45
	);

	const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

	$effect(() => {
		if (browser && dialogEl && !dialogEl.open) dialogEl.showModal();
	});

	function requestClose(): void {
		if (!pending) dialogEl?.close();
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl) requestClose();
	}

	function setFromInput(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const next = input.value.replace(',', '.');
		if (/^\d{0,2}(?:\.\d?)?$/.test(next)) {
			temperatureText = next;
			errorMessage = '';
		} else {
			input.value = temperatureText;
		}
	}

	function pressKey(key: (typeof keys)[number]): void {
		if (pending) return;
		if (key === '⌫') {
			temperatureText = temperatureText.slice(0, -1);
		} else if (key === '.') {
			if (temperatureText.length === 2 && !temperatureText.includes('.')) {
				temperatureText += '.';
			}
		} else {
			const candidate = temperatureText + key;
			if (/^\d{0,2}(?:\.\d?)?$/.test(candidate)) temperatureText = candidate;
		}
		errorMessage = '';
	}

	const submit: SubmitFunction = ({ cancel }) => {
		if (!isValid || pending) {
			errorMessage = 'Enter a temperature from 30 to 45 °C, with at most one decimal place.';
			cancel();
			return;
		}
		pending = true;
		errorMessage = '';
		return async ({ result }) => {
			pending = false;
			if (result.type === 'success') {
				await invalidateAll();
				dialogEl?.close();
			} else {
				errorMessage =
					result.type === 'failure' && typeof result.data?.error === 'string'
						? result.data.error
						: 'Could not save the reading. Please try again.';
			}
		};
	};
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby="temperature-dialog-title"
	aria-modal="true"
	class="m-0 mt-auto max-h-[95dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-cyan-200/20 bg-[#0b1729] p-0 text-slate-100 shadow-2xl shadow-black/50 backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
	onclick={handleBackdropClick}
	{onclose}
>
	<form method="POST" action="?/add" use:enhance={submit} class="p-5 sm:p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs font-semibold tracking-widest text-cyan-300 uppercase">New reading</p>
				<h2 id="temperature-dialog-title" class="mt-1 text-xl font-semibold text-white">
					Add body temperature
				</h2>
				<p class="mt-1 text-sm text-slate-400">
					The current date and time will be saved automatically.
				</p>
			</div>
			<button
				type="button"
				aria-label="Close dialog"
				onclick={requestClose}
				class="grid size-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-xl text-slate-200 transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-300"
				>×</button
			>
		</div>

		<div class="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/5 px-5 py-4 text-center">
			<label for="temperature-entry" class="block text-sm font-medium text-slate-300">
				Body temperature (°C)
			</label>
			<div class="mt-2 flex items-center justify-center gap-2">
				<input
					id="temperature-entry"
					name="temperature"
					type="text"
					inputmode="none"
					autocomplete="off"
					spellcheck="false"
					placeholder="36.5"
					value={temperatureText}
					oninput={setFromInput}
					maxlength="4"
					aria-invalid={errorMessage ? 'true' : undefined}
					aria-describedby="temperature-entry-help"
					class="w-40 border-0 border-b border-cyan-300/30 bg-transparent p-0 text-center text-4xl font-semibold tracking-wide text-white tabular-nums placeholder:text-slate-600 focus:border-cyan-300 focus:ring-0 sm:text-5xl"
				/>
				<span class="text-xl font-medium text-cyan-300">°C</span>
			</div>
			<p id="temperature-entry-help" class="mt-2 text-xs text-slate-400">
				Use the on-screen keypad or a physical keyboard.
			</p>
		</div>

		<div class="mt-4 flex items-center justify-between gap-3">
			<p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Numeric keypad</p>
			<button
				type="button"
				disabled={pending}
				onclick={() => {
					temperatureText = '';
					errorMessage = '';
				}}
				class="min-h-11 rounded-xl px-4 text-sm font-medium text-cyan-300 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"
				>Clear</button
			>
		</div>
		<div class="grid grid-cols-3 gap-2.5" aria-label="Temperature touch keypad">
			{#each keys as key (key)}
				<button
					type="button"
					disabled={pending}
					aria-label={key === '⌫' ? 'Delete last digit' : key === '.' ? 'Decimal point' : key}
					onclick={() => pressKey(key)}
					class="min-h-14 touch-manipulation rounded-xl border border-white/10 bg-white/7 text-2xl font-semibold text-slate-100 transition select-none hover:border-cyan-300/40 hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-[0.97] active:bg-cyan-300/20 disabled:opacity-50"
					>{key}</button
				>
			{/each}
		</div>

		{#if errorMessage}
			<p
				role="alert"
				class="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200"
			>
				{errorMessage}
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
				disabled={pending || !isValid}
				class="min-h-13 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
				>{pending ? 'Saving…' : 'Save reading'}</button
			>
		</div>
		<p class="mt-3 text-center text-xs text-slate-500">
			Manual entry · not an automatic sensor reading
		</p>
	</form>
</dialog>

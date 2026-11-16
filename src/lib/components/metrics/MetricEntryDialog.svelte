<script lang="ts">
	import { browser } from '$app/env';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '$app/forms';
	import type { MetricEntryConfig, MetricEntryField } from '#lib/interfaces/metric-entry.js';

	interface Props {
		config: MetricEntryConfig;
		onclose: () => void;
	}

	let { config, onclose }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	function initialValues(): Record<string, string> {
		return Object.fromEntries(config.fields.map((field) => [field.name, '']));
	}
	function initialActive(): string {
		return config.fields[0]?.name ?? '';
	}
	let values = $state<Record<string, string>>(initialValues());
	let active = $state(initialActive());
	function initialExtra(): string {
		return config.extra?.options[0]?.value ?? '';
	}
	let extra = $state(initialExtra());
	let pending = $state(false);
	let errorMessage = $state('');

	let activeField = $derived(
		config.fields.find((field) => field.name === active) ?? config.fields[0]
	);

	let keys = $derived(
		activeField?.integer
			? (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'] as const)
			: (['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const)
	);

	let isValid = $derived.by(() => {
		for (const field of config.fields) {
			const raw = values[field.name] ?? '';
			const numeric = Number(raw.replace(',', '.'));
			if (!raw || !Number.isFinite(numeric)) return false;
			if (numeric < field.min || numeric > field.max) return false;
			if (field.integer && !Number.isInteger(numeric)) return false;
		}
		if (config.extra && !extra) return false;
		return config.fields.length > 0;
	});

	$effect(() => {
		if (browser && dialogEl && !dialogEl.open) dialogEl.showModal();
	});

	function requestClose(): void {
		if (!pending) dialogEl?.close();
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl) requestClose();
	}

	function setField(name: string, raw: string): void {
		const next = raw.replace(',', '.');
		if (!/^\d*(?:\.\d*)?$/.test(next)) return;
		values[name] = next;
		errorMessage = '';
	}

	function pressKey(key: (typeof keys)[number]): void {
		if (pending || !activeField) return;
		const current = values[activeField.name] ?? '';
		if (key === '⌫') {
			values[activeField.name] = current.slice(0, -1);
		} else if (key === '.') {
			if (!current.includes('.')) values[activeField.name] = (current || '0') + '.';
		} else {
			const candidate = current + key;
			if (/^\d*(?:\.\d*)?$/.test(candidate)) values[activeField.name] = candidate;
		}
		errorMessage = '';
	}

	function fieldError(field: MetricEntryField): string | null {
		const raw = values[field.name] ?? '';
		const numeric = Number(raw.replace(',', '.'));
		if (!raw || !Number.isFinite(numeric)) return 'Enter a value.';
		if (numeric < field.min || numeric > field.max) {
			return `Enter a value between ${field.min} and ${field.max} ${field.unit}.`;
		}
		if (field.integer && !Number.isInteger(numeric)) return 'Enter a whole number.';
		return null;
	}

	const submit: SubmitFunction = ({ cancel }) => {
		const invalid = config.fields.find((field) => fieldError(field) !== null);
		if (invalid) {
			active = invalid.name;
			errorMessage = fieldError(invalid) ?? 'Check the values before saving.';
			cancel();
			return;
		}
		if (!isValid || pending) {
			errorMessage = 'Check the values before saving.';
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
	aria-labelledby="metric-dialog-title"
	aria-modal="true"
	class="m-0 mt-auto max-h-[95dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-cyan-200/20 bg-[#0b1729] p-0 text-slate-100 shadow-2xl shadow-black/50 backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
	onclick={handleBackdropClick}
	{onclose}
>
	<form method="POST" action="?/register" use:enhance={submit} class="p-5 sm:p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs font-semibold tracking-widest text-cyan-300 uppercase">New reading</p>
				<h2 id="metric-dialog-title" class="mt-1 text-xl font-semibold text-white">
					Add {config.title.toLowerCase()}
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

		{#each Object.entries(config.hidden ?? {}) as [name, value] (name)}
			<input type="hidden" {name} {value} />
		{/each}

		<div class="mt-5 space-y-3">
			{#each config.fields as field (field.name)}
				<div
					class="rounded-2xl border px-5 py-4 transition-colors {active === field.name
						? 'border-cyan-300/40 bg-cyan-300/5'
						: 'border-white/10 bg-white/[0.02]'}"
				>
					<label
						for={`metric-entry-${field.name}`}
						class="block text-sm font-medium text-slate-300"
					>
						{field.label} ({field.unit})
					</label>
					<div class="mt-2 flex items-center justify-center gap-2">
						<input
							id={`metric-entry-${field.name}`}
							name={field.name}
							type="text"
							inputmode="none"
							autocomplete="off"
							spellcheck="false"
							placeholder={field.integer ? '0' : '0.0'}
							value={values[field.name] ?? ''}
							onfocus={() => (active = field.name)}
							oninput={(event) =>
								setField(field.name, (event.currentTarget as HTMLInputElement).value)}
							aria-invalid={errorMessage ? 'true' : undefined}
							class="w-36 border-0 border-b border-cyan-300/30 bg-transparent p-0 text-center text-3xl font-semibold tracking-wide text-white tabular-nums placeholder:text-slate-600 focus:border-cyan-300 focus:ring-0 sm:text-4xl"
						/>
						<span class="text-lg font-medium text-cyan-300">{field.unit}</span>
					</div>
				</div>
			{/each}
		</div>
		<p class="mt-2 text-xs text-slate-400">
			Tap a field, then use the on-screen keypad or a physical keyboard. The active field is
			highlighted.
		</p>

		{#if config.extra}
			<div class="mt-4">
				<label for="metric-extra" class="block text-sm font-medium text-slate-300">
					{config.extra.label}
				</label>
				<select
					id="metric-extra"
					name="extra"
					bind:value={extra}
					class="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#0b1b2e] px-3 text-sm text-slate-100 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
				>
					{#each config.extra.options as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="mt-4 flex items-center justify-between gap-3">
			<p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Numeric keypad</p>
			<button
				type="button"
				disabled={pending}
				onclick={() => {
					values[active] = '';
					errorMessage = '';
				}}
				class="min-h-11 rounded-xl px-4 text-sm font-medium text-cyan-300 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"
				>Clear</button
			>
		</div>
		<div class="grid grid-cols-3 gap-2.5" aria-label="Numeric touch keypad">
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

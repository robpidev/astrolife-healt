<script lang="ts">
	import { enhance } from '#lib/forms/enhance.js';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { MedicalMarkdownField } from '#lib/interfaces/medical-profile.js';
	import { renderMarkdown } from '#lib/utils/markdown.js';

	interface Props {
		field: MedicalMarkdownField;
		label: string;
		value: string | null;
		maxlength: number;
		placeholder: string;
	}

	let { field, label, value, maxlength, placeholder }: Props = $props();

	function initialDraft(): string {
		return value ?? '';
	}
	let editing = $state(false);
	let draft = $state(initialDraft());
	let pending = $state(false);
	let error = $state('');
	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	let rendered = $derived(renderMarkdown(value ?? ''));

	$effect(() => {
		if (editing && textareaEl) textareaEl.focus();
	});

	function startEditing(): void {
		draft = value ?? '';
		error = '';
		editing = true;
	}

	function cancel(): void {
		draft = value ?? '';
		error = '';
		editing = false;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
		}
	}

	const submit: SubmitFunction = () => {
		pending = true;
		error = '';
		return async ({ result }) => {
			pending = false;
			if (result.type === 'success') {
				editing = false;
				await invalidateAll();
			} else {
				error =
					result.type === 'failure' && typeof result.data?.error === 'string'
						? result.data.error
						: 'Could not save this field.';
			}
		};
	};
</script>

<!-- eslint-disable svelte/no-at-html-tags -- renderMarkdown escapes all HTML and only emits a fixed tag set -->
<section class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-5">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-sm font-semibold text-white">{label}</h2>
			<p class="mt-1 text-xs text-slate-500">
				Minimal markdown: headings, bold, italic, lists, code and links.
			</p>
		</div>
		{#if !editing}
			<button
				type="button"
				onclick={startEditing}
				class="inline-flex min-h-9 items-center rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				{value ? 'Edit' : 'Add'}
			</button>
		{/if}
	</div>

	{#if editing}
		<form method="POST" action="?/saveMarkdown" use:enhance={submit} class="mt-4">
			<input type="hidden" name="field" value={field} />
			<label for={`medical-markdown-${field}`} class="sr-only">{label}</label>
			<textarea
				id={`medical-markdown-${field}`}
				name="value"
				bind:this={textareaEl}
				bind:value={draft}
				{maxlength}
				rows="8"
				onkeydown={handleKeydown}
				{placeholder}
				class="block w-full resize-y rounded-xl border border-cyan-200/15 bg-[#081422] px-3 py-2 font-mono text-sm leading-relaxed text-slate-100 transition placeholder:text-slate-600 hover:border-cyan-200/30 focus:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
			></textarea>
			<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
				<p class="text-xs text-slate-500">{draft.length}/{maxlength} characters</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={cancel}
						disabled={pending}
						class="min-h-9 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={pending}
						class="min-h-9 rounded-lg bg-cyan-400 px-3 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{pending ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
			{#if error}
				<p role="alert" class="mt-2 text-xs text-rose-300">{error}</p>
			{/if}
		</form>
	{:else if value}
		<div
			class="prose prose-sm mt-4 max-w-none prose-invert prose-headings:text-white prose-p:text-slate-300 prose-a:text-cyan-300 prose-strong:text-white prose-code:text-cyan-200 prose-li:text-slate-300"
		>
			{@html rendered}
		</div>
	{:else}
		<p
			class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400"
		>
			{placeholder}
		</p>
	{/if}
</section>

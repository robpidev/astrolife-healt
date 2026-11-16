<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import MedicalEntryDialog from '#lib/components/medical/MedicalEntryDialog.svelte';
	import { allergySeverities } from '#lib/data/medical.js';
	import type { MedicalEntry, MedicalEntryKind } from '#lib/interfaces/medical-profile.js';

	interface Props {
		kind: MedicalEntryKind;
		title: string;
		entries: readonly MedicalEntry[];
		emptyLabel: string;
	}

	let { kind, title, entries, emptyLabel }: Props = $props();

	let showDialog = $state(false);
	let removingId = $state<string | null>(null);
	let error = $state('');

	function severityLabel(value: string): string {
		return allergySeverities.find((option) => option.value === value)?.label ?? value;
	}

	const removeSubmit: SubmitFunction = () => {
		error = '';
		return async ({ result }) => {
			removingId = null;
			if (result.type === 'success') {
				await invalidateAll();
			} else {
				error =
					result.type === 'failure' && typeof result.data?.error === 'string'
						? result.data.error
						: 'Could not remove the entry.';
			}
		};
	};
</script>

<section class="rounded-2xl border border-cyan-200/15 bg-[#0b1729]/80 p-5">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold text-white">{title}</h2>
			<p class="mt-0.5 text-xs text-slate-500">{entries.length} recorded</p>
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

	{#if entries.length}
		<ul class="mt-4 divide-y divide-white/10">
			{#each entries as entry (entry.id)}
				<li class="flex items-start justify-between gap-3 py-3">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<p class="text-sm font-medium text-slate-100">{entry.name}</p>
							{#if entry.severity}
								<span
									class="rounded-md border border-amber-300/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-200 uppercase"
								>
									{severityLabel(entry.severity)}
								</span>
							{/if}
							{#if entry.dose}
								<span
									class="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-cyan-200"
								>
									{entry.dose}
								</span>
							{/if}
						</div>
						{#if entry.note}
							<p class="mt-1 text-xs leading-relaxed text-slate-400">{entry.note}</p>
						{/if}
					</div>
					<form method="POST" action="?/removeEntry" use:enhance={removeSubmit}>
						<input type="hidden" name="id" value={entry.id} />
						<button
							type="submit"
							disabled={removingId === entry.id}
							onclick={() => (removingId = entry.id)}
							aria-label={`Remove ${entry.name}`}
							class="min-h-9 rounded-lg border border-rose-300/20 px-2.5 text-xs font-medium text-rose-200 transition hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-rose-300 disabled:opacity-50"
						>
							{removingId === entry.id ? 'Removing…' : 'Remove'}
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<p
			class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400"
		>
			{emptyLabel}
		</p>
	{/if}

	{#if error}
		<p role="alert" class="mt-2 text-xs text-rose-300">{error}</p>
	{/if}
</section>

{#if showDialog}
	<MedicalEntryDialog {kind} {title} onclose={() => (showDialog = false)} />
{/if}

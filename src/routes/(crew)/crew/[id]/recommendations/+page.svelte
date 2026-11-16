<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import HealthStatusBadge from '#lib/components/health/HealthStatusBadge.svelte';
	import type { Directive, GroundMessage } from '#lib/interfaces/health.js';
	import { formatDate } from '#lib/utils/date.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let directives = $derived(data.directives as Directive[]);
	let messages = $derived(data.messages as GroundMessage[]);
	let recentMessages = $derived(messages.slice(0, 5));
	let lastSync = $derived(messages[0]?.synced_at ?? null);
	let feedback = $derived(form && 'message' in form ? form.message : null);

	const priorityLabel: Record<Directive['priority'], string> = {
		high: 'High priority',
		medium: 'Medium priority',
		routine: 'Routine'
	};

	const priorityTone: Record<Directive['priority'], string> = {
		high: 'text-rose-200',
		medium: 'text-amber-200',
		routine: 'text-cyan-200'
	};

	const kindLabel: Record<GroundMessage['kind'], string> = {
		alert: 'Alert',
		recommendation: 'Directive',
		consult: 'Consult',
		sync: 'Sync'
	};

	function shortDate(value: string): string {
		return formatDate(value.slice(0, 10));
	}
</script>

<svelte:head>
	<title>Directives · Astrolife</title>
</svelte:head>

<section class="space-y-5">
	<header class="border-b border-cyan-200/10 pb-4">
		<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Ground control</p>
		<h1 class="text-xl font-semibold tracking-tight text-white sm:text-2xl">Directives</h1>
	</header>

	{#if feedback}
		<p class="text-xs text-cyan-200" role="status" aria-live="polite">{feedback}</p>
	{/if}

	<div class="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)]">
		<div class="space-y-3">
			<ul class="space-y-3">
				{#each directives as directive (directive.id)}
					<li class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<h2 class="text-sm font-semibold text-slate-100">{directive.title}</h2>
								<p class="mt-1 text-xs leading-relaxed text-slate-400">{directive.reason}</p>
							</div>
							<HealthStatusBadge severity={directive.severity} />
						</div>

						<div
							class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3"
						>
							<p
								class="font-mono text-[11px] tracking-[0.12em] uppercase {priorityTone[
									directive.priority
								]}"
							>
								{priorityLabel[directive.priority]}
							</p>

							<form
								method="POST"
								action="?/send"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="kind" value="recommendation" />
								<input type="hidden" name="body" value={directive.title} />
								<button
									type="submit"
									class="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-200/50 hover:bg-cyan-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
								>
									Send to ground
								</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<aside aria-labelledby="ground-link" class="space-y-3">
			<div class="rounded-xl border border-cyan-200/15 bg-[#08172a] p-4">
				<h2 id="ground-link" class="text-xs tracking-[0.18em] text-slate-500 uppercase">
					Ground link
				</h2>
				{#if lastSync}
					<p class="mt-2 flex items-center gap-2 text-sm text-slate-200">
						<span
							aria-hidden="true"
							class="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60"
						></span>
						Online
						<span aria-hidden="true" class="text-slate-600">·</span>
						<span class="text-xs text-slate-400">last sync {shortDate(lastSync)}</span>
					</p>
				{:else}
					<p class="mt-2 flex items-center gap-2 text-sm text-slate-400">
						<span aria-hidden="true" class="size-2 rounded-full bg-slate-500"></span>
						No transmissions yet
					</p>
				{/if}
			</div>

			{#if recentMessages.length > 0}
				<div class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
					<h3 class="text-xs tracking-[0.18em] text-slate-500 uppercase">Transmissions</h3>
					<ul class="mt-3 space-y-3">
						{#each recentMessages as message (message.id)}
							<li class="border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
								<div class="flex items-center justify-between gap-2">
									<span class="font-mono text-[10px] tracking-[0.12em] text-cyan-200/80 uppercase">
										{message.direction === 'up' ? '↑ Up' : '↓ Down'} · {kindLabel[message.kind]}
									</span>
									<span class="text-[11px] text-slate-500">
										{shortDate(message.synced_at ?? message.created_at)}
									</span>
								</div>
								<p class="mt-1 text-xs leading-relaxed text-slate-300">{message.body}</p>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</aside>
	</div>
</section>

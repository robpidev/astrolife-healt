<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { HealthAlert } from '#lib/interfaces/health.js';
	import { formatDate } from '#lib/utils/date.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let alerts = $derived(data.alerts as HealthAlert[]);
	let activeAlerts = $derived(alerts.filter((alert) => !alert.acknowledged));
	let acknowledgedAlerts = $derived(alerts.filter((alert) => alert.acknowledged));
	let feedback = $derived(form && 'message' in form ? form.message : null);

	let criticalCount = $derived(alerts.filter((alert) => alert.severity === 'red').length);
	let cautionCount = $derived(alerts.filter((alert) => alert.severity === 'yellow').length);

	let groups = $derived(
		[
			{
				severity: 'red' as const,
				title: 'Critical',
				alerts: activeAlerts.filter((alert) => alert.severity === 'red')
			},
			{
				severity: 'yellow' as const,
				title: 'Caution',
				alerts: activeAlerts.filter((alert) => alert.severity === 'yellow')
			}
		].filter((group) => group.alerts.length > 0)
	);

	function measuredDate(value: string): string {
		return formatDate(value.slice(0, 10));
	}

	function dotClass(severity: HealthAlert['severity']): string {
		return severity === 'red'
			? 'bg-rose-400 shadow-rose-400/60'
			: 'bg-amber-300 shadow-amber-300/60';
	}
</script>

<svelte:head>
	<title>Warnings · Astrolife</title>
</svelte:head>

<section class="space-y-5">
	<header class="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-200/10 pb-4">
		<div>
			<p class="text-xs tracking-[0.18em] text-slate-500 uppercase">Health surveillance</p>
			<h1 class="text-xl font-semibold tracking-tight text-white sm:text-2xl">Warnings</h1>
		</div>
		<p class="font-mono text-xs tracking-[0.12em] text-slate-400 uppercase">
			<span class="text-rose-300">{criticalCount} critical</span>
			<span aria-hidden="true" class="mx-2 text-slate-600">·</span>
			<span class="text-amber-200">{cautionCount} caution</span>
		</p>
	</header>

	{#if feedback}
		<p class="text-xs text-cyan-200" role="status" aria-live="polite">{feedback}</p>
	{/if}

	{#if alerts.length === 0}
		<div class="rounded-xl border border-emerald-300/20 bg-emerald-400/5 px-4 py-6 text-center">
			<p class="text-sm font-medium text-emerald-200">All monitored indicators are within range.</p>
			<p class="mt-1 text-xs text-slate-400">No warnings require acknowledgement right now.</p>
		</div>
	{:else}
		{#each groups as group (group.severity)}
			<section aria-labelledby={`alerts-${group.severity}`} class="space-y-3">
				<div class="flex items-center gap-2">
					<span
						aria-hidden="true"
						class="size-2 rounded-full shadow-[0_0_10px] {dotClass(group.severity)}"
					></span>
					<h2
						id={`alerts-${group.severity}`}
						class="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase"
					>
						{group.title}
					</h2>
					<span class="font-mono text-[11px] text-slate-500">{group.alerts.length}</span>
				</div>

				<ul class="space-y-2">
					{#each group.alerts as alert (`${alert.indicator}:${alert.reading_id}`)}
						<li
							class="rounded-xl border bg-[#0b1b2e] p-4 {alert.severity === 'red'
								? 'border-rose-300/30'
								: 'border-cyan-200/15'}"
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span
											aria-hidden="true"
											class="size-1.5 shrink-0 rounded-full shadow-[0_0_8px] {dotClass(
												alert.severity
											)}"
										></span>
										<p class="text-sm font-medium text-slate-100">{alert.label}</p>
									</div>
									<p class="mt-2 font-mono text-2xl font-light tracking-tight text-cyan-100">
										{alert.value}
										{#if alert.unit}<span class="ml-1 text-xs font-normal text-slate-500"
												>{alert.unit}</span
											>{/if}
									</p>
									<p class="mt-1 text-xs text-slate-500">
										{measuredDate(alert.measured_at)}
									</p>
								</div>

								<form
									method="POST"
									action="?/acknowledge"
									class="shrink-0"
									use:enhance={() => {
										return async ({ update }) => {
											await update();
											await invalidateAll();
										};
									}}
								>
									<input type="hidden" name="indicator" value={alert.indicator} />
									<input type="hidden" name="reading_id" value={alert.reading_id} />
									<button
										type="submit"
										class="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-200/50 hover:bg-cyan-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
									>
										Acknowledge
									</button>
								</form>
							</div>

							<p class="mt-3 border-t border-white/5 pt-3 text-sm leading-relaxed text-slate-300">
								{alert.protocol}
							</p>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}

	{#if acknowledgedAlerts.length > 0}
		<section aria-labelledby="alerts-acknowledged" class="space-y-3">
			<h2
				id="alerts-acknowledged"
				class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase"
			>
				Acknowledged
			</h2>
			<ul class="space-y-2">
				{#each acknowledgedAlerts as alert (`ack-${alert.indicator}:${alert.reading_id}`)}
					<li class="rounded-xl border border-white/5 bg-white/[0.02] p-4 opacity-60">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-slate-300">{alert.label}</p>
								<p class="mt-1 font-mono text-sm text-slate-400">
									{alert.value}
									{#if alert.unit}<span class="ml-1 text-xs text-slate-500">{alert.unit}</span>{/if}
								</p>
								<p class="mt-1 text-xs text-slate-500">{measuredDate(alert.measured_at)}</p>
							</div>
							<span
								class="rounded-full border border-slate-300/20 bg-slate-400/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-300 uppercase"
							>
								Acknowledged
							</span>
						</div>
						<p class="mt-3 border-t border-white/5 pt-3 text-sm leading-relaxed text-slate-400">
							{alert.protocol}
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</section>

<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { BmiTone, MeasurementWithBmi } from '#lib/interfaces/measurement.js';
	import { formatDate } from '#lib/utils/date.js';
	import MeasurementForm from './MeasurementForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let editing = $state<MeasurementWithBmi | null>(null);
	let deletingId = $state<number | null>(null);

	const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

	const toneClasses: Record<BmiTone, string> = {
		low: 'bg-sky-50 text-sky-700 ring-sky-200',
		normal: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		high: 'bg-amber-50 text-amber-700 ring-amber-200',
		obese: 'bg-rose-50 text-rose-700 ring-rose-200'
	};

	function toneClass(tone: BmiTone): string {
		return toneClasses[tone];
	}

	let latest = $derived(data.summary.latest);
	let massDelta = $derived(data.summary.mass_delta);
	let deltaLabel = $derived(
		massDelta === null
			? null
			: `${massDelta > 0 ? '↑' : massDelta < 0 ? '↓' : '→'} ${numberFormat.format(Math.abs(massDelta))} kg`
	);
	let hasMeasurements = $derived(data.measurements.length > 0);
	let formMessage = $derived(form && 'message' in form ? form.message : null);
	let formError = $derived(form && 'error' in form ? form.error : null);
	let formForMeasurement = $derived(
		!form ||
			form.action === 'delete' ||
			(form.action === 'create' && editing !== null) ||
			(form.action === 'update' && form.id !== editing?.id)
			? null
			: form
	);
	let recordLabel = $derived(
		`${data.measurements.length} ${data.measurements.length === 1 ? 'registro' : 'registros'}`
	);

	async function startEdit(measurement: MeasurementWithBmi): Promise<void> {
		editing = measurement;
		await tick();
		document
			.getElementById('measurement-form')
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function cancelEdit(): void {
		editing = null;
	}
</script>

<svelte:head>
	<title>Mediciones · Astrolife</title>
	<meta
		name="description"
		content="Registra y revisa tu masa, talla, índice de masa corporal, presión arterial y pulso."
	/>
</svelte:head>

<div>
	<div class="max-w-2xl">
		<p class="text-xs font-semibold tracking-[0.2em] text-teal-700 uppercase">Panel de salud</p>
		<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
			Monitoreo de salud
		</h1>
		<p class="mt-2 text-base text-slate-600">
			Registra tu masa, talla y signos vitales para ver cómo evolucionan con el tiempo.
		</p>
	</div>

	{#if formMessage}
		<div
			role="status"
			class="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mt-0.5 size-4 shrink-0"
				aria-hidden="true"
			>
				<path d="M20 6 9 17l-5-5" />
			</svg>
			<p>{formMessage}</p>
		</div>
	{/if}

	{#if formError}
		<div
			role="alert"
			class="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mt-0.5 size-4 shrink-0"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 8v4M12 16h.01" />
			</svg>
			<p>{formError}</p>
		</div>
	{/if}

	<section aria-labelledby="resumen-heading" class="mt-8">
		<h2 id="resumen-heading" class="sr-only">Resumen de tu salud</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<article
				class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50"
			>
				<h3 class="text-xs font-semibold tracking-wider text-slate-500 uppercase">Última masa</h3>
				{#if latest}
					<p class="mt-3 flex items-baseline gap-1.5 text-slate-900">
						<span class="text-3xl font-semibold tracking-tight tabular-nums">
							{numberFormat.format(latest.mass_kg)}
						</span>
						<span class="text-sm font-medium text-slate-500">kg</span>
					</p>
					<p class="mt-1 text-sm text-slate-500">
						{#if deltaLabel}
							<span class="font-medium text-slate-600 tabular-nums">{deltaLabel}</span>
							desde el registro anterior
						{:else}
							Sin registros previos
						{/if}
					</p>
				{:else}
					<p class="mt-3 text-2xl font-semibold text-slate-500">Sin datos</p>
				{/if}
			</article>

			<article
				class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50"
			>
				<h3 class="text-xs font-semibold tracking-wider text-slate-500 uppercase">Talla</h3>
				{#if latest}
					<p class="mt-3 flex items-baseline gap-1.5 text-slate-900">
						<span class="text-3xl font-semibold tracking-tight tabular-nums">
							{numberFormat.format(latest.height_cm)}
						</span>
						<span class="text-sm font-medium text-slate-500">cm</span>
					</p>
					<p class="mt-1 text-sm text-slate-500">Estatura del último registro</p>
				{:else}
					<p class="mt-3 text-2xl font-semibold text-slate-500">Sin datos</p>
				{/if}
			</article>

			<article
				class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50"
			>
				<h3 class="text-xs font-semibold tracking-wider text-slate-500 uppercase">IMC</h3>
				{#if latest}
					<p class="mt-3 flex flex-wrap items-center gap-2">
						<span class="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
							{numberFormat.format(latest.bmi)}
						</span>
						<span
							class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset {toneClass(
								latest.bmi_tone
							)}"
						>
							{latest.bmi_label}
						</span>
					</p>
					<p class="mt-1 text-sm text-slate-500">Calculado con masa y talla</p>
				{:else}
					<p class="mt-3 text-2xl font-semibold text-slate-500">Sin datos</p>
				{/if}
			</article>

			<article
				class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50"
			>
				<h3 class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
					Presión y pulso
				</h3>
				{#if latest}
					{#if latest.systolic != null || latest.diastolic != null}
						<p class="mt-3 flex items-baseline gap-1.5 text-slate-900">
							<span class="text-3xl font-semibold tracking-tight tabular-nums">
								{latest.systolic ?? '—'}/{latest.diastolic ?? '—'}
							</span>
							<span class="text-sm font-medium text-slate-500">mmHg</span>
						</p>
					{:else}
						<p class="mt-3 text-xl font-semibold text-slate-500">Sin registro</p>
					{/if}
					<p class="mt-1 text-sm text-slate-500">
						Pulso:
						{#if latest.pulse != null}
							<span class="font-medium text-slate-700 tabular-nums">{latest.pulse} lpm</span>
						{:else}
							Sin registro
						{/if}
					</p>
				{:else}
					<p class="mt-3 text-2xl font-semibold text-slate-500">Sin datos</p>
				{/if}
			</article>
		</div>
	</section>

	<section
		id="measurement-form"
		aria-labelledby="measurement-form-heading"
		class="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50"
	>
		<div class="border-b border-slate-100 px-5 py-4 sm:px-6">
			<h2 id="measurement-form-heading" class="text-lg font-semibold tracking-tight text-slate-900">
				{editing ? 'Editar medición' : 'Nueva medición'}
			</h2>
			<p class="mt-1 text-sm text-slate-500">
				{editing
					? 'Actualiza los valores y guarda los cambios.'
					: 'Completa la masa y la talla; el resto de los datos es opcional.'}
			</p>
		</div>
		<div class="px-5 py-5 sm:px-6">
			{#key formForMeasurement?.values ?? editing?.id ?? 'new'}
				<MeasurementForm
					measurement={editing}
					today={data.today}
					form={formForMeasurement}
					onSaved={cancelEdit}
					onCancel={cancelEdit}
				/>
			{/key}
		</div>
	</section>

	<section
		aria-labelledby="historial-heading"
		class="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50"
	>
		<div
			class="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:px-6"
		>
			<h2 id="historial-heading" class="text-lg font-semibold tracking-tight text-slate-900">
				Historial
			</h2>
			<p class="text-sm text-slate-500">{recordLabel}</p>
		</div>

		{#if hasMeasurements}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (a scrollable table needs keyboard access) -->
			<div
				role="region"
				aria-label="Historial de mediciones"
				tabindex="0"
				class="overflow-x-auto focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none focus-visible:ring-inset"
			>
				<table class="min-w-[52rem] divide-y divide-slate-200 text-sm">
					<caption class="sr-only">
						Historial de mediciones de salud, ordenado de la más reciente a la más antigua
					</caption>
					<thead class="bg-slate-50/80 text-left text-xs tracking-wide text-slate-500 uppercase">
						<tr>
							<th scope="col" class="px-4 py-3 font-semibold whitespace-nowrap sm:px-6">Fecha</th>
							<th scope="col" class="px-4 py-3 font-semibold whitespace-nowrap">Masa</th>
							<th scope="col" class="px-4 py-3 font-semibold whitespace-nowrap">Talla</th>
							<th scope="col" class="px-4 py-3 font-semibold whitespace-nowrap">IMC</th>
							<th scope="col" class="px-4 py-3 font-semibold whitespace-nowrap">Presión</th>
							<th scope="col" class="px-4 py-3 font-semibold whitespace-nowrap">Pulso</th>
							<th scope="col" class="px-4 py-3 font-semibold">Notas</th>
							<th scope="col" class="px-4 py-3 text-right font-semibold whitespace-nowrap sm:px-6">
								Acciones
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each data.measurements as measurement (measurement.id)}
							<tr class="transition hover:bg-slate-50/70">
								<td class="px-4 py-3 whitespace-nowrap sm:px-6">
									<time datetime={measurement.measured_at} class="font-medium text-slate-900">
										{formatDate(measurement.measured_at)}
									</time>
								</td>
								<td class="px-4 py-3 whitespace-nowrap text-slate-700 tabular-nums">
									{numberFormat.format(measurement.mass_kg)} kg
								</td>
								<td class="px-4 py-3 whitespace-nowrap text-slate-700 tabular-nums">
									{numberFormat.format(measurement.height_cm)} cm
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span
										class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset {toneClass(
											measurement.bmi_tone
										)}"
									>
										<span class="tabular-nums">{numberFormat.format(measurement.bmi)}</span>
										<span class="font-medium opacity-80">{measurement.bmi_label}</span>
									</span>
								</td>
								<td class="px-4 py-3 whitespace-nowrap text-slate-700 tabular-nums">
									{#if measurement.systolic != null || measurement.diastolic != null}
										{measurement.systolic ?? '—'}/{measurement.diastolic ?? '—'}
										<span class="text-xs text-slate-500">mmHg</span>
									{:else}
										<span class="text-slate-500">—</span>
									{/if}
								</td>
								<td class="px-4 py-3 whitespace-nowrap text-slate-700 tabular-nums">
									{#if measurement.pulse != null}
										{measurement.pulse} <span class="text-xs text-slate-500">lpm</span>
									{:else}
										<span class="text-slate-500">—</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									{#if measurement.notes}
										<span class="block max-w-40 truncate text-slate-600" title={measurement.notes}>
											{measurement.notes}
										</span>
									{:else}
										<span class="text-slate-500">—</span>
									{/if}
								</td>
								<td class="px-4 py-3 sm:px-6">
									<div class="flex items-center justify-end gap-2">
										<button
											type="button"
											onclick={() => startEdit(measurement)}
											aria-label="Editar la medición del {formatDate(measurement.measured_at)}"
											class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none"
										>
											Editar
										</button>
										<form
											method="POST"
											action="?/delete"
											use:enhance={({ cancel }) => {
												// use:enhance ignores defaultPrevented, so the confirmation must call cancel()
												if (
													!confirm(
														`¿Eliminar la medición del ${formatDate(measurement.measured_at)}?`
													)
												) {
													cancel();
													return;
												}

												deletingId = measurement.id;

												return async ({ result, update }) => {
													try {
														await update();
														if (result.type === 'success') {
															if (editing?.id === measurement.id) editing = null;
															await invalidateAll();
														}
													} finally {
														deletingId = null;
													}
												};
											}}
										>
											<input type="hidden" name="id" value={measurement.id} />
											<button
												type="submit"
												disabled={deletingId === measurement.id}
												aria-busy={deletingId === measurement.id}
												aria-label="Eliminar la medición del {formatDate(measurement.measured_at)}"
												class="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
											>
												{deletingId === measurement.id ? 'Eliminando…' : 'Eliminar'}
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="px-5 py-12 text-center sm:px-6">
				<div class="mx-auto grid size-12 place-items-center rounded-full bg-teal-50 text-teal-600">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="size-6"
						aria-hidden="true"
					>
						<path d="M3 12h3l2-5 3 10 2.5-6 1.5 1h6" />
					</svg>
				</div>
				<h3 class="mt-4 text-base font-semibold text-slate-900">Aún no hay mediciones</h3>
				<p class="mt-1 text-sm text-slate-500">Registra tu primera masa y talla para empezar.</p>
				<a
					href="#measurement-form"
					class="mt-5 inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					Registrar mi primera medición
				</a>
			</div>
		{/if}
	</section>
</div>

<script lang="ts">
	interface Reading {
		id: string;
		metric_code: string;
		value: number | null;
		measured_at: string;
		source: string;
		warning: string | null;
		systolic: number | null;
		diastolic: number | null;
	}

	interface Metric {
		code: string;
		label: string;
		unit: string;
	}

	interface Point {
		x: number;
		y: number;
		value: number;
	}

	let { readings, metric = null }: { readings: Reading[]; metric?: string | null } = $props();

	const metrics: Metric[] = [
		{ code: 'heart_rate', label: 'Frecuencia cardíaca', unit: 'lpm' },
		{ code: 'blood_pressure', label: 'Presión arterial', unit: 'mmHg' },
		{ code: 'spo2', label: 'Saturación de oxígeno', unit: '%' }
	];
	const dateFormatter = new Intl.DateTimeFormat('es-PE', {
		timeZone: 'America/Lima',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
	const numberFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });

	function formatDate(value: string): string {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : dateFormatter.format(date);
	}

	function formatNumber(value: number | null): string {
		return value === null || !Number.isFinite(value) ? '—' : numberFormatter.format(value);
	}

	function isSimulated(source: string): boolean {
		return /simulat|simulad/i.test(source);
	}

	function stats(values: number[]): {
		min: number | null;
		max: number | null;
		average: number | null;
	} {
		return values.length
			? {
					min: Math.min(...values),
					max: Math.max(...values),
					average: values.reduce((sum, value) => sum + value, 0) / values.length
				}
			: { min: null, max: null, average: null };
	}

	function makeChart(definition: Metric) {
		const rows = readings
			.filter((reading) => reading.metric_code === definition.code)
			.filter((reading) => Number.isFinite(new Date(reading.measured_at).getTime()))
			.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
		const fields =
			definition.code === 'blood_pressure'
				? [
						{ key: 'systolic' as const, label: 'Sistólica', color: 'text-cyan-300' },
						{ key: 'diastolic' as const, label: 'Diastólica', color: 'text-violet-300' }
					]
				: [{ key: 'value' as const, label: definition.label, color: 'text-cyan-300' }];
		const allValues = rows
			.flatMap((reading) => fields.map((field) => reading[field.key]))
			.filter((value): value is number => value !== null && Number.isFinite(value));
		const minimum = allValues.length ? Math.min(...allValues) : 0;
		const maximum = allValues.length ? Math.max(...allValues) : 1;
		const padding = maximum === minimum ? 1 : (maximum - minimum) * 0.1;
		const low = minimum - padding;
		const high = maximum + padding;
		const firstTime = rows.length ? new Date(rows[0].measured_at).getTime() : 0;
		const lastTime = rows.length ? new Date(rows[rows.length - 1].measured_at).getTime() : 0;
		const series = fields.map((field) => {
			const points: Point[] = rows.flatMap((reading) => {
				const value = reading[field.key];
				if (value === null || !Number.isFinite(value)) return [];
				return [
					{
						x:
							lastTime === firstTime
								? 250
								: 45 +
									((new Date(reading.measured_at).getTime() - firstTime) / (lastTime - firstTime)) *
										425,
						y: 150 - ((value - low) / (high - low)) * 130,
						value
					}
				];
			});
			return {
				...field,
				points,
				path: points.map((point) => `${point.x},${point.y}`).join(' '),
				statistics: stats(points.map((point) => point.value))
			};
		});
		const latest = rows.at(-1) ?? null;
		return { ...definition, rows, latest, series, hasValues: allValues.length > 0, low, high };
	}

	let charts = $derived(
		metrics.filter((definition) => metric === null || definition.code === metric).map(makeChart)
	);
	let tableRows = $derived(
		readings
			.filter((reading) => metric === null || reading.metric_code === metric)
			.map((reading) => ({
				...reading,
				label:
					metrics.find((definition) => definition.code === reading.metric_code)?.label ??
					reading.metric_code,
				unit: metrics.find((definition) => definition.code === reading.metric_code)?.unit ?? '',
				date: formatDate(reading.measured_at),
				simulated: isSimulated(reading.source),
				displayValue:
					reading.metric_code === 'blood_pressure'
						? formatNumber(reading.systolic) + ' / ' + formatNumber(reading.diastolic)
						: formatNumber(reading.value)
			}))
			.sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())
	);
</script>

<svelte:head>
	<title>{metric ? charts[0]?.label : 'Cardiovascular'} · Astrolife Health</title>
</svelte:head>

<div class="space-y-6">
	<header class="border-b border-cyan-200/10 pb-4">
		<p class="mb-1 text-xs tracking-widest text-cyan-300 uppercase">Mediciones cardiovasculares</p>
		<h2 class="text-xl font-semibold text-white sm:text-2xl">
			{metric ? charts[0]?.label : 'Cardiovascular'}
		</h2>
		<p class="mt-2 text-xs text-slate-400">
			Últimos siete días registrados · Fechas en hora de Lima
		</p>
		<p class="mt-1 text-xs text-slate-500">
			Ventana de siete días hasta la última lectura disponible.
		</p>
	</header>
	{#each charts as chart (chart.code)}
		<section class="space-y-4" aria-label={chart.label}>
			<div class="rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="text-sm font-medium text-slate-200">
						{chart.label}
					</h3>
					{#if chart.latest && isSimulated(chart.latest.source)}
						<span
							class="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs text-amber-200"
						>
							Simulado
						</span>
					{:else if chart.latest?.source === 'manual'}
						<span
							class="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-200"
							>Manual</span
						>
					{:else if chart.latest}
						<span
							class="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-200"
							>{chart.latest.source === 'sensor' ? 'Sensor' : chart.latest.source}</span
						>
					{/if}
				</div>
				<p class="mt-3 text-3xl font-light text-cyan-100">
					{#if chart.latest}
						{chart.code === 'blood_pressure'
							? formatNumber(chart.latest.systolic) + ' / ' + formatNumber(chart.latest.diastolic)
							: formatNumber(chart.latest.value)}
					{:else}
						—
					{/if}
					<span class="text-xs text-slate-400">
						{chart.unit}
					</span>
				</p>
				<p class="mt-2 text-xs text-slate-500">
					{chart.latest
						? 'Última lectura: ' + formatDate(chart.latest.measured_at)
						: 'Sin mediciones registradas.'}
				</p>
				{#if chart.latest?.warning}
					<p
						role="status"
						class="mt-3 rounded-lg border border-amber-200/20 bg-amber-200/5 p-3 text-sm leading-relaxed text-amber-100"
					>
						{chart.latest.warning}
					</p>
				{/if}
			</div>
			<div class="rounded-xl border border-cyan-200/10 bg-[#081322] p-4">
				<h4 class="text-sm font-medium text-slate-200">
					Evolución · {chart.unit}
				</h4>
				{#if chart.hasValues}
					<svg
						viewBox="0 0 500 185"
						class="mt-3 h-48 w-full"
						role="img"
						aria-label="Evolución de {chart.label}. Valores detallados en la tabla de lecturas."
					>
						<path
							d="M45 15v140h425M45 20h425M45 85h425"
							fill="none"
							stroke="#334155"
							stroke-width="1"
						/>
						<text x="0" y="25" fill="#94a3b8" font-size="11">
							{formatNumber(chart.high)}
						</text>
						<text x="0" y="152" fill="#94a3b8" font-size="11">
							{formatNumber(chart.low)}
						</text>
						{#each chart.series as series (series.key)}
							<g class={series.color}>
								<polyline points={series.path} fill="none" stroke="currentColor" stroke-width="2" />
								{#each series.points as point, index (index)}
									<circle cx={point.x} cy={point.y} r="3" fill="currentColor">
										<title>
											{series.label}: {formatNumber(point.value)}
											{chart.unit}
										</title>
									</circle>
								{/each}
							</g>
						{/each}
					</svg>
					<div class="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
						<span>
							{formatDate(chart.rows[0].measured_at)}
						</span>
						<span>
							{formatDate(chart.rows[chart.rows.length - 1].measured_at)}
						</span>
					</div>
					<div class="mt-3 flex flex-wrap gap-4 text-xs">
						{#each chart.series as series (series.key)}
							<span class={series.color}>
								● {series.label}
							</span>
						{/each}
					</div>
				{:else}
					<p class="py-12 text-center text-sm text-slate-500">
						Sin datos para mostrar la evolución.
					</p>
				{/if}
			</div>
			{#each chart.series as series (series.key)}
				<div class="rounded-xl border border-cyan-200/10 p-4">
					<h4 class="text-xs font-medium {series.color}">
						{series.label} · Estadísticas ({chart.unit})
					</h4>
					<dl class="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
						<div>
							<dt class="text-slate-500">Mínimo</dt>
							<dd class="mt-2 text-lg text-slate-200">
								{formatNumber(series.statistics.min)}
							</dd>
						</div>
						<div>
							<dt class="text-slate-500">Promedio</dt>
							<dd class="mt-2 text-lg text-slate-200">
								{formatNumber(series.statistics.average)}
							</dd>
						</div>
						<div>
							<dt class="text-slate-500">Máximo</dt>
							<dd class="mt-2 text-lg text-slate-200">
								{formatNumber(series.statistics.max)}
							</dd>
						</div>
					</dl>
				</div>
			{/each}
		</section>
	{/each}
	<section aria-label="Historial de lecturas" class="min-w-0">
		<h3 class="mb-3 text-sm font-semibold text-slate-200">Lecturas registradas</h3>
		{#if tableRows.length}
			<div class="overflow-x-auto rounded-xl border border-cyan-200/10">
				<table class="w-full text-left text-xs">
					<caption class="sr-only">
						Lecturas cardiovasculares con fecha en hora de Lima y origen de los datos
					</caption>
					<thead class="bg-cyan-300/5 text-slate-400">
						<tr>
							<th scope="col" class="p-3"> Fecha (Lima) </th>
							<th scope="col" class="p-3"> Medición </th>
							<th scope="col" class="p-3"> Valor </th>
							<th scope="col" class="p-3"> Origen </th>
						</tr>
					</thead>
					<tbody class="divide-y divide-cyan-200/10">
						{#each tableRows as row (row.id)}
							<tr>
								<td class="p-3 text-slate-400">
									{row.date}
								</td>
								<td class="p-3 text-slate-300">
									{row.label}
								</td>
								<td class="p-3 whitespace-nowrap text-cyan-100">
									{row.displayValue}
									{row.unit}
								</td>
								<td class="p-3">
									{#if row.simulated}
										<span class="rounded-full bg-amber-300/10 px-2 py-1 text-amber-200">
											Simulado
										</span>
									{:else}
										<span class="text-slate-400">
											{row.source}
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="rounded-xl border border-dashed border-cyan-200/15 p-6 text-sm text-slate-500">
				No hay lecturas registradas para esta selección.
			</p>
		{/if}
	</section>
</div>

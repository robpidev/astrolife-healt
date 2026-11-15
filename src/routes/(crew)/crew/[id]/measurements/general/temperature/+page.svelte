<script lang="ts">
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import MetricChart from '#lib/components/metrics/MetricChart.svelte';
	import MetricStatistics from '#lib/components/metrics/MetricStatistics.svelte';
	import MetricForm from '#lib/components/metrics/MetricForm.svelte';

	// Keep the supplied reference data local to this page; other measurements are unchanged.
	const referenceRanges = [
		{
			id: 'blood-pressure',
			parameter: 'Presión arterial',
			normal: '120/80 mmHg aprox.',
			abnormal: '> 140/90 o < 90/60 mmHg',
			high: 'Dolor de cabeza, problemas cardíacos y accidentes cerebrovasculares',
			low: 'Mareos, debilidad y desmayos'
		},
		{
			id: 'heart-rate',
			parameter: 'Frecuencia cardíaca',
			normal: '60 a 100 lpm en adultos (reposo)',
			abnormal: '> 100 o < 60 lpm',
			high: 'Palpitaciones, cansancio y falta de aire',
			low: 'Mareos, debilidad y desmayos'
		},
		{
			id: 'blood-glucose',
			parameter: 'Glucosa en sangre',
			normal: '70 a 99 mg/dL en ayunas',
			abnormal: '≥ 126 o < 70 mg/dL en ayunas',
			high: 'Mucha sed, cansancio y riesgo de diabetes',
			low: 'Temblores, sudoración, mareos y desmayos'
		},
		{
			id: 'temperature',
			parameter: 'Temperatura corporal',
			normal: '36 °C a 37.5 °C aprox.',
			abnormal: '≥ 38 °C o < 35 °C',
			high: 'Fiebre, dolor de cabeza y deshidratación',
			low: 'Escalofríos, confusión y pérdida de calor corporal'
		},
		{
			id: 'sleep',
			parameter: 'Horas de sueño y estado de ánimo',
			normal: '7 a 9 horas diarias',
			abnormal: '< 7 horas o en exceso frecuente',
			high: 'Cansancio diurno, bajo estado de ánimo y alteraciones del sueño',
			low: 'Irritabilidad, estrés, ansiedad, cansancio y falta de concentración'
		}
	] as const;
</script>

<svelte:head>
	<title>Body temperature · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<MetricCard title="Body temperature" unit="°C" />

	<section
		aria-labelledby="temperature-range-title"
		class="rounded-2xl border border-cyan-300/15 bg-[#0b1b2e] p-5 sm:p-6"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
					Guía de referencia
				</p>
				<h2 id="temperature-range-title" class="mt-1 text-lg font-semibold text-white">
					Temperatura corporal
				</h2>
			</div>
			<span
				class="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
			>
				Valores aproximados
			</span>
		</div>

		<div class="mt-5 grid gap-3 sm:grid-cols-3">
			<div class="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4">
				<p class="text-xs font-medium text-emerald-200">Rango normal</p>
				<p class="mt-2 text-xl font-semibold text-white">36–37.5 °C</p>
			</div>
			<div class="rounded-xl border border-amber-300/20 bg-amber-400/10 p-4">
				<p class="text-xs font-medium text-amber-200">Nivel alto</p>
				<p class="mt-2 text-xl font-semibold text-white">≥ 38 °C</p>
			</div>
			<div class="rounded-xl border border-sky-300/20 bg-sky-400/10 p-4">
				<p class="text-xs font-medium text-sky-200">Nivel bajo</p>
				<p class="mt-2 text-xl font-semibold text-white">&lt; 35 °C</p>
			</div>
		</div>

		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			<div class="rounded-xl border border-white/10 bg-white/5 p-4">
				<h3 class="text-sm font-semibold text-amber-200">Consecuencias de temperatura alta</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-300">
					Fiebre, dolor de cabeza y deshidratación.
				</p>
			</div>
			<div class="rounded-xl border border-white/10 bg-white/5 p-4">
				<h3 class="text-sm font-semibold text-sky-200">Consecuencias de temperatura baja</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-300">
					Escalofríos, confusión y pérdida de calor corporal.
				</p>
			</div>
		</div>
		<p class="mt-4 text-xs leading-relaxed text-slate-400">
			Los rangos proceden de la tabla de referencia proporcionada y no sustituyen una evaluación
			médica.
		</p>
	</section>

	<details class="group rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
		<summary
			class="cursor-pointer rounded-md text-sm font-semibold text-white outline-offset-4 marker:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
		>
			Tabla completa de parámetros y consecuencias
		</summary>
		<p class="mt-3 text-sm text-slate-400">
			Referencia de la imagen: presión arterial, frecuencia cardíaca, glucosa, temperatura y sueño.
		</p>
		<div class="mt-4 overflow-x-auto rounded-xl border border-white/10">
			<table class="w-full min-w-[850px] border-collapse text-left text-sm">
				<thead class="bg-cyan-950/80 text-cyan-100">
					<tr>
						<th scope="col" class="px-4 py-3 font-semibold">Parámetro</th>
						<th scope="col" class="px-4 py-3 font-semibold">Rango normal</th>
						<th scope="col" class="px-4 py-3 font-semibold">Rango anormal</th>
						<th scope="col" class="px-4 py-3 font-semibold">Consecuencias (nivel alto / mayor)</th>
						<th scope="col" class="px-4 py-3 font-semibold">Consecuencias (nivel bajo / menor)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/10">
					{#each referenceRanges as range (range.id)}
						<tr class={range.id === 'temperature' ? 'bg-cyan-300/10' : 'bg-slate-950/25'}>
							<th scope="row" class="px-4 py-3 align-top font-medium text-white"
								>{range.parameter}</th
							>
							<td class="px-4 py-3 align-top text-slate-300">{range.normal}</td>
							<td class="px-4 py-3 align-top text-slate-300">{range.abnormal}</td>
							<td class="px-4 py-3 align-top text-slate-300">{range.high}</td>
							<td class="px-4 py-3 align-top text-slate-300">{range.low}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>

	<MetricChart />
	<MetricStatistics />
	<MetricForm label="Body temperature" unit="°C" />
</div>

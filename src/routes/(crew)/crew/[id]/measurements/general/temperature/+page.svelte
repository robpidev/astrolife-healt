<script lang="ts">
	import MetricCard from '#lib/components/metrics/MetricCard.svelte';
	import { assessHealthIndicator } from '#lib/utils/health-assessment.js';
	import TemperatureEntryDialog from './TemperatureEntryDialog.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let showEntry = $state(false);
	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'America/Lima'
	});
	let rows = $derived(
		data.readings.map((reading) => ({
			...reading,
			dateLabel: dateFormatter.format(new Date(reading.measured_at)),
			status: assessHealthIndicator('temperature', reading.value).label
		}))
	);
	let latest = $derived(rows[0] ?? null);
	let statistics = $derived.by(() => {
		if (!rows.length) return null;
		const values = rows.map((row) => row.value);
		return {
			min: Math.min(...values),
			max: Math.max(...values),
			average: values.reduce((sum, value) => sum + value, 0) / values.length
		};
	});
	let trend = $derived.by(() => {
		const entries = rows.slice(0, 12).reverse();
		if (!entries.length) return { points: [], line: '' };
		const low = Math.min(...entries.map((entry) => entry.value)) - 0.5;
		const high = Math.max(...entries.map((entry) => entry.value)) + 0.5;
		const points = entries.map((entry, index) => ({
			...entry,
			x: 25 + (entries.length === 1 ? 200 : (index / (entries.length - 1)) * 400),
			y: 116 - ((entry.value - low) / (high - low)) * 90
		}));
		return { points, line: points.map((point) => `${point.x},${point.y}`).join(' ') };
	});
	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	// Adult screening references: the measurement method and clinical context affect interpretation.
	const referenceRanges = [
		{
			id: 'blood-pressure',
			parameter: 'Blood pressure (adults)',
			normal: 'Systolic <120 AND diastolic <80 mmHg',
			abnormal:
				'Elevated: 120–129 / <80; stage 1: 130–139 OR 80–89; stage 2: ≥140 OR ≥90; low: <90/60',
			high: 'Often no symptoms; persistent hypertension increases heart attack and stroke risk.',
			low: 'Can cause dizziness, fatigue, blurred vision or fainting; not every low reading causes symptoms.',
			source: 'American Heart Association',
			sourceUrl:
				'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings'
		},
		{
			id: 'heart-rate',
			parameter: 'Resting heart rate (adults)',
			normal: '60–100 beats/min at rest',
			abnormal: '>100 beats/min or <60 beats/min at rest; <60 can be normal in trained athletes',
			high: 'Fast pulse may occur with exercise, fever or stress; concerning symptoms include palpitations and breathlessness.',
			low: 'A slow pulse may be harmless; if symptomatic, it can be linked to dizziness, weakness or fainting.',
			source: 'MedlinePlus',
			sourceUrl: 'https://medlineplus.gov/ency/article/002341.htm'
		},
		{
			id: 'blood-glucose',
			parameter: 'Fasting blood glucose',
			normal: '70–99 mg/dL (fasting)',
			abnormal:
				'100–125 mg/dL: prediabetes range; ≥126 mg/dL: diabetes range; <70 mg/dL: low glucose',
			high: 'May involve thirst or fatigue; diabetes-range results generally require confirmation by a clinician.',
			low: 'May cause shaking, sweating, hunger, dizziness or confusion; treat low glucose promptly.',
			source: 'CDC',
			sourceUrl: 'https://www.cdc.gov/diabetes/diabetes-testing/'
		},
		{
			id: 'temperature',
			parameter: 'Body temperature (adults)',
			normal: 'About 36.5–37.3 °C at rest; varies by measurement site and time',
			abnormal: '≥38 °C: fever; <35 °C: hypothermia (medical emergency)',
			high: 'Fever may be accompanied by chills, sweating or dehydration; the cause needs context.',
			low: 'Shivering, confusion, slowed breathing or extreme drowsiness can indicate hypothermia.',
			source: 'MedlinePlus / NHS',
			sourceUrl: 'https://medlineplus.gov/ency/article/002341.htm'
		},
		{
			id: 'sleep',
			parameter: 'Sleep duration (adults)',
			normal: 'Generally 7–9 hours/night',
			abnormal: '<7 hours regularly: insufficient; >9 hours is not automatically abnormal',
			high: 'Long sleep may be appropriate during recovery or illness; persistent excessive sleepiness deserves assessment.',
			low: 'Regularly short sleep is associated with fatigue, poor concentration and long-term health risks.',
			source: 'NIH / NHLBI',
			sourceUrl: 'https://www.nhlbi.nih.gov/health/sleep/how-much-sleep'
		}
	] as const;

	const statusClasses = {
		normal: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
		caution: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
		high: 'border-orange-300/25 bg-orange-300/10 text-orange-200',
		low: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
		urgent: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
		unavailable: 'border-white/15 bg-white/5 text-slate-400'
	} as const;

	let comparisons = $derived(
		referenceRanges.map((reference) => {
			const saved =
				reference.id === 'blood-pressure'
					? data.healthReadings.bloodPressure
					: reference.id === 'heart-rate'
						? data.healthReadings.heartRate
						: reference.id === 'blood-glucose'
							? data.healthReadings.fastingGlucose
							: reference.id === 'sleep'
								? data.healthReadings.sleepDuration
								: latest;
			const value = saved?.value ?? null;
			const systolic = saved && 'systolic' in saved ? saved.systolic : null;
			const diastolic = saved && 'diastolic' in saved ? saved.diastolic : null;
			const assessment = saved
				? assessHealthIndicator(reference.id, value, systolic, diastolic)
				: { label: 'No recorded data', tone: 'unavailable' as const };
			const measuredValue =
				reference.id === 'blood-pressure'
					? !saved
						? 'No recorded data'
						: systolic != null && diastolic != null
							? `${systolic}/${diastolic} mmHg`
							: 'No complete reading'
					: value === null
						? 'No recorded data'
						: `${formatter.format(value)} ${reference.id === 'heart-rate' ? 'bpm' : reference.id === 'blood-glucose' ? 'mg/dL' : reference.id === 'sleep' ? 'hours' : '°C'}`;
			return {
				...reference,
				measuredValue,
				assessment,
				recordedAt: saved ? dateFormatter.format(new Date(saved.measured_at)) : null,
				measurementSource: saved?.source ?? null
			};
		})
	);
</script>

<svelte:head>
	<title>Body temperature · Astrolife</title>
</svelte:head>

<div class="space-y-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="min-w-[180px] flex-1">
			<MetricCard title="Latest recorded temperature" value={latest?.value ?? null} unit="°C" />
		</div>
		<button
			type="button"
			onclick={() => (showEntry = true)}
			class="flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 active:scale-[0.98]"
		>
			<span aria-hidden="true" class="text-xl">+</span> Add reading
		</button>
	</div>
	{#if latest}
		<p class="text-sm text-slate-400">
			Latest reading: <strong class="font-medium text-slate-200">{latest.dateLabel}</strong>
			<span
				class="ml-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-cyan-200"
				>{latest.status}</span
			>
		</p>
	{:else}
		<p class="text-sm text-slate-400">
			No temperature readings have been recorded for this astronaut yet.
		</p>
	{/if}

	<section
		aria-labelledby="temperature-range-title"
		class="rounded-2xl border border-cyan-300/15 bg-[#0b1b2e] p-5 sm:p-6"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
					Clinical reference guide · saved readings
				</p>
				<h2 id="temperature-range-title" class="mt-1 text-lg font-semibold text-white">
					Body temperature
				</h2>
			</div>
			<span
				class="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
			>
				Adults · general screening
			</span>
		</div>

		<div class="mt-5 grid gap-3 sm:grid-cols-3">
			<div class="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4">
				<p class="text-xs font-medium text-emerald-200">Typical resting range</p>
				<p class="mt-2 text-xl font-semibold text-white">36.5–37.3 °C</p>
			</div>
			<div class="rounded-xl border border-amber-300/20 bg-amber-400/10 p-4">
				<p class="text-xs font-medium text-amber-200">Fever threshold</p>
				<p class="mt-2 text-xl font-semibold text-white">≥ 38 °C</p>
			</div>
			<div class="rounded-xl border border-sky-300/20 bg-sky-400/10 p-4">
				<p class="text-xs font-medium text-sky-200">Hypothermia threshold</p>
				<p class="mt-2 text-xl font-semibold text-white">&lt; 35 °C</p>
			</div>
		</div>

		<div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4" aria-live="polite">
			<p class="text-xs font-semibold tracking-wider text-cyan-200 uppercase">
				Latest saved measurement vs clinical range
			</p>
			<div class="mt-3 flex flex-wrap items-center gap-3">
				<p class="text-2xl font-semibold text-white tabular-nums">
					{latest ? `${formatter.format(latest.value)} °C` : 'No recorded data'}
				</p>
				<span
					class="rounded-lg border px-3 py-1.5 text-xs font-semibold {statusClasses[
						assessHealthIndicator('temperature', latest?.value ?? null).tone
					]}"
				>
					{assessHealthIndicator('temperature', latest?.value ?? null).label}
				</span>
			</div>
			<p class="mt-2 text-xs leading-relaxed text-slate-400">
				{latest
					? `${latest.dateLabel} · ${latest.source === 'sensor' ? 'Sensor reading' : 'Manual entry'} · Compared against resting adult screening ranges.`
					: 'Add a measured temperature using the Add reading button to enable a comparison. No demo values are used.'}
			</p>
		</div>

		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			<div
				class="rounded-xl border {latest && latest.value >= 38
					? 'border-amber-300/35 bg-amber-400/10'
					: 'border-white/10 bg-white/5'} p-4"
			>
				<h3 class="text-sm font-semibold text-amber-200">Possible signs of fever</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-300">
					{#if latest && latest.value >= 38}
						This reading meets the usual fever threshold. Watch for chills, sweating, feeling hot or
						cold, headache and dehydration.
					{:else if latest && latest.value < 35}
						This reading is in the hypothermia range, not the fever range. Seek emergency care.
					{:else if latest}
						The latest reading is below 38 °C. Fever symptoms can still occur at lower readings.
						Signs to watch for include chills, sweating and feeling hot or cold.
					{:else}
						No temperature has been recorded. Fever may involve chills, sweating and feeling
						unusually hot or cold.
					{/if}
				</p>
				<p class="mt-2 text-xs leading-relaxed text-slate-400">
					These are possible symptoms, not symptoms observed or reported for this astronaut.
				</p>
			</div>
			<div
				class="rounded-xl border {latest && latest.value < 35
					? 'border-rose-300/35 bg-rose-400/10'
					: 'border-white/10 bg-white/5'} p-4"
			>
				<h3 class="text-sm font-semibold text-sky-200">Possible signs of hypothermia</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-300">
					{#if latest && latest.value < 35}
						This reading is below 35 °C, a medical emergency threshold. Seek emergency care
						immediately. Possible signs include shivering, confusion and slowed breathing.
					{:else}
						Shivering, confusion, slowed breathing and drowsiness can be warning signs. Below 35 °C
						is a medical emergency.
					{/if}
				</p>
			</div>
		</div>
		<p class="mt-4 text-xs leading-relaxed text-slate-400">
			General adult reference values vary by thermometer site, time of day and individual factors. A
			single reading cannot diagnose an illness or confirm symptoms. Seek urgent medical care for
			suspected hypothermia or severe symptoms.
		</p>
	</section>

	<section
		class="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"
		aria-labelledby="health-comparison-title"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
					Clinical comparison
				</p>
				<h2 id="health-comparison-title" class="mt-1 text-lg font-semibold text-white">
					Actual readings vs reference values
				</h2>
			</div>
			<span
				class="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
				>Selected astronaut only</span
			>
		</div>
		<p class="mt-3 text-sm leading-relaxed text-slate-400">
			Measurements are taken from saved manual or sensor records in SQLite; simulated data is
			excluded. Indicators without measurements show “No recorded data” rather than example values.
			Only body temperature currently has an entry form here; other values appear when saved by
			their own data sources. These are general adult references, not flight-medicine limits.
		</p>
		<div class="mt-5 grid gap-3 md:grid-cols-2">
			{#each comparisons as item (item.id)}
				<article
					class="rounded-xl border {item.id === 'temperature'
						? 'border-cyan-300/25 bg-cyan-300/5'
						: 'border-white/10 bg-[#0a1728]'} p-4"
				>
					<div class="flex flex-wrap items-start justify-between gap-2">
						<h3 class="font-semibold text-white">{item.parameter}</h3>
						<span
							class="rounded-lg border px-2.5 py-1 text-xs font-medium {statusClasses[
								item.assessment.tone
							]}">{item.assessment.label}</span
						>
					</div>
					<dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<dt class="text-xs text-slate-400">Latest real reading</dt>
							<dd class="mt-1 text-lg font-semibold text-white tabular-nums">
								{item.measuredValue}
							</dd>
							{#if item.recordedAt}
								<p class="mt-1 text-xs text-slate-500">
									{item.recordedAt} · {item.measurementSource === 'sensor' ? 'Sensor' : 'Manual'}
								</p>
							{/if}
						</div>
						<div>
							<dt class="text-xs text-slate-400">Adult reference</dt>
							<dd class="mt-1 text-sm leading-relaxed font-medium text-cyan-100">{item.normal}</dd>
						</div>
					</dl>
					<details class="group mt-4 border-t border-white/10 pt-3">
						<summary
							class="cursor-pointer text-xs font-semibold text-cyan-200 outline-offset-2 focus-visible:outline-2 focus-visible:outline-cyan-300"
							>Thresholds, possible symptoms and source</summary
						>
						<div class="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
							<p><strong class="text-slate-200">Other thresholds:</strong> {item.abnormal}</p>
							<p><strong class="text-slate-200">Higher values:</strong> {item.high}</p>
							<p><strong class="text-slate-200">Lower values:</strong> {item.low}</p>
							<p>
								<a
									href={item.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-cyan-300 underline underline-offset-2">Source: {item.source}</a
								>
							</p>
						</div>
					</details>
				</article>
			{/each}
		</div>
		<p class="mt-4 text-xs leading-relaxed text-slate-400">
			Blood pressure classifications are based on a single saved reading, not the repeated
			measurements needed for diagnosis. Heart-rate reference assumes rest; fasting-glucose
			thresholds apply only to fasting readings. Sleep needs and body temperature vary individually.
		</p>
		<div class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-cyan-300">
			<a
				href="https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings"
				target="_blank"
				rel="noopener noreferrer"
				class="underline underline-offset-2">AHA · Blood pressure</a
			>
			<a
				href="https://medlineplus.gov/ency/article/002341.htm"
				target="_blank"
				rel="noopener noreferrer"
				class="underline underline-offset-2">MedlinePlus · Vital signs</a
			>
			<a
				href="https://www.cdc.gov/diabetes/diabetes-testing/"
				target="_blank"
				rel="noopener noreferrer"
				class="underline underline-offset-2">CDC · Glucose</a
			>
			<a
				href="https://www.nhlbi.nih.gov/health/sleep/how-much-sleep"
				target="_blank"
				rel="noopener noreferrer"
				class="underline underline-offset-2">NIH · Sleep</a
			>
			<a
				href="https://www.nhs.uk/symptoms/fever-in-adults/"
				target="_blank"
				rel="noopener noreferrer"
				class="underline underline-offset-2">NHS · Fever</a
			>
			<a
				href="https://www.nhs.uk/conditions/hypothermia/"
				target="_blank"
				rel="noopener noreferrer"
				class="underline underline-offset-2">NHS · Hypothermia</a
			>
		</div>
	</section>

	<section
		class="rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
		aria-labelledby="temperature-trend-title"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 id="temperature-trend-title" class="font-semibold text-white">Temperature trend</h2>
			<span class="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400"
				>Last 12 readings</span
			>
		</div>
		{#if trend.points.length}
			<svg
				viewBox="0 0 450 145"
				class="mt-4 h-36 w-full"
				preserveAspectRatio="none"
				role="img"
				aria-label="Recorded temperatures, oldest to newest"
			>
				<path
					d="M25 20H425M25 70H425M25 120H425"
					fill="none"
					stroke="#334155"
					stroke-width="1"
					stroke-dasharray="4 5"
				/>
				{#if trend.points.length > 1}
					<polyline
						points={trend.line}
						fill="none"
						stroke="#67e8f9"
						stroke-width="2.5"
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
				{/if}
				{#each trend.points as point (point.id)}
					<circle
						cx={point.x}
						cy={point.y}
						r="4.5"
						fill="#67e8f9"
						stroke="#0b1729"
						stroke-width="2"
					>
						<title>{formatter.format(point.value)} °C · {point.dateLabel}</title>
					</circle>
				{/each}
			</svg>
			<div class="flex justify-between text-xs text-slate-500">
				<span>Oldest</span><span>Newest</span>
			</div>
		{:else}
			<div
				class="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400"
			>
				Your trend chart will appear after you add the first reading.
			</div>
		{/if}
	</section>

	<section
		class="rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
		aria-labelledby="temperature-stats-title"
	>
		<h2 id="temperature-stats-title" class="font-semibold text-white">Statistics</h2>
		<dl class="mt-4 grid grid-cols-3 gap-2 text-center">
			<div class="rounded-xl bg-white/5 p-3">
				<dt class="text-xs text-slate-400">Minimum</dt>
				<dd class="mt-2 text-xl font-semibold text-sky-200 tabular-nums">
					{statistics ? formatter.format(statistics.min) : '—'}
					<span class="text-xs font-normal">°C</span>
				</dd>
			</div>
			<div class="rounded-xl bg-white/5 p-3">
				<dt class="text-xs text-slate-400">Average</dt>
				<dd class="mt-2 text-xl font-semibold text-white tabular-nums">
					{statistics ? formatter.format(statistics.average) : '—'}
					<span class="text-xs font-normal">°C</span>
				</dd>
			</div>
			<div class="rounded-xl bg-white/5 p-3">
				<dt class="text-xs text-slate-400">Maximum</dt>
				<dd class="mt-2 text-xl font-semibold text-amber-200 tabular-nums">
					{statistics ? formatter.format(statistics.max) : '—'}
					<span class="text-xs font-normal">°C</span>
				</dd>
			</div>
		</dl>
		<p class="mt-3 text-center text-xs text-slate-500">
			Calculated from the last {rows.length} saved readings (up to 90).
		</p>
	</section>

	<section
		aria-labelledby="temperature-history-title"
		class="rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 id="temperature-history-title" class="font-semibold text-white">Temperature history</h2>
			<span class="text-xs text-slate-400">{rows.length} readings</span>
		</div>
		{#if rows.length}
			<ul class="mt-4 max-h-64 divide-y divide-white/10 overflow-y-auto">
				{#each rows as reading (reading.id)}
					<li class="flex items-center justify-between gap-3 py-3">
						<div class="min-w-0">
							<p class="text-sm font-semibold text-slate-100 tabular-nums">
								{formatter.format(reading.value)} °C
							</p>
							<p class="mt-1 text-xs text-slate-400">
								{reading.dateLabel} · {reading.source === 'sensor'
									? 'Sensor reading'
									: 'Manual entry'}
							</p>
						</div>
						<span
							class="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-200"
							>{reading.status}</span
						>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-4 text-sm text-slate-400">
				No readings yet. Select “Add reading” to get started.
			</p>
		{/if}
	</section>

	{#if showEntry}
		<TemperatureEntryDialog onclose={() => (showEntry = false)} />
	{/if}
</div>

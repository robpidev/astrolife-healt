<script lang="ts">
	// The reference links point to external sources, so they cannot be resolved.
	/* eslint-disable svelte/no-navigation-without-resolve */
	import MetricDetail from '#lib/components/metrics/MetricDetail.svelte';
	import type { MetricReading } from '#lib/interfaces/health-area.js';
	import { assessHealthIndicator } from '#lib/utils/health-assessment.js';
	import TemperatureEntryDialog from './TemperatureEntryDialog.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let showEntry = $state(false);
	// `entry` stays null so the shared header never opens the generic dialog;
	// the keypad sheet below is the only entry point for temperature.
	let basePath = $derived('/crew/' + data.astronaut.id);
	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	// The temperature page has its own keypad dialog and its own action, so the
	// shared detail view receives the readings only and keeps `entry` empty.
	let readings = $derived<MetricReading[]>(
		data.readings.map((reading) => ({ ...reading, secondary: null, detail: null }))
	);

	let reference = $derived.by(() => {
		const latest = data.readings[0]?.value ?? null;
		const band = assessHealthIndicator('temperature', latest);
		return {
			label: 'Typical resting range 36.5–37.3 °C · fever from 38 °C · hypothermia below 35 °C',
			tone: band.tone
		};
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

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	let latest = $derived(data.readings[0] ?? null);
	let latestAssessment = $derived(assessHealthIndicator('temperature', latest?.value ?? null));

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

	let recordedCount = $derived(comparisons.filter((item) => item.recordedAt).length);
</script>

<MetricDetail
	areaId="general"
	areaLabel="General health"
	label="Body temperature"
	unit="°C"
	{basePath}
	{readings}
	decimals={1}
	indicator="temperature"
	entry={null}
	referenceLabel={reference.label}
	referenceMin={36.5}
	referenceMax={37.3}
>
	{#snippet form()}
		<!-- The shared entry config stays empty for temperature; this button opens the keypad dialog. -->
		<section
			class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-200/15 bg-[#0b1b2e] p-4"
		>
			<p class="text-sm text-slate-400">
				Temperature uses the dedicated keypad sheet so a reading can be entered without a keyboard.
			</p>
			<button
				type="button"
				onclick={() => (showEntry = true)}
				class="inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				<span aria-hidden="true" class="mr-1.5">+</span> Add reading
			</button>
		</section>
	{/snippet}

	<section
		aria-labelledby="temperature-reference-title"
		class="rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
	>
		<details>
			<summary
				class="cursor-pointer list-none marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				<span class="flex flex-wrap items-center justify-between gap-3">
					<span>
						<span class="block text-xs font-semibold tracking-wider text-cyan-300 uppercase">
							Clinical reference
						</span>
						<span
							id="temperature-reference-title"
							class="mt-1 block text-lg font-semibold text-white"
						>
							Range, symptoms and sources
						</span>
					</span>
					<span
						class="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
					>
						Adults · {recordedCount}/5 indicators recorded
					</span>
				</span>
			</summary>

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
							latestAssessment.tone
						]}"
					>
						{latestAssessment.label}
					</span>
				</div>
				<p class="mt-2 text-xs leading-relaxed text-slate-400">
					{latest
						? `${dateFormatter.format(new Date(latest.measured_at))} · ${latest.source === 'sensor' ? 'Sensor reading' : 'Manual entry'} · Compared against resting adult screening ranges.`
						: 'Add a measured temperature using Add reading to enable a comparison. No demo values are used.'}
				</p>
			</div>

			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				<div
					class="rounded-xl border p-4 {latestAssessment.tone === 'high' ||
					latestAssessment.tone === 'urgent'
						? 'border-amber-300/35 bg-amber-400/10'
						: 'border-white/10 bg-white/5'}"
				>
					<h3 class="text-sm font-semibold text-amber-200">Possible signs of fever</h3>
					<p class="mt-2 text-sm leading-relaxed text-slate-300">
						{#if latest && latest.value >= 38}
							This reading meets the usual fever threshold. Watch for chills, sweating, feeling hot
							or cold, headache and dehydration.
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
					class="rounded-xl border p-4 {latest && latest.value < 35
						? 'border-rose-300/35 bg-rose-400/10'
						: 'border-white/10 bg-white/5'}"
				>
					<h3 class="text-sm font-semibold text-sky-200">Possible signs of hypothermia</h3>
					<p class="mt-2 text-sm leading-relaxed text-slate-300">
						{#if latest && latest.value < 35}
							This reading is below 35 °C, a medical emergency threshold. Seek emergency care
							immediately. Possible signs include shivering, confusion and slowed breathing.
						{:else}
							Shivering, confusion, slowed breathing and drowsiness can be warning signs. Below 35
							°C is a medical emergency.
						{/if}
					</p>
				</div>
			</div>
			<p class="mt-4 text-xs leading-relaxed text-slate-400">
				General adult reference values vary by thermometer site, time of day and individual factors.
				A single reading cannot diagnose an illness or confirm symptoms. Seek urgent medical care
				for suspected hypothermia or severe symptoms.
			</p>
		</details>
	</section>

	<section
		class="rounded-2xl border border-cyan-200/10 bg-[#081322] p-5"
		aria-labelledby="health-comparison-title"
	>
		<details>
			<summary
				class="cursor-pointer list-none marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
			>
				<span class="flex flex-wrap items-center justify-between gap-3">
					<span>
						<span class="block text-xs font-semibold tracking-wider text-cyan-300 uppercase">
							Clinical comparison
						</span>
						<span id="health-comparison-title" class="mt-1 block text-lg font-semibold text-white">
							Actual readings vs reference values
						</span>
					</span>
					<span class="text-xs text-slate-500">
						{recordedCount} of {comparisons.length} with data
					</span>
				</span>
			</summary>

			<p class="mt-4 text-sm leading-relaxed text-slate-400">
				Values come from saved manual or sensor records; simulated data is excluded. Indicators
				without measurements show “No recorded data” rather than example values. These are general
				adult references, not flight-medicine limits.
			</p>

			<div class="mt-4 grid gap-3 md:grid-cols-2">
				{#each comparisons as item (item.id)}
					<article
						class="rounded-xl border p-4 {item.id === 'temperature'
							? 'border-cyan-300/25 bg-cyan-300/5'
							: 'border-white/10 bg-[#0a1728]'}"
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
								<dt class="text-xs text-slate-400">Latest reading</dt>
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
								<dd class="mt-1 text-sm leading-relaxed font-medium text-cyan-100">
									{item.normal}
								</dd>
							</div>
						</dl>
						<details class="mt-4 border-t border-white/10 pt-3">
							<summary
								class="cursor-pointer text-xs font-semibold text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-300"
								>Thresholds, symptoms and source</summary
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
				thresholds apply only to fasting readings.
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
		</details>
	</section>
</MetricDetail>

{#if showEntry}
	<TemperatureEntryDialog onclose={() => (showEntry = false)} />
{/if}

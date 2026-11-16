import {
	RADIATION_STALE_DAYS,
	radiationGuidelines,
	radiationOrganLabels
} from '#lib/data/radiation.js';
import type {
	RadiationAssessment,
	RadiationEnvironment,
	RadiationGuideline,
	RadiationOrgan,
	RadiationProfile,
	RadiationStatus,
	RadiationSummary
} from '#lib/interfaces/radiation.js';
import type { HealthSeverity } from '#lib/interfaces/health.js';

/** One dated radiation value, already in the guideline unit. */
export interface RadiationReading {
	value: number;
	measured_at: string;
}

/** Organ dose row: organ code in `detail`, value in `value`. */
export interface OrganReading extends RadiationReading {
	organ: RadiationOrgan | null;
}

export interface RadiationInput {
	/** Interval effective doses (`radiation_interval`). */
	intervals: readonly RadiationReading[];
	/** Digitised organ readings (`radiation_organ`). */
	organs: readonly OrganReading[];
	/** Effective dose of the open or closed solar particle events. */
	speEvents: readonly RadiationReading[];
	environment: RadiationEnvironment;
	environmentSet: boolean;
	/** `true` while a solar particle event is open; only then can SPE go stale. */
	speAlertActive?: boolean;
	/** Per-astronaut settings, echoed into the summary. */
	profile?: RadiationProfile;
	/** Reference instant for the windows; defaults to now. */
	now?: Date;
}

const DAY_MS = 86_400_000;

function toTime(value: string): number {
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? Number.NaN : time;
}

/** Lower bound of a window, as a timestamp; `null` means "no lower bound". */
export function windowStart(days: number, now: Date): number {
	return now.getTime() - days * DAY_MS;
}

function inWindow(reading: RadiationReading, start: number | null): boolean {
	const time = toTime(reading.measured_at);
	return Number.isFinite(time) && (start === null || time >= start);
}

function sum(values: readonly number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

function round(value: number, decimals = 2): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function newest(readings: readonly RadiationReading[]): string | null {
	if (readings.length === 0) return null;
	return readings.reduce(
		(latest, reading) =>
			toTime(reading.measured_at) > toTime(latest) ? reading.measured_at : latest,
		readings[0].measured_at
	);
}

function isStale(recordedAt: string | null, now: Date): boolean {
	if (recordedAt === null) return false;
	return now.getTime() - toTime(recordedAt) > RADIATION_STALE_DAYS * DAY_MS;
}

export function formatDose(value: number, unit: string): string {
	// Daily rates live below 1 mSv, so they need an extra decimal to be useful.
	const decimals = unit === 'mSv/day' ? 2 : value < 10 ? 2 : value < 100 ? 1 : 0;
	return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * `measured` is compared with the stricter of the guideline limit and the
 * environment-specific one, so a surface habitat can never pass on the
 * free-space allowance.
 */
export function appliedLimit(guideline: RadiationGuideline, environment: RadiationEnvironment) {
	return guideline.environment_limits?.[environment] ?? guideline.limit;
}

export function assessRadiation(
	guideline: RadiationGuideline,
	measured: number | null,
	appliedLimitValue: number,
	recordedAt: string | null,
	readingCount: number,
	now: Date,
	/**
	 * Only current-state limits (the GCR rate, an open SPE event) go stale. A
	 * cumulative or window sum remains a valid answer without a fresh reading,
	 * so career and organ limits must not be downgraded just because no one
	 * logged anything today.
	 */
	staleEligible = true
): RadiationAssessment {
	if (measured === null) {
		return {
			guideline,
			applied_limit: appliedLimitValue,
			measured: null,
			ratio: null,
			display: null,
			status: 'unknown',
			protocol:
				guideline.id === 'spe'
					? 'No solar particle event is open or recorded.'
					: 'Log a radiation reading to assess this limit.',
			recorded_at: null,
			stale: false,
			reading_count: 0
		};
	}

	const ratio = measured / appliedLimitValue;
	const stale = staleEligible && isStale(recordedAt, now);

	let status: RadiationStatus;
	let protocol: string;

	if (ratio >= 1) {
		status = 'red';
		protocol =
			guideline.id === 'spe'
				? 'SPE limit reached. Shelter in the most shielded zone and notify the flight surgeon.'
				: 'Limit exceeded. Review shielding, curtail the exposure, and notify the flight surgeon.';
	} else if (ratio >= guideline.warning_ratio) {
		status = 'yellow';
		protocol =
			guideline.id === 'gcr'
				? 'Approaching the daily limit. Increase habitat shielding and log the next reading.'
				: guideline.id === 'career'
					? 'Close to the career limit. Avoid non-essential exposure and plan the remaining flights.'
					: 'Approaching the window limit. Review shielding and keep logging organ doses.';
	} else if (stale) {
		status = 'stale';
		protocol = 'The last reading is too old to certify this limit. Log a new reading.';
	} else {
		status = 'green';
		protocol =
			guideline.id === 'gcr'
				? 'Shielding keeps the daily rate inside the limit. Continue monitoring.'
				: 'Inside the limit. Continue the routine monitoring.';
	}

	return {
		guideline,
		applied_limit: appliedLimitValue,
		measured,
		ratio: Math.round(ratio * 1000) / 1000,
		display: formatDose(measured, guideline.unit),
		status,
		protocol,
		recorded_at: recordedAt,
		stale,
		reading_count: readingCount
	};
}

const STALE_RANK: Record<RadiationStatus, number> = {
	unknown: 0,
	green: 1,
	stale: 2,
	yellow: 3,
	red: 4
};

/** Worst status, with a stale log outranking a green pass. */
export function worstRadiationStatus(statuses: readonly RadiationStatus[]): HealthSeverity {
	const worst = statuses.reduce<RadiationStatus>(
		(current, status) => (STALE_RANK[status] > STALE_RANK[current] ? status : current),
		'unknown'
	);

	if (worst === 'red' || worst === 'yellow') return worst;
	if (worst === 'stale') return 'yellow';
	return worst === 'green' ? 'green' : 'unknown';
}

function assessmentFor(
	guideline: RadiationGuideline,
	input: RadiationInput,
	now: Date
): RadiationAssessment {
	const limit = appliedLimit(guideline, input.environment);

	if (guideline.id === 'career') {
		// The career limit is a lifetime figure, so there is no lower bound: an
		// exposure from twenty years ago still counts against the 600 mSv ceiling.
		const intervals = input.intervals.filter((reading) => inWindow(reading, null));
		// A closed event is also part of the career total; the open one is
		// counted too, so the ceiling cannot look safe mid-event. The zero-value
		// row that opens each event is a boundary marker, not a dose, so it must
		// not inflate the reading count shown next to the total.
		const events = input.speEvents.filter(
			(reading) => reading.value > 0 && inWindow(reading, null)
		);
		const readings = [...intervals, ...events];
		const measured = readings.length === 0 ? null : round(sum(readings.map((r) => r.value)), 2);

		return assessRadiation(
			guideline,
			measured,
			limit,
			newest(readings),
			readings.length,
			now,
			false
		);
	}

	if (guideline.id === 'gcr') {
		if (!input.environmentSet) {
			return {
				...assessRadiation(guideline, null, limit, null, 0, now),
				status: 'unknown',
				protocol: 'Set the habitat on the Radiation page to evaluate the daily GCR rate.'
			};
		}

		const start = windowStart(guideline.window_days ?? 1, now);
		const readings = input.intervals.filter((reading) => inWindow(reading, start));

		if (readings.length === 0) {
			return assessRadiation(guideline, null, limit, null, 0, now);
		}

		// Interval doses are logged once per measured day, so the measured days
		// are the honest denominator; calendar days would invent unlogged ones.
		const days = new Set(readings.map((reading) => reading.measured_at.slice(0, 10))).size;
		const measured = round(sum(readings.map((reading) => reading.value)) / Math.max(days, 1), 3);

		return assessRadiation(guideline, measured, limit, newest(readings), readings.length, now);
	}

	if (guideline.id === 'spe') {
		// One event spans several segments; the event opens with a zero row and
		// every segment after it belongs to the same event. The limit is per
		// event, so the worst recorded event sets the status: a closed event that
		// breached 250 mSv must never be hidden by a quiet event that followed.
		const events: { segments: RadiationReading[] }[] = [];
		const ordered = [...input.speEvents].sort(
			(a, b) => toTime(a.measured_at) - toTime(b.measured_at)
		);

		for (const reading of ordered) {
			const event = events.at(-1);
			if (reading.value === 0 || !event) {
				events.push({ segments: [] });
				continue;
			}
			event.segments.push(reading);
		}

		const totals = events
			.map((event) => ({
				segments: event.segments,
				total: sum(event.segments.map((segment) => segment.value))
			}))
			.filter((event) => event.segments.length > 0);
		const worst = totals.reduce<(typeof totals)[number] | null>(
			(current, event) => (!current || event.total > current.total ? event : current),
			null
		);
		const readings = worst?.segments ?? [];
		const measured = worst === null ? null : round(worst.total, 2);

		return assessRadiation(
			guideline,
			measured,
			limit,
			newest(readings),
			readings.length,
			now,
			// An event is a closed figure once it ends, so only the open one can
			// be reported as stale.
			input.speAlertActive === true
		);
	}

	const organ = guideline.organ;
	const start = windowStart(guideline.window_days ?? 0, now);
	const readings = input.organs.filter(
		(reading) => reading.organ === organ && inWindow(reading, start)
	);
	const measured = readings.length === 0 ? null : round(sum(readings.map((r) => r.value)), 2);

	// A 30-day sum is a fact about the window, not a claim about today.
	return assessRadiation(guideline, measured, limit, newest(readings), readings.length, now, false);
}

/** Every guideline assessed against the same input, in document order. */
export function buildRadiationSummary(input: RadiationInput): RadiationSummary {
	const now = input.now ?? new Date();
	const assessments = radiationGuidelines.map((guideline) => assessmentFor(guideline, input, now));

	const dates = assessments
		.map((assessment) => assessment.recorded_at)
		.filter((date): date is string => date !== null);

	return {
		environment: input.environment,
		environment_set: input.environmentSet,
		// The caller owns the persisted profile; the builder only echoes it so a
		// summary is complete without a second read.
		profile: input.profile ?? {
			environment: input.environmentSet ? input.environment : null,
			habitat_shielding: null,
			spe_alert_active: input.speAlertActive === true,
			spe_alert_started_at: null,
			updated_at: null
		},
		assessments,
		overall: worstRadiationStatus(assessments.map((assessment) => assessment.status)),
		last_reading_at:
			dates.length === 0 ? null : dates.reduce((a, b) => (toTime(b) > toTime(a) ? b : a)),
		stale_after_days: RADIATION_STALE_DAYS
	};
}

/** Organ codes accepted from the form; anything else is rejected by validation. */
export function isRadiationOrgan(value: string): value is RadiationOrgan {
	return Object.hasOwn(radiationOrganLabels, value);
}

export function isRadiationEnvironment(value: string): value is RadiationEnvironment {
	return value === 'space' || value === 'planetary_surface';
}

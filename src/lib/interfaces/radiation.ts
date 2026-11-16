import type { HealthSeverity } from '#lib/interfaces/health.js';

/** Habitat the crew member is exposed in; it sets the GCR daily limit. */
export type RadiationEnvironment = 'space' | 'planetary_surface';

/** Guidelines from the mission radiation standards, one row per limit. */
export type RadiationGuidelineId = 'career' | 'gcr' | 'lens' | 'skin' | 'bfo' | 'cns' | 'spe';

/** Organs monitored inside the 30-day window. */
export type RadiationOrgan = 'lens' | 'skin' | 'bfo' | 'cns';

/** Reading tables a guideline aggregates from. */
export type RadiationSource = 'interval' | 'organ' | 'spe';

/**
 * `stale` means a reading exists but is too old to support a verdict today;
 * it is surfaced instead of a green pass so an outdated log never looks safe.
 */
export type RadiationStatus = 'green' | 'yellow' | 'red' | 'unknown' | 'stale';

export interface RadiationGuideline {
	id: RadiationGuidelineId;
	label: string;
	description: string;
	/** Effective dose (`mSv`) or equivalent organ dose (`mGy-Eq`). */
	unit: string;
	limit: number;
	/** Share of the limit that raises a caution, e.g. `0.8` for 80 %. */
	warning_ratio: number;
	source: RadiationSource;
	/** Aggregation window in days; `null` when the guideline is career-long. */
	window_days: number | null;
	/** Organ this guideline monitors; `null` for whole-body rules. */
	organ: RadiationOrgan | null;
	/** The GCR rule tightens on a planetary surface. */
	environment_limits: Readonly<Partial<Record<RadiationEnvironment, number>>> | null;
}

export interface RadiationAssessment {
	guideline: RadiationGuideline;
	/** Limit actually applied; the environment narrows the GCR limit. */
	applied_limit: number;
	/** Aggregated value in the guideline unit; `null` when nothing is logged. */
	measured: number | null;
	/** `measured / applied_limit`, clamped to the bar range; `null` without data. */
	ratio: number | null;
	display: string | null;
	status: RadiationStatus;
	protocol: string;
	/** ISO timestamp of the newest reading behind the value. */
	recorded_at: string | null;
	/** `true` when the newest reading is older than the staleness window. */
	stale: boolean;
	/** Readings that built the value, so the UI can point at one warning. */
	reading_count: number;
}

/** Per-astronaut radiation settings; every field defaults when absent. */
export interface RadiationProfile {
	environment: RadiationEnvironment | null;
	/** Free-text description of the habitat shielding, e.g. "10 g/cm² aluminium". */
	habitat_shielding: string | null;
	spe_alert_active: boolean;
	spe_alert_started_at: string | null;
	updated_at: string | null;
}

export interface RadiationSummary {
	environment: RadiationEnvironment;
	/** `false` until the crew member picks one; GCR is then reported as unknown. */
	environment_set: boolean;
	profile: RadiationProfile;
	assessments: RadiationAssessment[];
	/** Worst non-unknown status, for badges and the threat panel. */
	overall: HealthSeverity;
	/** Newest reading across every radiation guideline. */
	last_reading_at: string | null;
	/** Readings this old get the `stale` status. */
	stale_after_days: number;
}

import type {
	RadiationEnvironment,
	RadiationGuideline,
	RadiationOrgan
} from '#lib/interfaces/radiation.js';

/**
 * Mission radiation standards. The limits are universal across age and sex,
 * so they live here instead of per-astronaut alert rules.
 */
export const radiationLimits = {
	/** Lifetime effective dose: keeps excess cancer mortality below 3 %. */
	career: 600,
	/** GCR daily rate on a long mission, per habitat. */
	gcrSpace: 1.3,
	gcrSurface: 0.9,
	/** 30-day organ equivalents, so acute deterministic effects never start. */
	lens: 1000,
	skin: 1500,
	bfo: 250,
	cns: 500,
	/** Effective dose allowed inside one solar particle event. */
	spe: 250
} as const;

/** Fraction of a limit that raises a caution before the limit is reached. */
export const radiationWarningRatio = 0.8;

/** Short-term organ limits are defined on a rolling 30-day window. */
export const ORGAN_WINDOW_DAYS = 30;

/**
 * A radiation log older than this cannot certify the current state, so the
 * guidelines report `stale` instead of a green pass.
 */
export const RADIATION_STALE_DAYS = 2;

export const radiationEnvironments: readonly { value: RadiationEnvironment; label: string }[] = [
	{ value: 'space', label: 'Free space' },
	{ value: 'planetary_surface', label: 'Planetary surface' }
];

export const radiationOrganLabels: Readonly<Record<RadiationOrgan, string>> = {
	lens: 'Lens',
	skin: 'Skin',
	bfo: 'BFO / circulatory',
	cns: 'Central nervous system'
};

export const radiationGuidelines: readonly RadiationGuideline[] = [
	{
		id: 'career',
		label: 'Career effective dose',
		description:
			'Total effective dose from every flight in the career. Stays under the 3 % excess lifetime cancer mortality threshold.',
		unit: 'mSv',
		limit: radiationLimits.career,
		warning_ratio: radiationWarningRatio,
		source: 'interval',
		// Lifetime limit: no look-back window, every logged exposure counts.
		window_days: null,
		organ: null,
		environment_limits: null
	},
	{
		id: 'gcr',
		label: 'Daily GCR exposure',
		description:
			'Galactic cosmic ray rate on missions longer than 60 days. Each interval reading is the dose for the day it is logged on, so the rate is the window total over the days that were logged. Tighter on a planetary surface, where the ground provides some shielding.',
		unit: 'mSv/day',
		limit: radiationLimits.gcrSpace,
		warning_ratio: radiationWarningRatio,
		source: 'interval',
		window_days: 7,
		organ: null,
		environment_limits: {
			space: radiationLimits.gcrSpace,
			planetary_surface: radiationLimits.gcrSurface
		}
	},
	{
		id: 'lens',
		label: 'Lens (30 days)',
		description: 'Prevents early severe cataracts from acute exposure.',
		unit: 'mGy-Eq',
		limit: radiationLimits.lens,
		warning_ratio: radiationWarningRatio,
		source: 'organ',
		window_days: ORGAN_WINDOW_DAYS,
		organ: 'lens',
		environment_limits: null
	},
	{
		id: 'skin',
		label: 'Skin (30 days)',
		description: 'Prevents deterministic skin injury after a high acute dose.',
		unit: 'mGy-Eq',
		limit: radiationLimits.skin,
		warning_ratio: radiationWarningRatio,
		source: 'organ',
		window_days: ORGAN_WINDOW_DAYS,
		organ: 'skin',
		environment_limits: null
	},
	{
		id: 'bfo',
		label: 'BFO / circulatory (30 days)',
		description: 'Protects blood-forming organs and the circulatory system from acute damage.',
		unit: 'mGy-Eq',
		limit: radiationLimits.bfo,
		warning_ratio: radiationWarningRatio,
		source: 'organ',
		window_days: ORGAN_WINDOW_DAYS,
		organ: 'bfo',
		environment_limits: null
	},
	{
		id: 'cns',
		label: 'CNS (30 days)',
		description: 'Guards the central nervous system against acute neurological effects.',
		unit: 'mGy',
		limit: radiationLimits.cns,
		warning_ratio: radiationWarningRatio,
		source: 'organ',
		window_days: ORGAN_WINDOW_DAYS,
		organ: 'cns',
		environment_limits: null
	},
	{
		id: 'spe',
		label: 'SPE alert',
		description:
			'Effective dose inside a solar particle event. When it approaches the limit the crew shelters in the most shielded part of the vehicle.',
		unit: 'mSv',
		limit: radiationLimits.spe,
		warning_ratio: radiationWarningRatio,
		source: 'spe',
		window_days: null,
		organ: null,
		environment_limits: null
	}
];

/** Metric codes that belong to the radiation area but are not health cards. */
export const radiationMetricCodes = {
	interval: 'radiation_interval',
	organ: 'radiation_organ',
	speEvent: 'radiation_spe_event'
} as const;

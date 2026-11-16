import { error, fail } from '@sveltejs/kit';
import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
import type { MetricReading } from '#lib/interfaces/health-area.js';
import { getMetricReadings } from '#lib/server/health-metrics.js';
import {
	getMetricConfig,
	parseMetricForm,
	registerMetric,
	type MetricConfig
} from '#lib/server/metric-registration.js';

export interface MetricPageData {
	readings: MetricReading[];
	entry: MetricEntryConfig | null;
}

function toEntryConfig(config: MetricConfig): MetricEntryConfig {
	return {
		title: config.label,
		fields: [
			{
				name: 'value',
				label: config.label,
				unit: config.unit,
				min: config.min,
				max: config.max,
				step: config.step,
				integer: config.integer
			}
		],
		extra: config.extra
			? {
					name: config.extra.name,
					label: config.extra.label,
					options: config.extra.options
				}
			: null
	};
}

function profileIdFrom(params: { id: string }): number {
	const profileId = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;
	if (!Number.isSafeInteger(profileId) || profileId <= 0) error(404, 'Astronaut not found');
	return profileId;
}

/** Shared load payload for the manual-entry detail routes. */
export function getMetricPageData(profileId: number, metricId: string): MetricPageData {
	const config = getMetricConfig(metricId);
	if (!config) return { readings: [], entry: null };

	return {
		readings: getMetricReadings(profileId, config.areaId, metricId, 30),
		entry: toEntryConfig(config)
	};
}

/** Registers only the metric owned by the calling route. */
export function createMetricRegisterAction(metricId: string) {
	return async ({ params, request }: { params: { id: string }; request: Request }) => {
		const config = getMetricConfig(metricId);
		if (!config) error(404, 'Metric not found');

		const profileId = profileIdFrom(params);
		const parsed = parseMetricForm(config, await request.formData());

		if (!parsed.data) {
			return fail(400, { values: parsed.values, errors: parsed.errors });
		}

		if (!registerMetric(profileId, config, parsed.data)) {
			error(404, 'Astronaut not found');
		}

		return { success: true as const };
	};
}

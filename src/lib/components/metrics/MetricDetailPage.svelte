<script lang="ts">
	import { healthAreas } from '#lib/data/healthAreas.js';
	import MetricDetail from '#lib/components/metrics/MetricDetail.svelte';
	import type { HealthAreaId, MetricReading } from '#lib/interfaces/health-area.js';
	import type { MetricEntryConfig } from '#lib/interfaces/metric-entry.js';
	import type { HealthIndicatorId } from '#lib/utils/health-assessment.js';

	interface Props {
		areaId: HealthAreaId;
		metricId: string;
		basePath: string;
		readings: readonly MetricReading[];
		entry?: MetricEntryConfig | null;
		indicator?: HealthIndicatorId | null;
		decimals?: number;
	}

	let {
		areaId,
		metricId,
		basePath,
		readings,
		entry = null,
		indicator = null,
		decimals
	}: Props = $props();

	let area = $derived(healthAreas.find((item) => item.id === areaId)!);
	let metric = $derived(area.metrics.find((item) => item.id === metricId)!);
	let metricDecimals = $derived(
		'decimals' in metric ? (metric.decimals as number | undefined) : undefined
	);
</script>

<MetricDetail
	{areaId}
	areaLabel={area.label}
	label={metric.label}
	unit={metric.unit}
	{basePath}
	{readings}
	{entry}
	{indicator}
	decimals={decimals ?? metricDecimals}
/>

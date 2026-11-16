import type { HealthSeverity } from '#lib/utils/health-assessment.js';
import { getAstronautAlerts } from '#lib/server/alerts.js';
import { getRiskAssessment } from '#lib/server/risks.js';

export interface Directive {
	id: string;
	title: string;
	reason: string;
	priority: 'high' | 'medium' | 'routine';
	severity: HealthSeverity;
}

export function getRecommendations(profileId: number): Directive[] {
	const alerts = getAstronautAlerts(profileId);
	const risks = getRiskAssessment(profileId);
	const directives: Directive[] = [];
	const seen = new Set<string>();

	for (const alert of alerts) {
		const key = `${alert.indicator}:${alert.protocol}`;
		if (seen.has(key)) continue;
		seen.add(key);
		directives.push({
			id: key,
			title: alert.protocol,
			reason: `${alert.label} · ${alert.value} ${alert.unit}`,
			priority: alert.severity === 'red' ? 'high' : 'medium',
			severity: alert.severity
		});
	}

	for (const risk of risks) {
		if (risk.severity !== 'yellow' && risk.severity !== 'red') continue;
		const key = `risk:${risk.id}:${risk.protocol}`;
		if (seen.has(key)) continue;
		seen.add(key);
		directives.push({
			id: key,
			title: risk.protocol,
			reason: `${risk.label}: ${risk.evidence.slice(0, 2).join(' · ') || 'review required'}`,
			priority: risk.severity === 'red' ? 'high' : 'medium',
			severity: risk.severity
		});
	}

	if (directives.length === 0) {
		directives.push({
			id: 'routine',
			title: 'Maintain the current monitoring routine.',
			reason: 'No active warnings or elevated risk factors.',
			priority: 'routine',
			severity: 'green'
		});
	}

	const rank = { high: 0, medium: 1, routine: 2 } as const;
	return directives.sort((left, right) => rank[left.priority] - rank[right.priority]);
}

import { describe, expect, it } from 'vitest';
import { brainState } from '#lib/utils/body-map.js';
import type { BodyMapVitals } from '#lib/interfaces/body-map.js';

function vitals(partial: Partial<BodyMapVitals>): BodyMapVitals {
	return { heart_rate: null, stress: null, fatigue: null, ...partial };
}

describe('brain state', () => {
	it('stays neutral when there is no mental reading', () => {
		const state = brainState(vitals({}));

		expect(state.tone).toBe('unknown');
		expect(state.label).toBe('No data');
		expect(state.summary).toBe('No mental data');
		expect(state.pulseHz).toBe(0);
		expect(state.pulseAmplitude).toBe(0);
		expect(state.color).toBe('#a78bfa');
	});

	it('follows the same thresholds as the mental-health cards', () => {
		expect(brainState(vitals({ stress: 4 })).tone).toBe('green');
		expect(brainState(vitals({ stress: 5 })).tone).toBe('yellow');
		expect(brainState(vitals({ stress: 7 })).tone).toBe('yellow');
		expect(brainState(vitals({ stress: 8 })).tone).toBe('red');
	});

	it('uses fatigue as the tone when there is no stress reading', () => {
		const state = brainState(vitals({ fatigue: 8 }));

		expect(state.tone).toBe('red');
		expect(state.load).toBeGreaterThan(0.7);
		expect(state.summary).toBe('Fatigue 8/10');
	});

	it('keeps the colour aligned with the tone when fatigue is the worst signal', () => {
		const tired = brainState(vitals({ stress: 2, fatigue: 9 }));

		expect(tired.tone).toBe('red');
		expect(tired.load).toBeGreaterThan(0.8);
		expect(tired.color).not.toBe('#8b5cf6');
	});

	it('dims and slows the glow as fatigue rises', () => {
		const rested = brainState(vitals({ stress: 9, fatigue: 1 }));
		const tired = brainState(vitals({ stress: 9, fatigue: 9 }));

		expect(rested.tone).toBe(tired.tone);
		expect(rested.glow).toBeGreaterThan(tired.glow);
		expect(rested.pulseHz).toBeGreaterThan(tired.pulseHz);
		expect(rested.pulseAmplitude).toBeGreaterThan(tired.pulseAmplitude);
	});

	it('warms the cortex as stress climbs', () => {
		const calm = brainState(vitals({ stress: 2 }));
		const high = brainState(vitals({ stress: 10 }));

		expect(calm.load).toBeLessThan(high.load);
		expect(calm.color).not.toBe(high.color);
		expect(high.color).toBe('#ef4444');
	});

	it('clamps out-of-range readings instead of overflowing the scene', () => {
		expect(brainState(vitals({ stress: 50 })).load).toBe(1);
		expect(brainState(vitals({ stress: -10 })).load).toBe(0);
	});

	it('formats decimals and one-sided readings for the tooltip', () => {
		expect(brainState(vitals({ stress: 6.5, fatigue: 4 })).summary).toBe(
			'Stress 6.5/10 · Fatigue 4/10'
		);
		expect(brainState(vitals({ stress: 6 })).summary).toBe('Stress 6/10');
	});
});

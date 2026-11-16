import { describe, expect, it } from 'vitest';
import { resolveSharedTransition } from './shared-transition.js';

function url(path: string): URL {
	return new URL(path, 'https://astrolife.test');
}

describe('resolveSharedTransition', () => {
	it('links the crew list and an astronaut profile in both directions', () => {
		expect(resolveSharedTransition(url('/'), url('/crew/6'))).toEqual({
			astronautId: 6,
			areaId: null
		});
		expect(resolveSharedTransition(url('/crew/6'), url('/'))).toEqual({
			astronautId: 6,
			areaId: null
		});
	});

	it('links the measurements list and an area detail in both directions', () => {
		expect(resolveSharedTransition(url('/crew/6/measurements'), url('/crew/6/measurements/mental'))).toEqual({
			astronautId: null,
			areaId: 'mental'
		});
		expect(resolveSharedTransition(url('/crew/6/measurements/mental'), url('/crew/6/measurements'))).toEqual({
			astronautId: null,
			areaId: 'mental'
		});
	});

	it('ignores unrelated navigations', () => {
		expect(resolveSharedTransition(url('/crew/6'), url('/crew/6/measurements'))).toBeNull();
		expect(resolveSharedTransition(url('/crew/6/measurements'), url('/crew/6/measurements/radiation/organs'))).toBeNull();
		expect(resolveSharedTransition(url('/mediciones'), url('/crew/6'))).toBeNull();
	});
});

import { describe, expect, it } from 'vitest';
import { buildSparklineAreaPath, buildSparklinePath } from '#lib/utils/sparkline.js';

describe('buildSparklinePath', () => {
	it('returns an empty path without points', () => {
		expect(buildSparklinePath([])).toBe('');
	});

	it('draws a centred segment for a single point', () => {
		expect(buildSparklinePath([3], 100, 32, 2)).toBe('M2 16L98 16');
	});

	it('places the first and last points on the padded edges', () => {
		const path = buildSparklinePath([1, 2], 100, 32, 2);

		expect(path).toBe('M2 30L98 2');
	});

	it('keeps a flat series on the vertical centre', () => {
		expect(buildSparklinePath([5, 5, 5], 100, 32, 2)).toBe('M2 16L50 16L98 16');
	});

	it('preserves the input order so the series reads left to right', () => {
		const path = buildSparklinePath([3, 1, 2], 100, 32, 2);

		expect(path).toBe('M2 2L50 30L98 16');
	});

	it('rounds coordinates to two decimals', () => {
		const path = buildSparklinePath([0, 1, 3], 100, 32, 2);

		expect(path).toBe('M2 30L50 20.67L98 2');
	});
});

describe('buildSparklineAreaPath', () => {
	it('closes the line against the bottom edge', () => {
		expect(buildSparklineAreaPath([1, 2], 100, 32, 2)).toBe('M2 30L98 2L98 30L2 30Z');
	});

	it('returns an empty path without points', () => {
		expect(buildSparklineAreaPath([])).toBe('');
	});
});

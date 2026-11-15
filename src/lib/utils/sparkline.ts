const DECIMALS = 2;

function round(value: number): number {
	return Number(value.toFixed(DECIMALS));
}

/**
 * Maps a series to an SVG path inside the given box.
 *
 * The chart is rendered with `preserveAspectRatio="none"`, so the path is built
 * in the viewBox units and the browser stretches it to the card width.
 */
export function buildSparklinePath(
	points: readonly number[],
	width = 100,
	height = 32,
	padding = 2
): string {
	if (points.length === 0) return '';

	const innerWidth = width - padding * 2;
	const innerHeight = height - padding * 2;
	const firstX = padding;

	// A single reading has no direction; a flat segment reads better than a dot
	// that may be clipped by the stroke width.
	if (points.length === 1) {
		const middleY = round(height / 2);
		return `M${firstX} ${middleY}L${round(width - padding)} ${middleY}`;
	}

	const min = Math.min(...points);
	const max = Math.max(...points);
	const spread = max - min;

	return points
		.map((value, index) => {
			const x = padding + (index / (points.length - 1)) * innerWidth;
			const y =
				spread === 0 ? height / 2 : padding + innerHeight - ((value - min) / spread) * innerHeight;

			return `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`;
		})
		.join('');
}

/** Closes `buildSparklinePath` against the bottom edge to fill the area below. */
export function buildSparklineAreaPath(
	points: readonly number[],
	width = 100,
	height = 32,
	padding = 2
): string {
	const line = buildSparklinePath(points, width, height, padding);
	if (!line || points.length === 0) return '';

	const baseline = round(height - padding);
	return `${line}L${round(width - padding)} ${baseline}L${round(padding)} ${baseline}Z`;
}

import { describe, expect, it } from 'vitest';
import { parseCrewPhoto } from '#lib/server/crew-photo.js';

const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
	'base64'
);

describe('crew photo uploads', () => {
	it('allows an omitted photo', async () => {
		expect(await parseCrewPhoto(null)).toEqual({ photo_url: null, error: null });
		expect(await parseCrewPhoto(new File([], '', { type: 'application/octet-stream' }))).toEqual({
			photo_url: null,
			error: null
		});
	});

	it('encodes a PNG as a persistent image data URL', async () => {
		const result = await parseCrewPhoto(new File([PNG], 'portrait.png', { type: 'image/png' }));
		expect(result.error).toBeNull();
		expect(result.photo_url).toBe(`data:image/png;base64,${PNG.toString('base64')}`);
	});

	it('rejects nonimages and mismatched content types', async () => {
		for (const file of [
			new File(['<svg onload="alert(1)"/>'], 'photo.png', { type: 'image/png' }),
			new File([PNG], 'photo.jpg', { type: 'image/jpeg' }),
			new File([], 'empty.png', { type: 'image/png' })
		]) {
			const result = await parseCrewPhoto(file);
			expect(result.photo_url).toBeNull();
			expect(result.error).toBeTruthy();
		}
		expect((await parseCrewPhoto('https://example.com/photo.jpg')).error).toBeTruthy();
	});

	it('rejects files larger than 2 MB', async () => {
		const result = await parseCrewPhoto(
			new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })
		);
		expect(result.photo_url).toBeNull();
		expect(result.error).toContain('2 MB');
	});
});

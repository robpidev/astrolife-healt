const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

interface PhotoResult {
	photo_url: string | null;
	error: string | null;
}

/** Keep uploads in SQLite so photos persist wherever the database is mounted. */
export async function parseCrewPhoto(value: FormDataEntryValue | null): Promise<PhotoResult> {
	if (value === null || (typeof value !== 'string' && value.name === '' && value.size === 0)) {
		return { photo_url: null, error: null };
	}
	if (typeof value === 'string' || value.size === 0) {
		return { photo_url: null, error: 'Select a valid JPG, PNG, or WebP image.' };
	}
	if (value.size > MAX_PHOTO_BYTES) {
		return { photo_url: null, error: 'The photo must be at most 2 MB.' };
	}

	const bytes = Buffer.from(await value.arrayBuffer());
	const isPng =
		bytes.length >= 24 &&
		bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
	const isJpeg =
		bytes.length >= 4 &&
		bytes[0] === 255 &&
		bytes[1] === 216 &&
		bytes[2] === 255 &&
		bytes[bytes.length - 2] === 255 &&
		bytes[bytes.length - 1] === 217;
	const isWebp =
		bytes.length >= 16 &&
		bytes.toString('ascii', 0, 4) === 'RIFF' &&
		bytes.toString('ascii', 8, 12) === 'WEBP';
	const mime = isPng ? 'image/png' : isJpeg ? 'image/jpeg' : isWebp ? 'image/webp' : null;
	if (mime === null || mime !== value.type) {
		return { photo_url: null, error: 'Select a valid JPG, PNG, or WebP image.' };
	}
	return { photo_url: `data:${mime};base64,${bytes.toString('base64')}`, error: null };
}

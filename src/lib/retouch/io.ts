import { fromImageData, TIFF_HINT, type RetouchImage } from './types';

const TIFF_RE = /\.tiff?$/i;
const TIFF_MIME = /image\/tiff/i;

export function isUnsupportedTiff(file: File): boolean {
	return TIFF_RE.test(file.name) || TIFF_MIME.test(file.type);
}

/** Decode any browser-supported raster into a RetouchImage. */
export async function loadRetouchFile(file: File): Promise<RetouchImage> {
	if (isUnsupportedTiff(file)) {
		throw new Error(TIFF_HINT);
	}

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new Error(
			`Could not decode “${file.name}”. Try PNG, JPEG, WebP, GIF, BMP, or AVIF (browser support varies).`
		);
	}

	try {
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) throw new Error('Canvas unavailable');
		ctx.drawImage(bitmap, 0, 0);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const name = file.name.replace(/\.[^.]+$/, '') || 'image';
		return fromImageData(name, imageData);
	} finally {
		bitmap.close();
	}
}

export async function exportRetouchImage(
	img: RetouchImage,
	format: 'png' | 'jpeg' | 'webp',
	quality = 0.92
): Promise<void> {
	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Export failed');

	const imageData =
		typeof ImageData !== 'undefined'
			? new ImageData(new Uint8ClampedArray(img.data), img.width, img.height)
			: ({ data: img.data, width: img.width, height: img.height } as ImageData);
	ctx.putImageData(imageData, 0, 0);

	const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
	const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, quality));
	if (!blob) throw new Error('Export failed');

	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${img.name}-retouch.${format === 'jpeg' ? 'jpg' : format}`;
	a.click();
	URL.revokeObjectURL(a.href);
}

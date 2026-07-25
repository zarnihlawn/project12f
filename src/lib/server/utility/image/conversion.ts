import { error } from '@sveltejs/kit';
import sharp from 'sharp';

export const IMAGE_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

const ALIASES: Record<string, ImageFormat> = {
	jpg: 'jpeg',
	jpeg: 'jpeg',
	png: 'png',
	webp: 'webp',
	avif: 'avif',
	gif: 'gif',
	tif: 'tiff',
	tiff: 'tiff'
};

export const FORMAT_MIME: Record<ImageFormat, string> = {
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	avif: 'image/avif',
	gif: 'image/gif',
	tiff: 'image/tiff'
};

const MIME_TO_FORMAT: Record<string, ImageFormat> = {
	'image/jpeg': 'jpeg',
	'image/jpg': 'jpeg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/avif': 'avif',
	'image/gif': 'gif',
	'image/tiff': 'tiff',
	'image/tif': 'tiff'
};

export function normalizeFormat(value: string | undefined): ImageFormat | null {
	if (!value) return null;
	return ALIASES[value.toLowerCase()] ?? null;
}

export function formatFromMime(mime: string): ImageFormat | null {
	return MIME_TO_FORMAT[mime.toLowerCase()] ?? null;
}

export function isLossyFormat(format: ImageFormat): boolean {
	return format === 'jpeg' || format === 'webp' || format === 'avif';
}

export async function convertImageBuffer(
	buffer: Buffer,
	to: ImageFormat,
	quality = 80
): Promise<Buffer> {
	const pipeline = sharp(buffer, { animated: to === 'gif' || to === 'webp' });
	const q = Math.min(100, Math.max(1, Math.round(quality)));

	switch (to) {
		case 'jpeg':
			return pipeline.jpeg({ quality: q, mozjpeg: true }).toBuffer();
		case 'png':
			return pipeline.png({ compressionLevel: 9 }).toBuffer();
		case 'webp':
			return pipeline.webp({ quality: q }).toBuffer();
		case 'avif':
			return pipeline.avif({ quality: q }).toBuffer();
		case 'gif':
			return pipeline.gif().toBuffer();
		case 'tiff':
			return pipeline.tiff({ quality: q }).toBuffer();
		default:
			throw error(400, `Unsupported output format: ${to}`);
	}
}

export function convertedFilename(originalName: string, to: ImageFormat): string {
	const base = originalName.replace(/\.[^.]+$/, '') || 'converted';
	const ext = to === 'jpeg' ? 'jpg' : to;
	return `${base}.${ext}`;
}

import { error } from '@sveltejs/kit';
import sharp from 'sharp';
import {
	convertedFilename,
	FORMAT_MIME,
	type ImageFormat,
	isLossyFormat,
	normalizeFormat
} from './conversion';

export type ResizeFit = 'inside' | 'cover' | 'contain' | 'fill' | 'outside';

export type CompressionOptions = {
	format: ImageFormat;
	quality: number;
	effort: number;
	progressive: boolean;
	mozjpeg: boolean;
	optimizeScans: boolean;
	trellisQuantisation: boolean;
	overshootDeringing: boolean;
	chromaSubsampling: '4:4:4' | '4:2:0';
	compressionLevel: number;
	palette: boolean;
	colors: number;
	dither: number;
	lossless: boolean;
	nearLossless: boolean;
	smartSubsample: boolean;
	stripMetadata: boolean;
	maxWidth: number | null;
	maxHeight: number | null;
	fit: ResizeFit;
	withoutEnlargement: boolean;
};

export const DEFAULT_COMPRESSION: CompressionOptions = {
	format: 'webp',
	quality: 75,
	effort: 4,
	progressive: true,
	mozjpeg: true,
	optimizeScans: true,
	trellisQuantisation: true,
	overshootDeringing: true,
	chromaSubsampling: '4:2:0',
	compressionLevel: 9,
	palette: false,
	colors: 256,
	dither: 1,
	lossless: false,
	nearLossless: false,
	smartSubsample: true,
	stripMetadata: true,
	maxWidth: null,
	maxHeight: null,
	fit: 'inside',
	withoutEnlargement: true
};

export const COMPRESSION_PRESETS = {
	maximum: {
		label: 'Maximum quality',
		hint: 'Near-lossless, larger files',
		quality: 92,
		effort: 6,
		lossless: false,
		nearLossless: false,
		palette: false,
		compressionLevel: 6
	},
	balanced: {
		label: 'Balanced',
		hint: 'Good quality / size tradeoff',
		quality: 75,
		effort: 4,
		lossless: false,
		nearLossless: false,
		palette: false,
		compressionLevel: 9
	},
	small: {
		label: 'Small file',
		hint: 'Aggressive size reduction',
		quality: 55,
		effort: 5,
		lossless: false,
		nearLossless: false,
		palette: false,
		compressionLevel: 9
	},
	tiny: {
		label: 'Tiny',
		hint: 'Smallest practical size',
		quality: 40,
		effort: 6,
		lossless: false,
		nearLossless: false,
		palette: true,
		colors: 128,
		compressionLevel: 9
	}
} as const;

export type CompressionPreset = keyof typeof COMPRESSION_PRESETS;

function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

function parseBool(value: FormDataEntryValue | null, fallback: boolean): boolean {
	if (value == null || value === '') return fallback;
	if (typeof value !== 'string') return fallback;
	return value === '1' || value === 'true' || value === 'on' || value === 'yes';
}

function parseNumber(
	value: FormDataEntryValue | null,
	fallback: number,
	min: number,
	max: number
): number {
	if (typeof value !== 'string' || value.trim() === '') return fallback;
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return clamp(n, min, max);
}

function parseOptionalPositiveInt(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string' || value.trim() === '') return null;
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.round(n);
}

const FITS: ResizeFit[] = ['inside', 'cover', 'contain', 'fill', 'outside'];

export function parseCompressionFormData(formData: FormData): CompressionOptions {
	const format =
		normalizeFormat(String(formData.get('format') ?? '')) ?? DEFAULT_COMPRESSION.format;

	const fitRaw = String(formData.get('fit') ?? DEFAULT_COMPRESSION.fit);
	const fit = (FITS.includes(fitRaw as ResizeFit) ? fitRaw : DEFAULT_COMPRESSION.fit) as ResizeFit;

	const chromaRaw = String(formData.get('chromaSubsampling') ?? '4:2:0');
	const chromaSubsampling =
		chromaRaw === '4:4:4' || chromaRaw === '4:2:0'
			? chromaRaw
			: DEFAULT_COMPRESSION.chromaSubsampling;

	return {
		format,
		quality: parseNumber(formData.get('quality'), DEFAULT_COMPRESSION.quality, 1, 100),
		effort: parseNumber(formData.get('effort'), DEFAULT_COMPRESSION.effort, 0, 9),
		progressive: parseBool(formData.get('progressive'), DEFAULT_COMPRESSION.progressive),
		mozjpeg: parseBool(formData.get('mozjpeg'), DEFAULT_COMPRESSION.mozjpeg),
		optimizeScans: parseBool(formData.get('optimizeScans'), DEFAULT_COMPRESSION.optimizeScans),
		trellisQuantisation: parseBool(
			formData.get('trellisQuantisation'),
			DEFAULT_COMPRESSION.trellisQuantisation
		),
		overshootDeringing: parseBool(
			formData.get('overshootDeringing'),
			DEFAULT_COMPRESSION.overshootDeringing
		),
		chromaSubsampling,
		compressionLevel: parseNumber(
			formData.get('compressionLevel'),
			DEFAULT_COMPRESSION.compressionLevel,
			0,
			9
		),
		palette: parseBool(formData.get('palette'), DEFAULT_COMPRESSION.palette),
		colors: parseNumber(formData.get('colors'), DEFAULT_COMPRESSION.colors, 2, 256),
		dither: parseNumber(formData.get('dither'), DEFAULT_COMPRESSION.dither, 0, 1),
		lossless: parseBool(formData.get('lossless'), DEFAULT_COMPRESSION.lossless),
		nearLossless: parseBool(formData.get('nearLossless'), DEFAULT_COMPRESSION.nearLossless),
		smartSubsample: parseBool(formData.get('smartSubsample'), DEFAULT_COMPRESSION.smartSubsample),
		stripMetadata: parseBool(formData.get('stripMetadata'), DEFAULT_COMPRESSION.stripMetadata),
		maxWidth: parseOptionalPositiveInt(formData.get('maxWidth')),
		maxHeight: parseOptionalPositiveInt(formData.get('maxHeight')),
		fit,
		withoutEnlargement: parseBool(
			formData.get('withoutEnlargement'),
			DEFAULT_COMPRESSION.withoutEnlargement
		)
	};
}

export async function compressImageBuffer(
	buffer: Buffer,
	options: CompressionOptions
): Promise<{ buffer: Buffer; format: ImageFormat; mime: string; filename: (name: string) => string }> {
	const opts = { ...DEFAULT_COMPRESSION, ...options };
	const format = opts.format;

	let pipeline = sharp(buffer, {
		animated: format === 'gif' || format === 'webp',
		failOn: 'none'
	}).rotate();

	if (!opts.stripMetadata) {
		pipeline = pipeline.withMetadata();
	}

	if (opts.maxWidth || opts.maxHeight) {
		pipeline = pipeline.resize({
			width: opts.maxWidth ?? undefined,
			height: opts.maxHeight ?? undefined,
			fit: opts.fit,
			withoutEnlargement: opts.withoutEnlargement
		});
	}

	const q = opts.quality;
	let output: Buffer;

	switch (format) {
		case 'jpeg':
			output = await pipeline
				.jpeg({
					quality: q,
					progressive: opts.progressive,
					mozjpeg: opts.mozjpeg,
					optimizeScans: opts.optimizeScans,
					trellisQuantisation: opts.trellisQuantisation,
					overshootDeringing: opts.overshootDeringing,
					chromaSubsampling: opts.chromaSubsampling
				})
				.toBuffer();
			break;
		case 'png':
			output = await pipeline
				.png({
					compressionLevel: opts.compressionLevel,
					progressive: opts.progressive,
					palette: opts.palette,
					colors: opts.colors,
					dither: opts.dither,
					effort: clamp(opts.effort, 1, 10)
				})
				.toBuffer();
			break;
		case 'webp':
			output = await pipeline
				.webp({
					quality: opts.lossless ? 100 : q,
					lossless: opts.lossless,
					nearLossless: opts.nearLossless,
					smartSubsample: opts.smartSubsample,
					effort: clamp(opts.effort, 0, 6),
					alphaQuality: q
				})
				.toBuffer();
			break;
		case 'avif':
			output = await pipeline
				.avif({
					quality: opts.lossless ? 100 : q,
					lossless: opts.lossless,
					effort: clamp(opts.effort, 0, 9),
					chromaSubsampling: opts.chromaSubsampling
				})
				.toBuffer();
			break;
		case 'gif':
			output = await pipeline
				.gif({
					effort: clamp(opts.effort, 1, 10),
					dither: opts.dither,
					colours: opts.colors
				})
				.toBuffer();
			break;
		case 'tiff':
			output = await pipeline
				.tiff({
					quality: q,
					compression: opts.lossless ? 'lzw' : 'jpeg',
					predictor: 'horizontal',
					pyramid: false
				})
				.toBuffer();
			break;
		default:
			throw error(400, `Unsupported compression format: ${format}`);
	}

	return {
		buffer: output,
		format,
		mime: FORMAT_MIME[format],
		filename: (originalName: string) => convertedFilename(originalName, format)
	};
}

export { isLossyFormat, FORMAT_MIME, type ImageFormat };

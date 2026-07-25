import type { RetouchFilterId, RetouchImage } from './types';

function clamp(v: number) {
	return v < 0 ? 0 : v > 255 ? 255 : v;
}

export const RETOUCH_FILTERS: { id: RetouchFilterId; label: string }[] = [
	{ id: 'grayscale', label: 'Grayscale' },
	{ id: 'invert', label: 'Invert' },
	{ id: 'blur', label: 'Blur' },
	{ id: 'sharpen', label: 'Sharpen' },
	{ id: 'noise', label: 'Noise' },
	{ id: 'emboss', label: 'Emboss' },
	{ id: 'find-edges', label: 'Find Edges' }
];

export function applyRetouchFilter(img: RetouchImage, id: RetouchFilterId, amount = 1): RetouchImage {
	const src = new Uint8ClampedArray(img.data);
	const dst = new Uint8ClampedArray(img.data.length);
	const w = img.width;
	const h = img.height;

	switch (id) {
		case 'grayscale': {
			for (let i = 0; i < src.length; i += 4) {
				const g = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
				dst[i] = dst[i + 1] = dst[i + 2] = g;
				dst[i + 3] = src[i + 3];
			}
			break;
		}
		case 'invert': {
			for (let i = 0; i < src.length; i += 4) {
				dst[i] = 255 - src[i];
				dst[i + 1] = 255 - src[i + 1];
				dst[i + 2] = 255 - src[i + 2];
				dst[i + 3] = src[i + 3];
			}
			break;
		}
		case 'blur': {
			boxBlur(src, dst, w, h, Math.max(1, Math.round(amount * 2)));
			break;
		}
		case 'sharpen': {
			convolve(src, dst, w, h, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
			break;
		}
		case 'noise': {
			const strength = amount * 30;
			for (let i = 0; i < src.length; i += 4) {
				if (src[i + 3] === 0) {
					dst[i + 3] = 0;
					continue;
				}
				const n = (Math.random() - 0.5) * strength;
				dst[i] = clamp(src[i] + n);
				dst[i + 1] = clamp(src[i + 1] + n);
				dst[i + 2] = clamp(src[i + 2] + n);
				dst[i + 3] = src[i + 3];
			}
			break;
		}
		case 'emboss':
			convolve(src, dst, w, h, [-2, -1, 0, -1, 1, 1, 0, 1, 2]);
			break;
		case 'find-edges':
			convolve(src, dst, w, h, [-1, -1, -1, -1, 8, -1, -1, -1, -1]);
			break;
	}

	return { name: img.name, width: w, height: h, data: dst };
}

/** brightness/contrast/saturation: each -100..100 */
export function applyAdjustments(
	img: RetouchImage,
	brightness: number,
	contrast: number,
	saturation: number
): RetouchImage {
	const src = img.data;
	const dst = new Uint8ClampedArray(src.length);
	const b = brightness * 2.55;
	const c = (contrast + 100) / 100;
	const s = (saturation + 100) / 100;

	for (let i = 0; i < src.length; i += 4) {
		let r = src[i];
		let g = src[i + 1];
		let bl = src[i + 2];

		r = (r - 128) * c + 128 + b;
		g = (g - 128) * c + 128 + b;
		bl = (bl - 128) * c + 128 + b;

		const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
		r = gray + (r - gray) * s;
		g = gray + (g - gray) * s;
		bl = gray + (bl - gray) * s;

		dst[i] = clamp(r);
		dst[i + 1] = clamp(g);
		dst[i + 2] = clamp(bl);
		dst[i + 3] = src[i + 3];
	}

	return { name: img.name, width: img.width, height: img.height, data: dst };
}

function boxBlur(
	src: Uint8ClampedArray,
	dst: Uint8ClampedArray,
	w: number,
	h: number,
	r: number
) {
	const tmp = new Uint8ClampedArray(src.length);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let rSum = 0,
				gSum = 0,
				bSum = 0,
				aSum = 0,
				c = 0;
			for (let k = -r; k <= r; k++) {
				const xx = Math.min(w - 1, Math.max(0, x + k));
				const i = (y * w + xx) * 4;
				rSum += src[i];
				gSum += src[i + 1];
				bSum += src[i + 2];
				aSum += src[i + 3];
				c++;
			}
			const o = (y * w + x) * 4;
			tmp[o] = rSum / c;
			tmp[o + 1] = gSum / c;
			tmp[o + 2] = bSum / c;
			tmp[o + 3] = aSum / c;
		}
	}
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let rSum = 0,
				gSum = 0,
				bSum = 0,
				aSum = 0,
				c = 0;
			for (let k = -r; k <= r; k++) {
				const yy = Math.min(h - 1, Math.max(0, y + k));
				const i = (yy * w + x) * 4;
				rSum += tmp[i];
				gSum += tmp[i + 1];
				bSum += tmp[i + 2];
				aSum += tmp[i + 3];
				c++;
			}
			const o = (y * w + x) * 4;
			dst[o] = rSum / c;
			dst[o + 1] = gSum / c;
			dst[o + 2] = bSum / c;
			dst[o + 3] = aSum / c;
		}
	}
}

function convolve(
	src: Uint8ClampedArray,
	dst: Uint8ClampedArray,
	w: number,
	h: number,
	kernel: number[]
) {
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let r = 0,
				g = 0,
				b = 0;
			let ki = 0;
			for (let ky = -1; ky <= 1; ky++) {
				for (let kx = -1; kx <= 1; kx++) {
					const xx = Math.min(w - 1, Math.max(0, x + kx));
					const yy = Math.min(h - 1, Math.max(0, y + ky));
					const i = (yy * w + xx) * 4;
					const kv = kernel[ki++];
					r += src[i] * kv;
					g += src[i + 1] * kv;
					b += src[i + 2] * kv;
				}
			}
			const o = (y * w + x) * 4;
			dst[o] = clamp(r);
			dst[o + 1] = clamp(g);
			dst[o + 2] = clamp(b);
			dst[o + 3] = src[o + 3];
		}
	}
}

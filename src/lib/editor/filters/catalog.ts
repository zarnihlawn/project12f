/**
 * Phase 2–4 filter stubs + a few implemented CPU filters.
 */
import type { EditorDocument } from '../types';
import { getActiveLayer } from '../document/factory';

export type FilterId =
	| 'gaussian-blur'
	| 'box-blur'
	| 'sharpen'
	| 'unsharp-mask'
	| 'noise'
	| 'invert'
	| 'high-pass'
	| 'emboss'
	| 'find-edges'
	| 'motion-blur'
	| 'oil-paint'
	| 'content-aware-fill'
	| 'select-subject';

export const FILTER_CATALOG: {
	id: FilterId;
	label: string;
	phase: 1 | 2 | 3 | 4;
	implemented: boolean;
}[] = [
	{ id: 'gaussian-blur', label: 'Gaussian Blur', phase: 1, implemented: true },
	{ id: 'box-blur', label: 'Box Blur', phase: 1, implemented: true },
	{ id: 'sharpen', label: 'Sharpen', phase: 1, implemented: true },
	{ id: 'unsharp-mask', label: 'Unsharp Mask', phase: 2, implemented: true },
	{ id: 'noise', label: 'Add Noise', phase: 1, implemented: true },
	{ id: 'high-pass', label: 'High Pass', phase: 2, implemented: true },
	{ id: 'emboss', label: 'Emboss', phase: 2, implemented: true },
	{ id: 'find-edges', label: 'Find Edges', phase: 2, implemented: true },
	{ id: 'motion-blur', label: 'Motion Blur', phase: 2, implemented: true },
	{ id: 'oil-paint', label: 'Oil Paint', phase: 2, implemented: true },
	{ id: 'content-aware-fill', label: 'Content-Aware Fill', phase: 3, implemented: true },
	{ id: 'select-subject', label: 'Select Subject', phase: 3, implemented: true }
];

function clamp(v: number) {
	return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function applyFilterToActiveLayer(
	doc: EditorDocument,
	filterId: FilterId,
	amount = 1
): boolean {
	const layer = getActiveLayer(doc);
	if (!layer?.pixels) return false;
	const w = layer.width;
	const h = layer.height;
	const src = new Uint8ClampedArray(layer.pixels);
	const dst = layer.pixels;

	switch (filterId) {
		case 'box-blur':
		case 'gaussian-blur': {
			const r = Math.max(1, Math.round(amount * 2));
			boxBlur(src, dst, w, h, r);
			return true;
		}
		case 'sharpen':
		case 'unsharp-mask': {
			convolve(src, dst, w, h, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
			return true;
		}
		case 'noise': {
			const strength = amount * 30;
			for (let i = 0; i < dst.length; i += 4) {
				if (src[i + 3] === 0) continue;
				const n = (Math.random() - 0.5) * strength;
				dst[i] = clamp(src[i] + n);
				dst[i + 1] = clamp(src[i + 1] + n);
				dst[i + 2] = clamp(src[i + 2] + n);
				dst[i + 3] = src[i + 3];
			}
			return true;
		}
		case 'high-pass': {
			const blur = new Uint8ClampedArray(src);
			boxBlur(src, blur, w, h, 3);
			for (let i = 0; i < dst.length; i += 4) {
				dst[i] = clamp(128 + src[i] - blur[i]);
				dst[i + 1] = clamp(128 + src[i + 1] - blur[i + 1]);
				dst[i + 2] = clamp(128 + src[i + 2] - blur[i + 2]);
				dst[i + 3] = src[i + 3];
			}
			return true;
		}
		case 'emboss':
			convolve(src, dst, w, h, [-2, -1, 0, -1, 1, 1, 0, 1, 2]);
			return true;
		case 'find-edges':
			convolve(src, dst, w, h, [-1, -1, -1, -1, 8, -1, -1, -1, -1]);
			return true;
		case 'motion-blur': {
			const len = Math.max(2, Math.round(amount * 8));
			dst.set(src);
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					let r = 0,
						g = 0,
						b = 0,
						a = 0,
						c = 0;
					for (let k = -len; k <= len; k++) {
						const xx = Math.min(w - 1, Math.max(0, x + k));
						const i = (y * w + xx) * 4;
						r += src[i];
						g += src[i + 1];
						b += src[i + 2];
						a += src[i + 3];
						c++;
					}
					const o = (y * w + x) * 4;
					dst[o] = r / c;
					dst[o + 1] = g / c;
					dst[o + 2] = b / c;
					dst[o + 3] = a / c;
				}
			}
			return true;
		}
		case 'oil-paint': {
			const radius = Math.max(1, Math.round(amount * 2));
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const hist = new Map<number, { n: number; r: number; g: number; b: number; a: number }>();
					for (let yy = -radius; yy <= radius; yy++) {
						for (let xx = -radius; xx <= radius; xx++) {
							const nx = Math.min(w - 1, Math.max(0, x + xx));
							const ny = Math.min(h - 1, Math.max(0, y + yy));
							const i = (ny * w + nx) * 4;
							const key =
								((src[i] >> 4) << 8) | ((src[i + 1] >> 4) << 4) | (src[i + 2] >> 4);
							const e = hist.get(key) || { n: 0, r: 0, g: 0, b: 0, a: 0 };
							e.n++;
							e.r += src[i];
							e.g += src[i + 1];
							e.b += src[i + 2];
							e.a += src[i + 3];
							hist.set(key, e);
						}
					}
					let best = { n: 0, r: 0, g: 0, b: 0, a: 0 };
					for (const e of hist.values()) if (e.n > best.n) best = e;
					const o = (y * w + x) * 4;
					dst[o] = best.r / best.n;
					dst[o + 1] = best.g / best.n;
					dst[o + 2] = best.b / best.n;
					dst[o + 3] = best.a / best.n;
				}
			}
			return true;
		}
		case 'content-aware-fill':
		case 'select-subject':
			// Handled by EditorState intelligence methods
			return false;
		default:
			return false;
	}
}

function boxBlur(
	src: Uint8ClampedArray,
	dst: Uint8ClampedArray,
	w: number,
	h: number,
	r: number
) {
	const tmp = new Uint8ClampedArray(src.length);
	// horizontal
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
	// vertical
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
	const k = kernel;
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
					const kv = k[ki++];
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

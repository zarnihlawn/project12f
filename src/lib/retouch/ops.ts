import type { CropRect, RetouchImage } from './types';

function makeImage(name: string, width: number, height: number, data: Uint8ClampedArray): RetouchImage {
	return { name, width, height, data };
}

function canvasFrom(img: RetouchImage): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = img.width;
	c.height = img.height;
	const ctx = c.getContext('2d')!;
	const id =
		typeof ImageData !== 'undefined'
			? new ImageData(new Uint8ClampedArray(img.data), img.width, img.height)
			: ({ data: img.data, width: img.width, height: img.height } as ImageData);
	ctx.putImageData(id, 0, 0);
	return c;
}

function readCanvas(name: string, canvas: HTMLCanvasElement): RetouchImage {
	const ctx = canvas.getContext('2d')!;
	const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
	return makeImage(name, canvas.width, canvas.height, new Uint8ClampedArray(id.data));
}

/** CPU fallback resize (tests / no DOM). Nearest-neighbor. */
export function resizeNearest(img: RetouchImage, width: number, height: number): RetouchImage {
	const w = Math.max(1, Math.floor(width));
	const h = Math.max(1, Math.floor(height));
	const out = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < h; y++) {
		const sy = Math.min(img.height - 1, Math.floor((y / h) * img.height));
		for (let x = 0; x < w; x++) {
			const sx = Math.min(img.width - 1, Math.floor((x / w) * img.width));
			const si = (sy * img.width + sx) * 4;
			const di = (y * w + x) * 4;
			out[di] = img.data[si];
			out[di + 1] = img.data[si + 1];
			out[di + 2] = img.data[si + 2];
			out[di + 3] = img.data[si + 3];
		}
	}
	return makeImage(img.name, w, h, out);
}

/** High-quality resize via canvas when available. */
export function resize(img: RetouchImage, width: number, height: number): RetouchImage {
	const w = Math.max(1, Math.floor(width));
	const h = Math.max(1, Math.floor(height));
	if (typeof document === 'undefined') return resizeNearest(img, w, h);
	const src = canvasFrom(img);
	const dst = document.createElement('canvas');
	dst.width = w;
	dst.height = h;
	const ctx = dst.getContext('2d')!;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(src, 0, 0, w, h);
	return readCanvas(img.name, dst);
}

/** Fit inside maxW×maxH keeping aspect ratio. */
export function fitWithin(img: RetouchImage, maxW: number, maxH: number): RetouchImage {
	const scale = Math.min(maxW / img.width, maxH / img.height, 1);
	if (scale >= 1) return makeImage(img.name, img.width, img.height, new Uint8ClampedArray(img.data));
	return resize(img, Math.round(img.width * scale), Math.round(img.height * scale));
}

export function crop(img: RetouchImage, rect: CropRect): RetouchImage {
	const x = Math.max(0, Math.floor(rect.x));
	const y = Math.max(0, Math.floor(rect.y));
	const w = Math.max(1, Math.min(img.width - x, Math.floor(rect.w)));
	const h = Math.max(1, Math.min(img.height - y, Math.floor(rect.h)));
	const out = new Uint8ClampedArray(w * h * 4);
	for (let row = 0; row < h; row++) {
		const si = ((y + row) * img.width + x) * 4;
		out.set(img.data.subarray(si, si + w * 4), row * w * 4);
	}
	return makeImage(img.name, w, h, out);
}

/** Point-in-polygon (ray casting). */
export function pointInPolygon(px: number, py: number, poly: { x: number; y: number }[]): boolean {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const xi = poly[i].x;
		const yi = poly[i].y;
		const xj = poly[j].x;
		const yj = poly[j].y;
		const intersect =
			yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + Number.EPSILON) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}

function boundsOfPoints(pts: { x: number; y: number }[]): CropRect {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const p of pts) {
		minX = Math.min(minX, p.x);
		minY = Math.min(minY, p.y);
		maxX = Math.max(maxX, p.x);
		maxY = Math.max(maxY, p.y);
	}
	return {
		x: Math.floor(minX),
		y: Math.floor(minY),
		w: Math.max(1, Math.ceil(maxX - minX)),
		h: Math.max(1, Math.ceil(maxY - minY))
	};
}

/** Crop to polygon: bounding box output, outside shape → transparent. */
export function cropPolygon(img: RetouchImage, poly: { x: number; y: number }[]): RetouchImage {
	if (poly.length < 3) throw new Error('Polygon needs at least 3 points');
	const clamped = poly.map((p) => ({
		x: Math.max(0, Math.min(img.width, p.x)),
		y: Math.max(0, Math.min(img.height, p.y))
	}));
	const box = boundsOfPoints(clamped);
	const x0 = Math.max(0, box.x);
	const y0 = Math.max(0, box.y);
	const w = Math.max(1, Math.min(img.width - x0, box.w));
	const h = Math.max(1, Math.min(img.height - y0, box.h));
	const out = new Uint8ClampedArray(w * h * 4);
	for (let row = 0; row < h; row++) {
		for (let col = 0; col < w; col++) {
			const dx = x0 + col + 0.5;
			const dy = y0 + row + 0.5;
			const di = (row * w + col) * 4;
			if (!pointInPolygon(dx, dy, clamped)) {
				out[di + 3] = 0;
				continue;
			}
			const si = ((y0 + row) * img.width + (x0 + col)) * 4;
			out[di] = img.data[si];
			out[di + 1] = img.data[si + 1];
			out[di + 2] = img.data[si + 2];
			out[di + 3] = img.data[si + 3];
		}
	}
	return makeImage(img.name, w, h, out);
}

/** Ellipse crop inside bounding rect; outside → transparent. */
export function cropEllipse(img: RetouchImage, rect: CropRect): RetouchImage {
	const box = normalizeCrop(img, rect);
	const x0 = Math.floor(box.x);
	const y0 = Math.floor(box.y);
	const w = Math.floor(box.w);
	const h = Math.floor(box.h);
	const cx = x0 + w / 2;
	const cy = y0 + h / 2;
	const rx = w / 2;
	const ry = h / 2;
	const out = new Uint8ClampedArray(w * h * 4);
	for (let row = 0; row < h; row++) {
		for (let col = 0; col < w; col++) {
			const dx = (x0 + col + 0.5 - cx) / (rx || 1);
			const dy = (y0 + row + 0.5 - cy) / (ry || 1);
			const di = (row * w + col) * 4;
			if (dx * dx + dy * dy > 1) {
				out[di + 3] = 0;
				continue;
			}
			const si = ((y0 + row) * img.width + (x0 + col)) * 4;
			out[di] = img.data[si];
			out[di + 1] = img.data[si + 1];
			out[di + 2] = img.data[si + 2];
			out[di + 3] = img.data[si + 3];
		}
	}
	return makeImage(img.name, w, h, out);
}

export function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

export function flipHorizontal(img: RetouchImage): RetouchImage {
	const out = new Uint8ClampedArray(img.data.length);
	for (let y = 0; y < img.height; y++) {
		for (let x = 0; x < img.width; x++) {
			const si = (y * img.width + x) * 4;
			const di = (y * img.width + (img.width - 1 - x)) * 4;
			out[di] = img.data[si];
			out[di + 1] = img.data[si + 1];
			out[di + 2] = img.data[si + 2];
			out[di + 3] = img.data[si + 3];
		}
	}
	return makeImage(img.name, img.width, img.height, out);
}

export function flipVertical(img: RetouchImage): RetouchImage {
	const out = new Uint8ClampedArray(img.data.length);
	for (let y = 0; y < img.height; y++) {
		const srcRow = y * img.width * 4;
		const dstRow = (img.height - 1 - y) * img.width * 4;
		out.set(img.data.subarray(srcRow, srcRow + img.width * 4), dstRow);
	}
	return makeImage(img.name, img.width, img.height, out);
}

export function rotate90CW(img: RetouchImage): RetouchImage {
	const w = img.height;
	const h = img.width;
	const out = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < img.height; y++) {
		for (let x = 0; x < img.width; x++) {
			const si = (y * img.width + x) * 4;
			const dx = img.height - 1 - y;
			const dy = x;
			const di = (dy * w + dx) * 4;
			out[di] = img.data[si];
			out[di + 1] = img.data[si + 1];
			out[di + 2] = img.data[si + 2];
			out[di + 3] = img.data[si + 3];
		}
	}
	return makeImage(img.name, w, h, out);
}

export function rotate90CCW(img: RetouchImage): RetouchImage {
	const w = img.height;
	const h = img.width;
	const out = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < img.height; y++) {
		for (let x = 0; x < img.width; x++) {
			const si = (y * img.width + x) * 4;
			const dx = y;
			const dy = img.width - 1 - x;
			const di = (dy * w + dx) * 4;
			out[di] = img.data[si];
			out[di + 1] = img.data[si + 1];
			out[di + 2] = img.data[si + 2];
			out[di + 3] = img.data[si + 3];
		}
	}
	return makeImage(img.name, w, h, out);
}

export function rotate180(img: RetouchImage): RetouchImage {
	const out = new Uint8ClampedArray(img.data.length);
	const n = img.width * img.height;
	for (let i = 0; i < n; i++) {
		const si = i * 4;
		const di = (n - 1 - i) * 4;
		out[di] = img.data[si];
		out[di + 1] = img.data[si + 1];
		out[di + 2] = img.data[si + 2];
		out[di + 3] = img.data[si + 3];
	}
	return makeImage(img.name, img.width, img.height, out);
}

/** Clamp / normalize crop rect to image bounds. */
export function normalizeCrop(img: RetouchImage, rect: CropRect): CropRect {
	let x = rect.x;
	let y = rect.y;
	let w = rect.w;
	let h = rect.h;
	if (w < 0) {
		x += w;
		w = -w;
	}
	if (h < 0) {
		y += h;
		h = -h;
	}
	x = Math.max(0, Math.min(img.width - 1, x));
	y = Math.max(0, Math.min(img.height - 1, y));
	w = Math.max(1, Math.min(img.width - x, w));
	h = Math.max(1, Math.min(img.height - y, h));
	return { x, y, w, h };
}

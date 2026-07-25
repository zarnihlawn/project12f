import { describe, expect, it } from 'vitest';
import {
	crop,
	cropEllipse,
	cropPolygon,
	fitWithin,
	flipHorizontal,
	flipVertical,
	normalizeCrop,
	pointInPolygon,
	resizeNearest,
	rotate180,
	rotate90CW,
	rotate90CCW
} from './ops';
import { applyAdjustments, applyRetouchFilter } from './filters';
import { RetouchHistory } from './history';
import { isUnsupportedTiff } from './io';
import type { RetouchImage } from './types';
import { cloneImage } from './types';

function solid(w: number, h: number, r = 10, g = 20, b = 30): RetouchImage {
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = r;
		data[i + 1] = g;
		data[i + 2] = b;
		data[i + 3] = 255;
	}
	return { name: 't', width: w, height: h, data };
}

function gradient(w: number, h: number): RetouchImage {
	const data = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			data[i] = x;
			data[i + 1] = y;
			data[i + 2] = 128;
			data[i + 3] = 255;
		}
	}
	return { name: 'g', width: w, height: h, data };
}

describe('retouch ops', () => {
	it('flipHorizontal mirrors x', () => {
		const img = gradient(4, 2);
		const out = flipHorizontal(img);
		expect(out.width).toBe(4);
		expect(out.data[0]).toBe(img.data[(0 * 4 + 3) * 4]);
	});

	it('flipVertical mirrors y', () => {
		const img = gradient(2, 4);
		const out = flipVertical(img);
		expect(out.height).toBe(4);
		expect(out.data[0]).toBe(img.data[(3 * 2 + 0) * 4]);
	});

	it('rotate90CW swaps dimensions', () => {
		const img = solid(8, 4);
		const out = rotate90CW(img);
		expect(out.width).toBe(4);
		expect(out.height).toBe(8);
	});

	it('rotate90CCW swaps dimensions', () => {
		const img = solid(8, 4);
		const out = rotate90CCW(img);
		expect(out.width).toBe(4);
		expect(out.height).toBe(8);
	});

	it('rotate180 keeps size', () => {
		const img = gradient(3, 3);
		const out = rotate180(img);
		expect(out.width).toBe(3);
		expect(out.height).toBe(3);
		expect(out.data[0]).toBe(img.data[((2 * 3 + 2) * 4)]);
	});

	it('crop extracts region', () => {
		const img = gradient(10, 10);
		const out = crop(img, { x: 2, y: 3, w: 4, h: 5 });
		expect(out.width).toBe(4);
		expect(out.height).toBe(5);
		expect(out.data[0]).toBe(2);
		expect(out.data[1]).toBe(3);
	});

	it('cropEllipse clears outside oval', () => {
		const img = solid(20, 20, 255, 0, 0);
		const out = cropEllipse(img, { x: 0, y: 0, w: 20, h: 20 });
		expect(out.width).toBe(20);
		// corner should be transparent
		expect(out.data[3]).toBe(0);
		// center opaque
		const mid = (10 * 20 + 10) * 4;
		expect(out.data[mid + 3]).toBe(255);
	});

	it('cropPolygon keeps triangle interior', () => {
		const img = solid(20, 20, 0, 255, 0);
		const out = cropPolygon(img, [
			{ x: 10, y: 2 },
			{ x: 18, y: 18 },
			{ x: 2, y: 18 }
		]);
		expect(out.width).toBeGreaterThan(0);
		expect(out.data.some((_, i) => i % 4 === 3 && out.data[i] === 255)).toBe(true);
		expect(out.data.some((_, i) => i % 4 === 3 && out.data[i] === 0)).toBe(true);
	});

	it('pointInPolygon detects interior', () => {
		const poly = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 }
		];
		expect(pointInPolygon(5, 5, poly)).toBe(true);
		expect(pointInPolygon(15, 5, poly)).toBe(false);
	});

	it('normalizeCrop clamps negative size', () => {
		const img = solid(20, 20);
		const n = normalizeCrop(img, { x: 10, y: 10, w: -5, h: -4 });
		expect(n.w).toBeGreaterThan(0);
		expect(n.h).toBeGreaterThan(0);
		expect(n.x + n.w).toBeLessThanOrEqual(20);
	});

	it('resizeNearest changes size', () => {
		const img = solid(10, 10);
		const out = resizeNearest(img, 5, 5);
		expect(out.width).toBe(5);
		expect(out.height).toBe(5);
		expect(out.data[0]).toBe(10);
	});

	it('fitWithin only shrinks', () => {
		const img = solid(100, 50);
		const out = fitWithin(img, 50, 50);
		expect(out.width).toBeLessThanOrEqual(50);
		expect(out.height).toBeLessThanOrEqual(50);
		const same = fitWithin(img, 200, 200);
		expect(same.width).toBe(100);
	});
});

describe('retouch filters', () => {
	it('grayscale equalizes rgb', () => {
		const img = solid(2, 2, 200, 50, 50);
		const out = applyRetouchFilter(img, 'grayscale');
		expect(out.data[0]).toBe(out.data[1]);
		expect(out.data[1]).toBe(out.data[2]);
	});

	it('invert flips channels', () => {
		const img = solid(1, 1, 0, 0, 0);
		const out = applyRetouchFilter(img, 'invert');
		expect(out.data[0]).toBe(255);
	});

	it('adjustments brighten', () => {
		const img = solid(2, 2, 100, 100, 100);
		const out = applyAdjustments(img, 50, 0, 0);
		expect(out.data[0]).toBeGreaterThan(100);
	});
});

describe('retouch history', () => {
	it('undo redo round-trip', () => {
		const h = new RetouchHistory();
		const a = solid(2, 2, 1, 1, 1);
		const b = solid(2, 2, 9, 9, 9);
		h.push(a);
		const undone = h.undo(b);
		expect(undone?.data[0]).toBe(1);
		const redone = h.redo(undone!);
		expect(redone?.data[0]).toBe(9);
	});

	it('cloneImage copies buffer', () => {
		const a = solid(2, 2);
		const b = cloneImage(a);
		b.data[0] = 99;
		expect(a.data[0]).not.toBe(99);
	});
});

describe('retouch io helpers', () => {
	it('detects tiff by extension', () => {
		expect(isUnsupportedTiff(new File([], 'scan.tiff'))).toBe(true);
		expect(isUnsupportedTiff(new File([], 'photo.png'))).toBe(false);
	});
});

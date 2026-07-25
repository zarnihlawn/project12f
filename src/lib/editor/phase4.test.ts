import { describe, expect, it } from 'vitest';
import { rgbToCmyk, cmykToRgb, softProofImageData } from './color/cmyk';
import { defaultBrush, drawBrushLine, historyStamp, stampBrush } from './tools/brush-engine';
import { createPresetFromTip, makeSoftTip } from './tools/abr';
import { createDocument, createRasterLayer } from './document/factory';

describe('phase4 cmyk', () => {
	it('round-trips black and white', () => {
		expect(rgbToCmyk(0, 0, 0).k).toBeCloseTo(100, 0);
		const [r, g, b] = cmykToRgb(0, 0, 0, 0);
		expect(r).toBeCloseTo(255, 0);
		expect(g).toBeCloseTo(255, 0);
		expect(b).toBeCloseTo(255, 0);
	});

	it('softProofImageData returns same size', () => {
		const data = new Uint8ClampedArray(16);
		data[0] = 200;
		data[1] = 40;
		data[2] = 40;
		data[3] = 255;
		const img = { data, width: 2, height: 2 } as ImageData;
		const out = softProofImageData(img, 1);
		expect(out.width).toBe(2);
		expect(out.height).toBe(2);
	});
});

describe('phase4 brushes', () => {
	it('stampBrush paints opaque pixels', () => {
		const w = 64;
		const h = 64;
		const px = new Uint8ClampedArray(w * h * 4);
		const brush = defaultBrush();
		brush.size = 20;
		brush.dynamics.scatter = 0;
		stampBrush(px, w, h, 0, 0, 32, 32, { r: 255, g: 0, b: 0 }, brush, false);
		expect(px.some((v, i) => i % 4 === 0 && v > 0)).toBe(true);
	});

	it('mixer wetness blends with underlying', () => {
		const w = 32;
		const h = 32;
		const px = new Uint8ClampedArray(w * h * 4);
		for (let i = 0; i < px.length; i += 4) {
			px[i] = 0;
			px[i + 1] = 0;
			px[i + 2] = 255;
			px[i + 3] = 255;
		}
		const brush = defaultBrush();
		brush.size = 16;
		brush.wetness = 80;
		brush.mix = 80;
		stampBrush(px, w, h, 0, 0, 16, 16, { r: 255, g: 0, b: 0 }, brush, false);
		const i = (16 * w + 16) * 4;
		expect(px[i + 2]).toBeGreaterThan(0);
	});

	it('historyStamp restores snapshot under tip', () => {
		const w = 16;
		const h = 16;
		const px = new Uint8ClampedArray(w * h * 4);
		const snap = new Uint8ClampedArray(w * h * 4);
		for (let i = 0; i < snap.length; i += 4) {
			snap[i] = 200;
			snap[i + 3] = 255;
		}
		const brush = defaultBrush();
		brush.size = 8;
		brush.opacity = 100;
		brush.flow = 100;
		historyStamp(px, snap, w, h, 0, 0, 8, 8, brush);
		const i = (8 * w + 8) * 4;
		expect(px[i]).toBeGreaterThan(100);
	});

	it('drawBrushLine with dynamics count > 1 does not throw', () => {
		const w = 48;
		const h = 48;
		const px = new Uint8ClampedArray(w * h * 4);
		const brush = defaultBrush();
		brush.dynamics.count = 3;
		brush.dynamics.scatter = 20;
		drawBrushLine(px, w, h, 0, 0, 4, 4, 40, 40, { r: 10, g: 20, b: 30 }, brush, false);
		expect(px.some((v) => v > 0)).toBe(true);
	});

	it('ABR soft tip becomes preset', () => {
		const tip = makeSoftTip('Soft', 32);
		const preset = createPresetFromTip(tip, defaultBrush());
		expect(preset.settings.tip?.w).toBe(32);
		expect(preset.name).toBe('Soft');
	});
});

describe('phase4 artboards', () => {
	it('document includes artboards array', () => {
		const doc = createDocument({ width: 100, height: 100 });
		expect(doc.artboards).toEqual([]);
		doc.artboards = [
			{
				id: 'ab1',
				name: 'A1',
				x: 0,
				y: 0,
				width: 50,
				height: 50,
				background: 'white'
			}
		];
		expect(doc.artboards).toHaveLength(1);
		const layer = createRasterLayer('L', 10, 10);
		expect(layer.pixels?.length).toBe(400);
	});
});

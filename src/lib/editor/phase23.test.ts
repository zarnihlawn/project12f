import { describe, expect, it } from 'vitest';
import { selectSubject, contentAwareFill } from './intelligence/vision';
import { defaultEffects, rasterizeWithEffects } from './effects/styles';

describe('phase3 vision', () => {
	it('selectSubject returns mask', () => {
		const w = 32;
		const h = 32;
		const data = new Uint8ClampedArray(w * h * 4);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const i = (y * w + x) * 4;
				const center = Math.hypot(x - 16, y - 16) < 8;
				data[i] = center ? 200 : 40;
				data[i + 1] = center ? 40 : 40;
				data[i + 2] = center ? 40 : 180;
				data[i + 3] = 255;
			}
		}
		const mask = selectSubject({ data, width: w, height: h } as ImageData);
		expect(mask.some((v) => v > 0)).toBe(true);
	});

	it('contentAwareFill fills holes', () => {
		const w = 16;
		const h = 16;
		const src = new Uint8ClampedArray(w * h * 4).fill(128);
		for (let i = 3; i < src.length; i += 4) src[i] = 255;
		const mask = new Uint8ClampedArray(w * h);
		mask[8 * w + 8] = 255;
		const out = contentAwareFill(src, w, h, mask, 3);
		expect(out[(8 * w + 8) * 4 + 3]).toBeGreaterThan(0);
	});
});

describe('phase2 styles', () => {
	it('rasterizeWithEffects expands buffer when shadow on', () => {
		const w = 8;
		const h = 8;
		const src = new Uint8ClampedArray(w * h * 4);
		for (let i = 0; i < src.length; i += 4) {
			src[i] = 255;
			src[i + 3] = 255;
		}
		const fx = defaultEffects();
		fx.dropShadow!.enabled = true;
		const out = rasterizeWithEffects(src, w, h, 0, 0, fx);
		expect(out.w).toBeGreaterThan(w);
		expect(out.h).toBeGreaterThan(h);
	});
});

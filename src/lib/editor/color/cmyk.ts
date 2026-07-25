/** CMYK conversion + soft-proof preview (Phase 4). */

export type CMYK = { c: number; m: number; y: number; k: number };

export function rgbToCmyk(r: number, g: number, b: number): CMYK {
	const rr = r / 255;
	const gg = g / 255;
	const bb = b / 255;
	const k = 1 - Math.max(rr, gg, bb);
	if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
	const c = ((1 - rr - k) / (1 - k)) * 100;
	const m = ((1 - gg - k) / (1 - k)) * 100;
	const y = ((1 - bb - k) / (1 - k)) * 100;
	return { c, m, y, k: k * 100 };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
	const kk = k / 100;
	const r = 255 * (1 - c / 100) * (1 - kk);
	const g = 255 * (1 - m / 100) * (1 - kk);
	const b = 255 * (1 - y / 100) * (1 - kk);
	return [r, g, b];
}

/** Soft-proof: round-trip RGB→CMYK→RGB to simulate gamut compression. */
export function softProofImageData(src: ImageData, strength = 1): ImageData {
	const out = new Uint8ClampedArray(src.data);
	for (let i = 0; i < out.length; i += 4) {
		if (out[i + 3] === 0) continue;
		const cmyk = rgbToCmyk(out[i], out[i + 1], out[i + 2]);
		const [r, g, b] = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
		out[i] = out[i] * (1 - strength) + r * strength;
		out[i + 1] = out[i + 1] * (1 - strength) + g * strength;
		out[i + 2] = out[i + 2] * (1 - strength) + b * strength;
	}
	if (typeof ImageData !== 'undefined') {
		return new ImageData(out, src.width, src.height);
	}
	return { data: out, width: src.width, height: src.height } as ImageData;
}

export function separations(src: ImageData): {
	c: Uint8ClampedArray;
	m: Uint8ClampedArray;
	y: Uint8ClampedArray;
	k: Uint8ClampedArray;
} {
	const n = src.width * src.height;
	const c = new Uint8ClampedArray(n);
	const m = new Uint8ClampedArray(n);
	const y = new Uint8ClampedArray(n);
	const k = new Uint8ClampedArray(n);
	const d = src.data;
	for (let i = 0, p = 0; i < d.length; i += 4, p++) {
		const cmyk = rgbToCmyk(d[i], d[i + 1], d[i + 2]);
		c[p] = (cmyk.c / 100) * 255;
		m[p] = (cmyk.m / 100) * 255;
		y[p] = (cmyk.y / 100) * 255;
		k[p] = (cmyk.k / 100) * 255;
	}
	return { c, m, y, k };
}

export type Artboard = {
	id: string;
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	background: 'transparent' | 'white' | 'black';
};

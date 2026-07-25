import type { BlendMode } from '../types';

function clamp(v: number) {
	return v < 0 ? 0 : v > 255 ? 255 : v;
}

function lum(r: number, g: number, b: number) {
	return 0.3 * r + 0.59 * g + 0.11 * b;
}

function sat(r: number, g: number, b: number) {
	return Math.max(r, g, b) - Math.min(r, g, b);
}

function setLum(r: number, g: number, b: number, l: number) {
	const d = l - lum(r, g, b);
	return clipColor(r + d, g + d, b + d);
}

function clipColor(r: number, g: number, b: number) {
	const l = lum(r, g, b);
	const n = Math.min(r, g, b);
	const x = Math.max(r, g, b);
	if (n < 0) {
		r = l + ((r - l) * l) / (l - n);
		g = l + ((g - l) * l) / (l - n);
		b = l + ((b - l) * l) / (l - n);
	}
	if (x > 255) {
		r = l + ((r - l) * (255 - l)) / (x - l);
		g = l + ((g - l) * (255 - l)) / (x - l);
		b = l + ((b - l) * (255 - l)) / (x - l);
	}
	return [clamp(r), clamp(g), clamp(b)] as const;
}

function setSat(r: number, g: number, b: number, s: number) {
	const arr: [number, number, number] = [r, g, b];
	const sorted = [0, 1, 2].sort((i, j) => arr[i] - arr[j]);
	const min = sorted[0];
	const mid = sorted[1];
	const max = sorted[2];
	if (arr[max] > arr[min]) {
		arr[mid] = ((arr[mid] - arr[min]) * s) / (arr[max] - arr[min]);
		arr[max] = s;
	} else {
		arr[mid] = arr[max] = 0;
	}
	arr[min] = 0;
	return arr;
}

/** Blend src over dst. Channels 0–255. Returns RGB (alpha handled by caller). */
export function blendChannel(
	mode: BlendMode,
	sr: number,
	sg: number,
	sb: number,
	dr: number,
	dg: number,
	db: number
): [number, number, number] {
	const s = [sr / 255, sg / 255, sb / 255];
	const d = [dr / 255, dg / 255, db / 255];
	let o: number[];

	switch (mode) {
		case 'multiply':
			o = [s[0] * d[0], s[1] * d[1], s[2] * d[2]];
			break;
		case 'screen':
			o = [1 - (1 - s[0]) * (1 - d[0]), 1 - (1 - s[1]) * (1 - d[1]), 1 - (1 - s[2]) * (1 - d[2])];
			break;
		case 'overlay':
			o = s.map((_, i) =>
				d[i] < 0.5 ? 2 * s[i] * d[i] : 1 - 2 * (1 - s[i]) * (1 - d[i])
			);
			break;
		case 'hard-light':
			o = s.map((_, i) =>
				s[i] < 0.5 ? 2 * s[i] * d[i] : 1 - 2 * (1 - s[i]) * (1 - d[i])
			);
			break;
		case 'soft-light':
			o = s.map((_, i) => {
				if (s[i] < 0.5) return d[i] - (1 - 2 * s[i]) * d[i] * (1 - d[i]);
				const g =
					d[i] < 0.25
						? ((16 * d[i] - 12) * d[i] + 4) * d[i]
						: Math.sqrt(d[i]);
				return d[i] + (2 * s[i] - 1) * (g - d[i]);
			});
			break;
		case 'darken':
			o = [Math.min(s[0], d[0]), Math.min(s[1], d[1]), Math.min(s[2], d[2])];
			break;
		case 'lighten':
			o = [Math.max(s[0], d[0]), Math.max(s[1], d[1]), Math.max(s[2], d[2])];
			break;
		case 'color-dodge':
			o = s.map((_, i) => (s[i] >= 1 ? 1 : Math.min(1, d[i] / (1 - s[i]))));
			break;
		case 'color-burn':
			o = s.map((_, i) => (s[i] <= 0 ? 0 : 1 - Math.min(1, (1 - d[i]) / s[i])));
			break;
		case 'difference':
			o = [Math.abs(d[0] - s[0]), Math.abs(d[1] - s[1]), Math.abs(d[2] - s[2])];
			break;
		case 'exclusion':
			o = s.map((_, i) => d[i] + s[i] - 2 * d[i] * s[i]);
			break;
		case 'hue': {
			const ss = setSat(sr, sg, sb, sat(dr, dg, db));
			const [r, g, b] = setLum(ss[0], ss[1], ss[2], lum(dr, dg, db));
			return [r, g, b];
		}
		case 'saturation': {
			const ss = setSat(dr, dg, db, sat(sr, sg, sb));
			const [r, g, b] = setLum(ss[0], ss[1], ss[2], lum(dr, dg, db));
			return [r, g, b];
		}
		case 'color': {
			const [r, g, b] = setLum(sr, sg, sb, lum(dr, dg, db));
			return [r, g, b];
		}
		case 'luminosity': {
			const [r, g, b] = setLum(dr, dg, db, lum(sr, sg, sb));
			return [r, g, b];
		}
		case 'normal':
		default:
			o = s;
	}

	return [clamp(o[0] * 255), clamp(o[1] * 255), clamp(o[2] * 255)];
}

/** Porter-Duff source-over with blend mode on RGB. */
export function compositePixel(
	mode: BlendMode,
	sr: number,
	sg: number,
	sb: number,
	sa: number,
	dr: number,
	dg: number,
	db: number,
	da: number,
	opacity: number
): [number, number, number, number] {
	const a = (sa / 255) * (opacity / 100);
	if (a <= 0) return [dr, dg, db, da];
	const [br, bg, bb] = blendChannel(mode, sr, sg, sb, dr, dg, db);
	const outA = a + (da / 255) * (1 - a);
	if (outA <= 0) return [0, 0, 0, 0];
	const outR = (br * a + dr * (da / 255) * (1 - a)) / outA;
	const outG = (bg * a + dg * (da / 255) * (1 - a)) / outA;
	const outB = (bb * a + db * (da / 255) * (1 - a)) / outA;
	return [clamp(outR), clamp(outG), clamp(outB), clamp(outA * 255)];
}

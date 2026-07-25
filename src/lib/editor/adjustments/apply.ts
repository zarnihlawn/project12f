import type { AdjustmentParams } from '../types';

function clamp(v: number) {
	return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

/** Apply adjustment in-place to RGBA buffer. */
export function applyAdjustment(
	data: Uint8ClampedArray,
	adj: AdjustmentParams
): void {
	const v = adj.values;
	switch (adj.kind) {
		case 'brightness-contrast': {
			const brightness = Number(v.brightness ?? 0);
			const contrast = Number(v.contrast ?? 0);
			const c = (259 * (contrast + 255)) / (255 * (259 - contrast));
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				for (let cIdx = 0; cIdx < 3; cIdx++) {
					let x = data[i + cIdx] + brightness;
					x = c * (x - 128) + 128;
					data[i + cIdx] = clamp(x);
				}
			}
			break;
		}
		case 'exposure': {
			const exposure = Number(v.exposure ?? 0);
			const factor = Math.pow(2, exposure);
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				data[i] = clamp(data[i] * factor);
				data[i + 1] = clamp(data[i + 1] * factor);
				data[i + 2] = clamp(data[i + 2] * factor);
			}
			break;
		}
		case 'hue-saturation': {
			const hue = (Number(v.hue ?? 0) * Math.PI) / 180;
			const sat = 1 + Number(v.saturation ?? 0) / 100;
			const light = Number(v.lightness ?? 0) / 100;
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				let [r, g, b] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
				const max = Math.max(r, g, b);
				const min = Math.min(r, g, b);
				let h = 0;
				const l = (max + min) / 2;
				const d = max - min;
				const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
				if (d !== 0) {
					if (max === r) h = ((g - b) / d) % 6;
					else if (max === g) h = (b - r) / d + 2;
					else h = (r - g) / d + 4;
					h *= 60;
					if (h < 0) h += 360;
				}
				h = (h + (hue * 180) / Math.PI + 360) % 360;
				const s2 = Math.max(0, Math.min(1, s * sat));
				const l2 = Math.max(0, Math.min(1, l + light));
				const c = (1 - Math.abs(2 * l2 - 1)) * s2;
				const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
				const m = l2 - c / 2;
				let rr = 0,
					gg = 0,
					bb = 0;
				if (h < 60) [rr, gg, bb] = [c, x, 0];
				else if (h < 120) [rr, gg, bb] = [x, c, 0];
				else if (h < 180) [rr, gg, bb] = [0, c, x];
				else if (h < 240) [rr, gg, bb] = [0, x, c];
				else if (h < 300) [rr, gg, bb] = [x, 0, c];
				else [rr, gg, bb] = [c, 0, x];
				data[i] = clamp((rr + m) * 255);
				data[i + 1] = clamp((gg + m) * 255);
				data[i + 2] = clamp((bb + m) * 255);
			}
			break;
		}
		case 'vibrance': {
			const amount = Number(v.vibrance ?? 0) / 100;
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				const max = Math.max(r, g, b);
				const avg = (r + g + b) / 3;
				const sat = max - Math.min(r, g, b);
				const boost = amount * (1 - sat / 255);
				data[i] = clamp(r + (r - avg) * boost);
				data[i + 1] = clamp(g + (g - avg) * boost);
				data[i + 2] = clamp(b + (b - avg) * boost);
			}
			break;
		}
		case 'invert':
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				data[i] = 255 - data[i];
				data[i + 1] = 255 - data[i + 1];
				data[i + 2] = 255 - data[i + 2];
			}
			break;
		case 'threshold': {
			const t = Number(v.threshold ?? 128);
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
				const v2 = y >= t ? 255 : 0;
				data[i] = data[i + 1] = data[i + 2] = v2;
			}
			break;
		}
		case 'posterize': {
			const levels = Math.max(2, Math.min(255, Number(v.levels ?? 4)));
			const step = 255 / (levels - 1);
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				data[i] = clamp(Math.round(data[i] / step) * step);
				data[i + 1] = clamp(Math.round(data[i + 1] / step) * step);
				data[i + 2] = clamp(Math.round(data[i + 2] / step) * step);
			}
			break;
		}
		case 'black-white': {
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
				data[i] = data[i + 1] = data[i + 2] = clamp(y);
			}
			break;
		}
		case 'levels': {
			const inBlack = Number(v.inBlack ?? 0);
			const inWhite = Number(v.inWhite ?? 255);
			const gamma = Math.max(0.1, Number(v.gamma ?? 1));
			const outBlack = Number(v.outBlack ?? 0);
			const outWhite = Number(v.outWhite ?? 255);
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				for (let c = 0; c < 3; c++) {
					let x = (data[i + c] - inBlack) / (inWhite - inBlack || 1);
					x = Math.max(0, Math.min(1, x));
					x = Math.pow(x, 1 / gamma);
					data[i + c] = clamp(lerp(outBlack, outWhite, x));
				}
			}
			break;
		}
		case 'curves': {
			// Simple RGB master curve via control points [[0,0],[x,y],[255,255]]
			const pts = (v.points as number[][]) ?? [
				[0, 0],
				[255, 255]
			];
			const lut = buildCurveLut(pts);
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				data[i] = lut[data[i]];
				data[i + 1] = lut[data[i + 1]];
				data[i + 2] = lut[data[i + 2]];
			}
			break;
		}
		case 'color-balance': {
			const shadows = Number(v.shadowsCyanRed ?? 0);
			const mid = Number(v.midCyanRed ?? 0);
			const highlights = Number(v.highlightsCyanRed ?? 0);
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				const y = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
				const w =
					y < 0.33 ? shadows : y > 0.66 ? highlights : mid;
				data[i] = clamp(data[i] + w);
			}
			break;
		}
		case 'photo-filter': {
			const density = Number(v.density ?? 25) / 100;
			const fr = Number(v.r ?? 236);
			const fg = Number(v.g ?? 138);
			const fb = Number(v.b ?? 0);
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] === 0) continue;
				data[i] = clamp(lerp(data[i], (data[i] * fr) / 255, density));
				data[i + 1] = clamp(lerp(data[i + 1], (data[i + 1] * fg) / 255, density));
				data[i + 2] = clamp(lerp(data[i + 2], (data[i + 2] * fb) / 255, density));
			}
			break;
		}
	}
}

function buildCurveLut(points: number[][]) {
	const sorted = [...points].sort((a, b) => a[0] - b[0]);
	const lut = new Uint8ClampedArray(256);
	for (let x = 0; x < 256; x++) {
		let i = 0;
		while (i < sorted.length - 1 && sorted[i + 1][0] < x) i++;
		const p0 = sorted[i];
		const p1 = sorted[Math.min(i + 1, sorted.length - 1)];
		const t = p1[0] === p0[0] ? 0 : (x - p0[0]) / (p1[0] - p0[0]);
		lut[x] = clamp(lerp(p0[1], p1[1], t));
	}
	return lut;
}

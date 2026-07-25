import type { LayerEffects } from '../types';

export function defaultEffects(): LayerEffects {
	return {
		dropShadow: {
			enabled: false,
			opacity: 75,
			angle: 120,
			distance: 8,
			size: 8,
			color: '#000000'
		},
		innerShadow: {
			enabled: false,
			opacity: 75,
			angle: 120,
			distance: 5,
			size: 5,
			color: '#000000'
		},
		outerGlow: {
			enabled: false,
			opacity: 75,
			size: 10,
			color: '#ffffff'
		},
		innerGlow: {
			enabled: false,
			opacity: 60,
			size: 8,
			color: '#ffffff'
		},
		stroke: {
			enabled: false,
			size: 2,
			color: '#000000',
			position: 'outside'
		},
		colorOverlay: {
			enabled: false,
			opacity: 50,
			color: '#f62440'
		},
		gradientOverlay: {
			enabled: false,
			opacity: 50,
			angle: 90,
			colorA: '#000000',
			colorB: '#ffffff'
		}
	};
}

function parseHex(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const full =
		h.length === 3
			? h
					.split('')
					.map((c) => c + c)
					.join('')
			: h.padEnd(6, '0');
	return [
		parseInt(full.slice(0, 2), 16) || 0,
		parseInt(full.slice(2, 4), 16) || 0,
		parseInt(full.slice(4, 6), 16) || 0
	];
}

function clamp(v: number) {
	return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/** Expand layer RGBA with effects into a larger buffer; returns {pixels,x,y,w,h}. */
export function rasterizeWithEffects(
	src: Uint8ClampedArray,
	lw: number,
	lh: number,
	layerX: number,
	layerY: number,
	effects: LayerEffects | undefined
): { pixels: Uint8ClampedArray; x: number; y: number; w: number; h: number } {
	if (!effects) {
		return { pixels: src, x: layerX, y: layerY, w: lw, h: lh };
	}

	const pad =
		Math.max(
			effects.dropShadow?.enabled ? effects.dropShadow.distance + effects.dropShadow.size : 0,
			effects.outerGlow?.enabled ? effects.outerGlow.size : 0,
			effects.stroke?.enabled && effects.stroke.position === 'outside' ? effects.stroke.size : 0,
			0
		) + 2;

	const w = lw + pad * 2;
	const h = lh + pad * 2;
	const out = new Uint8ClampedArray(w * h * 4);
	const ox = pad;
	const oy = pad;

	// Drop shadow first (under content)
	if (effects.dropShadow?.enabled) {
		const ds = effects.dropShadow;
		const rad = (ds.angle * Math.PI) / 180;
		const dx = Math.round(Math.cos(rad) * ds.distance);
		const dy = Math.round(-Math.sin(rad) * ds.distance);
		const [cr, cg, cb] = parseHex(ds.color);
		const alpha = ds.opacity / 100;
		blurStampAlpha(src, lw, lh, out, w, h, ox + dx, oy + dy, ds.size, cr, cg, cb, alpha);
	}

	if (effects.outerGlow?.enabled) {
		const g = effects.outerGlow;
		const [cr, cg, cb] = parseHex(g.color);
		blurStampAlpha(src, lw, lh, out, w, h, ox, oy, g.size, cr, cg, cb, g.opacity / 100);
	}

	// Base pixels
	for (let y = 0; y < lh; y++) {
		for (let x = 0; x < lw; x++) {
			const si = (y * lw + x) * 4;
			const di = ((y + oy) * w + (x + ox)) * 4;
			const sa = src[si + 3] / 255;
			if (sa <= 0) continue;
			const da = out[di + 3] / 255;
			const outA = sa + da * (1 - sa);
			out[di] = clamp((src[si] * sa + out[di] * da * (1 - sa)) / (outA || 1));
			out[di + 1] = clamp((src[si + 1] * sa + out[di + 1] * da * (1 - sa)) / (outA || 1));
			out[di + 2] = clamp((src[si + 2] * sa + out[di + 2] * da * (1 - sa)) / (outA || 1));
			out[di + 3] = clamp(outA * 255);
		}
	}

	// Color overlay
	if (effects.colorOverlay?.enabled) {
		const [cr, cg, cb] = parseHex(effects.colorOverlay.color);
		const op = effects.colorOverlay.opacity / 100;
		for (let y = 0; y < lh; y++) {
			for (let x = 0; x < lw; x++) {
				const si = (y * lw + x) * 4;
				if (src[si + 3] === 0) continue;
				const di = ((y + oy) * w + (x + ox)) * 4;
				out[di] = clamp(out[di] * (1 - op) + cr * op);
				out[di + 1] = clamp(out[di + 1] * (1 - op) + cg * op);
				out[di + 2] = clamp(out[di + 2] * (1 - op) + cb * op);
			}
		}
	}

	// Gradient overlay
	if (effects.gradientOverlay?.enabled) {
		const go = effects.gradientOverlay;
		const [ar, ag, ab] = parseHex(go.colorA);
		const [br, bg, bb] = parseHex(go.colorB);
		const op = go.opacity / 100;
		const rad = (go.angle * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		for (let y = 0; y < lh; y++) {
			for (let x = 0; x < lw; x++) {
				const si = (y * lw + x) * 4;
				if (src[si + 3] === 0) continue;
				const nx = x / Math.max(1, lw - 1) - 0.5;
				const ny = y / Math.max(1, lh - 1) - 0.5;
				const t = Math.max(0, Math.min(1, nx * cos + ny * sin + 0.5));
				const di = ((y + oy) * w + (x + ox)) * 4;
				const gr = ar + (br - ar) * t;
				const gg = ag + (bg - ag) * t;
				const gb = ab + (bb - ab) * t;
				out[di] = clamp(out[di] * (1 - op) + gr * op);
				out[di + 1] = clamp(out[di + 1] * (1 - op) + gg * op);
				out[di + 2] = clamp(out[di + 2] * (1 - op) + gb * op);
			}
		}
	}

	// Inner glow / shadow (darken/lighten toward edge)
	if (effects.innerGlow?.enabled || effects.innerShadow?.enabled) {
		const edge = edgeDistance(src, lw, lh);
		if (effects.innerGlow?.enabled) {
			const g = effects.innerGlow;
			const [cr, cg, cb] = parseHex(g.color);
			const op = g.opacity / 100;
			for (let y = 0; y < lh; y++) {
				for (let x = 0; x < lw; x++) {
					const si = (y * lw + x) * 4;
					if (src[si + 3] === 0) continue;
					const d = edge[y * lw + x];
					const t = Math.max(0, 1 - d / Math.max(1, g.size)) * op;
					const di = ((y + oy) * w + (x + ox)) * 4;
					out[di] = clamp(out[di] * (1 - t) + cr * t);
					out[di + 1] = clamp(out[di + 1] * (1 - t) + cg * t);
					out[di + 2] = clamp(out[di + 2] * (1 - t) + cb * t);
				}
			}
		}
		if (effects.innerShadow?.enabled) {
			const s = effects.innerShadow;
			const [cr, cg, cb] = parseHex(s.color);
			const op = s.opacity / 100;
			for (let y = 0; y < lh; y++) {
				for (let x = 0; x < lw; x++) {
					const si = (y * lw + x) * 4;
					if (src[si + 3] === 0) continue;
					const d = edge[y * lw + x];
					const t = Math.max(0, 1 - d / Math.max(1, s.size + s.distance)) * op;
					const di = ((y + oy) * w + (x + ox)) * 4;
					out[di] = clamp(out[di] * (1 - t) + cr * t);
					out[di + 1] = clamp(out[di + 1] * (1 - t) + cg * t);
					out[di + 2] = clamp(out[di + 2] * (1 - t) + cb * t);
				}
			}
		}
	}

	// Stroke
	if (effects.stroke?.enabled) {
		const st = effects.stroke;
		const [cr, cg, cb] = parseHex(st.color);
		const size = Math.max(1, st.size);
		for (let y = 0; y < lh; y++) {
			for (let x = 0; x < lw; x++) {
				const si = (y * lw + x) * 4;
				const a = src[si + 3];
				if (st.position === 'inside' && a === 0) continue;
				if (st.position === 'outside' && a > 0) continue;
				// ring around alpha boundary
				let near = false;
				for (let yy = -size; yy <= size && !near; yy++) {
					for (let xx = -size; xx <= size; xx++) {
						if (xx * xx + yy * yy > size * size) continue;
						const nx = x + xx;
						const ny = y + yy;
						if (nx < 0 || ny < 0 || nx >= lw || ny >= lh) {
							if (st.position !== 'inside') near = a > 0;
							continue;
						}
						const na = src[(ny * lw + nx) * 4 + 3];
						if (st.position === 'outside' && a === 0 && na > 0) near = true;
						if (st.position === 'inside' && a > 0 && na === 0) near = true;
						if (st.position === 'center' && ((a > 0) !== (na > 0))) near = true;
					}
				}
				if (!near) continue;
				const di = ((y + oy) * w + (x + ox)) * 4;
				out[di] = cr;
				out[di + 1] = cg;
				out[di + 2] = cb;
				out[di + 3] = Math.max(out[di + 3], 230);
			}
		}
	}

	return { pixels: out, x: layerX - pad, y: layerY - pad, w, h };
}

function blurStampAlpha(
	src: Uint8ClampedArray,
	lw: number,
	lh: number,
	dst: Uint8ClampedArray,
	dw: number,
	dh: number,
	ox: number,
	oy: number,
	radius: number,
	cr: number,
	cg: number,
	cb: number,
	alpha: number
) {
	const r = Math.max(1, Math.round(radius));
	for (let y = 0; y < lh; y++) {
		for (let x = 0; x < lw; x++) {
			const a = src[(y * lw + x) * 4 + 3];
			if (a === 0) continue;
			for (let yy = -r; yy <= r; yy++) {
				for (let xx = -r; xx <= r; xx++) {
					const dist = Math.sqrt(xx * xx + yy * yy);
					if (dist > r) continue;
					const fall = (1 - dist / r) * (a / 255) * alpha;
					const dx = x + ox + xx;
					const dy = y + oy + yy;
					if (dx < 0 || dy < 0 || dx >= dw || dy >= dh) continue;
					const di = (dy * dw + dx) * 4;
					const da = dst[di + 3] / 255;
					const outA = fall + da * (1 - fall);
					dst[di] = clamp((cr * fall + dst[di] * da * (1 - fall)) / (outA || 1));
					dst[di + 1] = clamp((cg * fall + dst[di + 1] * da * (1 - fall)) / (outA || 1));
					dst[di + 2] = clamp((cb * fall + dst[di + 2] * da * (1 - fall)) / (outA || 1));
					dst[di + 3] = clamp(outA * 255);
				}
			}
		}
	}
}

function edgeDistance(src: Uint8ClampedArray, w: number, h: number): Float32Array {
	const dist = new Float32Array(w * h);
	dist.fill(1e6);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const a = src[(y * w + x) * 4 + 3];
			if (a === 0) {
				dist[y * w + x] = 0;
				continue;
			}
			let border = false;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= w || ny >= h || src[(ny * w + nx) * 4 + 3] === 0) {
					border = true;
					break;
				}
			}
			if (border) dist[y * w + x] = 0;
		}
	}
	// coarse propagate
	for (let iter = 0; iter < 24; iter++) {
		for (let y = 1; y < h - 1; y++) {
			for (let x = 1; x < w - 1; x++) {
				if (src[(y * w + x) * 4 + 3] === 0) continue;
				const i = y * w + x;
				const m = Math.min(dist[i - 1], dist[i + 1], dist[i - w], dist[i + w]) + 1;
				if (m < dist[i]) dist[i] = m;
			}
		}
	}
	return dist;
}

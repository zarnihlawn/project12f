/** Phase 4 brush dynamics + advanced stamps. */

export interface BrushDynamics {
	sizeJitter: number;
	opacityJitter: number;
	angleJitter: number;
	scatter: number;
	count: number;
	countJitter: number;
	hueJitter: number;
	satJitter: number;
	brightnessJitter: number;
	/** Dual brush: second tip strength 0–100 */
	dualStrength: number;
	dualSizeScale: number;
}

export interface BrushSettings {
	size: number;
	hardness: number;
	opacity: number;
	flow: number;
	spacing: number;
	smoothing: number;
	angle: number;
	roundness: number;
	dynamics: BrushDynamics;
	/** Optional tip mask (grayscale alpha), w*h */
	tip?: { w: number; h: number; data: Uint8ClampedArray };
	/** Pattern stamp tile */
	pattern?: { w: number; h: number; data: Uint8ClampedArray };
	/** Mixer wetness 0–100 */
	wetness: number;
	/** Mixer mix (load from canvas) 0–100 */
	mix: number;
}

export function defaultDynamics(): BrushDynamics {
	return {
		sizeJitter: 0,
		opacityJitter: 0,
		angleJitter: 0,
		scatter: 0,
		count: 1,
		countJitter: 0,
		hueJitter: 0,
		satJitter: 0,
		brightnessJitter: 0,
		dualStrength: 0,
		dualSizeScale: 0.5
	};
}

export function defaultBrush(): BrushSettings {
	return {
		size: 40,
		hardness: 80,
		opacity: 100,
		flow: 100,
		spacing: 10,
		smoothing: 0,
		angle: 0,
		roundness: 100,
		dynamics: defaultDynamics(),
		wetness: 0,
		mix: 0
	};
}

function clamp(v: number) {
	return v < 0 ? 0 : v > 255 ? 255 : v;
}

function rand(amp: number) {
	return (Math.random() * 2 - 1) * amp;
}

function jitterColor(
	c: { r: number; g: number; b: number },
	d: BrushDynamics
): { r: number; g: number; b: number } {
	if (!d.hueJitter && !d.satJitter && !d.brightnessJitter) return c;
	let r = c.r / 255;
	let g = c.g / 255;
	let b = c.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	const l = (max + min) / 2;
	const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
	if (max !== min) {
		if (max === r) h = ((g - b) / (max - min)) % 6;
		else if (max === g) h = (b - r) / (max - min) + 2;
		else h = (r - g) / (max - min) + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	h = (h + rand(d.hueJitter) * 1.8 + 360) % 360;
	const s2 = Math.max(0, Math.min(1, s + rand(d.satJitter) / 100));
	const l2 = Math.max(0, Math.min(1, l + rand(d.brightnessJitter) / 200));
	const C = (1 - Math.abs(2 * l2 - 1)) * s2;
	const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l2 - C / 2;
	let rr = 0,
		gg = 0,
		bb = 0;
	if (h < 60) [rr, gg, bb] = [C, X, 0];
	else if (h < 120) [rr, gg, bb] = [X, C, 0];
	else if (h < 180) [rr, gg, bb] = [0, C, X];
	else if (h < 240) [rr, gg, bb] = [0, X, C];
	else if (h < 300) [rr, gg, bb] = [X, 0, C];
	else [rr, gg, bb] = [C, 0, X];
	return {
		r: clamp((rr + m) * 255),
		g: clamp((gg + m) * 255),
		b: clamp((bb + m) * 255)
	};
}

export function stampBrush(
	pixels: Uint8ClampedArray,
	layerW: number,
	layerH: number,
	layerX: number,
	layerY: number,
	docX: number,
	docY: number,
	color: { r: number; g: number; b: number },
	brush: BrushSettings,
	erase = false
) {
	const d = brush.dynamics;
	const hasDyn =
		d.sizeJitter ||
		d.opacityJitter ||
		d.angleJitter ||
		d.scatter ||
		d.count > 1 ||
		d.countJitter ||
		d.hueJitter ||
		d.satJitter ||
		d.brightnessJitter ||
		d.dualStrength;
	if (!hasDyn) {
		stampOnce(pixels, layerW, layerH, layerX, layerY, docX, docY, color, brush, erase);
		return;
	}
	const count = Math.max(1, Math.round(d.count + rand(d.countJitter)));
	for (let n = 0; n < count; n++) {
		const scatter = (d.scatter / 100) * brush.size;
		const sx = docX + rand(scatter);
		const sy = docY + rand(scatter);
		const sizeMul = 1 + rand(d.sizeJitter / 100);
		const size = Math.max(1, brush.size * sizeMul);
		const opMul = Math.max(0.05, 1 + rand(d.opacityJitter / 100));
		const angle = brush.angle + rand(d.angleJitter);
		const col = jitterColor(color, d);
		stampOnce(
			pixels,
			layerW,
			layerH,
			layerX,
			layerY,
			sx,
			sy,
			col,
			{ ...brush, size, opacity: brush.opacity * opMul, angle },
			erase
		);
		if (d.dualStrength > 0) {
			stampOnce(
				pixels,
				layerW,
				layerH,
				layerX,
				layerY,
				sx,
				sy,
				col,
				{
					...brush,
					size: size * d.dualSizeScale,
					opacity: brush.opacity * opMul * (d.dualStrength / 100),
					angle: angle + 45,
					hardness: Math.min(100, brush.hardness + 10)
				},
				erase
			);
		}
	}
}

function stampOnce(
	pixels: Uint8ClampedArray,
	layerW: number,
	layerH: number,
	layerX: number,
	layerY: number,
	docX: number,
	docY: number,
	color: { r: number; g: number; b: number },
	brush: BrushSettings,
	erase: boolean
) {
	const lx = docX - layerX;
	const ly = docY - layerY;
	const radius = brush.size / 2;
	const hard = brush.hardness / 100;
	const flow = (brush.flow / 100) * (brush.opacity / 100);
	const round = Math.max(0.1, brush.roundness / 100);
	const rad = (brush.angle * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const x0 = Math.max(0, Math.floor(lx - radius - 1));
	const y0 = Math.max(0, Math.floor(ly - radius - 1));
	const x1 = Math.min(layerW - 1, Math.ceil(lx + radius + 1));
	const y1 = Math.min(layerH - 1, Math.ceil(ly + radius + 1));

	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			let dx = x + 0.5 - lx;
			let dy = y + 0.5 - ly;
			const rx = dx * cos + dy * sin;
			const ry = (-dx * sin + dy * cos) / round;
			const dist = Math.sqrt(rx * rx + ry * ry);
			if (dist > radius) continue;
			let edge: number;
			if (brush.tip) {
				const u = (rx / radius + 1) / 2;
				const v = (ry / radius + 1) / 2;
				const tx = Math.min(brush.tip.w - 1, Math.max(0, Math.floor(u * brush.tip.w)));
				const ty = Math.min(brush.tip.h - 1, Math.max(0, Math.floor(v * brush.tip.h)));
				edge = brush.tip.data[ty * brush.tip.w + tx] / 255;
			} else {
				const t = dist / radius;
				edge = t < hard ? 1 : 1 - (t - hard) / (1 - hard || 1);
			}
			const cover = edge * flow;
			if (cover <= 0.001) continue;
			const i = (y * layerW + x) * 4;

			if (brush.pattern && !erase) {
				const px = ((x + layerX) % brush.pattern.w + brush.pattern.w) % brush.pattern.w;
				const py = ((y + layerY) % brush.pattern.h + brush.pattern.h) % brush.pattern.h;
				const pi = (py * brush.pattern.w + px) * 4;
				const pr = brush.pattern.data[pi];
				const pg = brush.pattern.data[pi + 1];
				const pb = brush.pattern.data[pi + 2];
				const pa = (brush.pattern.data[pi + 3] / 255) * cover;
				blend(pixels, i, pr, pg, pb, pa);
				continue;
			}

			if (erase) {
				pixels[i + 3] = clamp(pixels[i + 3] * (1 - cover));
			} else if (brush.wetness > 0 && brush.mix > 0) {
				// Mixer: blend FG with underlying
				const wet = brush.wetness / 100;
				const mix = brush.mix / 100;
				const ur = pixels[i];
				const ug = pixels[i + 1];
				const ub = pixels[i + 2];
				const mr = color.r * (1 - mix) + ur * mix;
				const mg = color.g * (1 - mix) + ug * mix;
				const mb = color.b * (1 - mix) + ub * mix;
				const fr = ur * (1 - wet * cover) + mr * wet * cover;
				const fg = ug * (1 - wet * cover) + mg * wet * cover;
				const fb = ub * (1 - wet * cover) + mb * wet * cover;
				blend(pixels, i, fr, fg, fb, cover);
			} else {
				blend(pixels, i, color.r, color.g, color.b, cover);
			}
		}
	}
}

function blend(
	pixels: Uint8ClampedArray,
	i: number,
	r: number,
	g: number,
	b: number,
	cover: number
) {
	const sa = cover * 255;
	const da = pixels[i + 3];
	const outA = sa + da * (1 - cover);
	if (outA <= 0) {
		pixels[i + 3] = 0;
		return;
	}
	pixels[i] = clamp((r * sa + pixels[i] * da * (1 - cover)) / outA);
	pixels[i + 1] = clamp((g * sa + pixels[i + 1] * da * (1 - cover)) / outA);
	pixels[i + 2] = clamp((b * sa + pixels[i + 2] * da * (1 - cover)) / outA);
	pixels[i + 3] = clamp(outA);
}

export function stampOnMask(
	mask: Uint8ClampedArray,
	docW: number,
	docH: number,
	docX: number,
	docY: number,
	brush: BrushSettings,
	value: number
) {
	const radius = brush.size / 2;
	const hard = brush.hardness / 100;
	const flow = (brush.flow / 100) * (brush.opacity / 100);
	const x0 = Math.max(0, Math.floor(docX - radius - 1));
	const y0 = Math.max(0, Math.floor(docY - radius - 1));
	const x1 = Math.min(docW - 1, Math.ceil(docX + radius + 1));
	const y1 = Math.min(docH - 1, Math.ceil(docY + radius + 1));
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const dx = x + 0.5 - docX;
			const dy = y + 0.5 - docY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > radius) continue;
			const t = dist / radius;
			const edge = t < hard ? 1 : 1 - (t - hard) / (1 - hard || 1);
			const cover = edge * flow;
			const i = y * docW + x;
			mask[i] = clamp(mask[i] * (1 - cover) + value * cover);
		}
	}
}

export function drawBrushLine(
	pixels: Uint8ClampedArray,
	layerW: number,
	layerH: number,
	layerX: number,
	layerY: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	color: { r: number; g: number; b: number },
	brush: BrushSettings,
	erase = false,
	/** When continuing a stroke, skip the first stamp (already drawn). */
	skipFirst = false
) {
	const dist = Math.hypot(x1 - x0, y1 - y0);
	const step = Math.max(0.5, brush.size * (brush.spacing / 100));
	if (dist < 0.01) {
		if (!skipFirst) {
			stampBrush(pixels, layerW, layerH, layerX, layerY, x1, y1, color, brush, erase);
		}
		return;
	}
	const n = Math.max(1, Math.ceil(dist / step));
	const start = skipFirst ? 1 : 0;
	for (let i = start; i <= n; i++) {
		const t = i / n;
		stampBrush(
			pixels,
			layerW,
			layerH,
			layerX,
			layerY,
			x0 + (x1 - x0) * t,
			y0 + (y1 - y0) * t,
			color,
			brush,
			erase
		);
	}
}

/** History brush: restore from snapshot under stamp. */
export function historyStamp(
	pixels: Uint8ClampedArray,
	snapshot: Uint8ClampedArray,
	layerW: number,
	layerH: number,
	layerX: number,
	layerY: number,
	docX: number,
	docY: number,
	brush: BrushSettings
) {
	const lx = docX - layerX;
	const ly = docY - layerY;
	const radius = brush.size / 2;
	const hard = brush.hardness / 100;
	const flow = (brush.flow / 100) * (brush.opacity / 100);
	const x0 = Math.max(0, Math.floor(lx - radius - 1));
	const y0 = Math.max(0, Math.floor(ly - radius - 1));
	const x1 = Math.min(layerW - 1, Math.ceil(lx + radius + 1));
	const y1 = Math.min(layerH - 1, Math.ceil(ly + radius + 1));
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const dx = x + 0.5 - lx;
			const dy = y + 0.5 - ly;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > radius) continue;
			const t = dist / radius;
			const edge = t < hard ? 1 : 1 - (t - hard) / (1 - hard || 1);
			const cover = edge * flow;
			const i = (y * layerW + x) * 4;
			pixels[i] = pixels[i] * (1 - cover) + snapshot[i] * cover;
			pixels[i + 1] = pixels[i + 1] * (1 - cover) + snapshot[i + 1] * cover;
			pixels[i + 2] = pixels[i + 2] * (1 - cover) + snapshot[i + 2] * cover;
			pixels[i + 3] = pixels[i + 3] * (1 - cover) + snapshot[i + 3] * cover;
		}
	}
}

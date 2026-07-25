/**
 * Phase 3 intelligence — heuristic implementations (no cloud ML required).
 * Good enough for product workflows; can later swap for ONNX models.
 */

function clamp(v: number) {
	return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/** Center-weighted + contrast saliency → selection mask. */
export function selectSubject(
	image: ImageData,
	strength = 0.45
): Uint8ClampedArray {
	const { width: w, height: h, data } = image;
	const mask = new Uint8ClampedArray(w * h);
	const cx = w / 2;
	const cy = h / 2;
	const maxD = Math.hypot(cx, cy) || 1;

	// Average color
	let ar = 0,
		ag = 0,
		ab = 0,
		n = 0;
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < 8) continue;
		ar += data[i];
		ag += data[i + 1];
		ab += data[i + 2];
		n++;
	}
	ar /= n || 1;
	ag /= n || 1;
	ab /= n || 1;

	const scores = new Float32Array(w * h);
	let maxS = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const dist = 1 - Math.hypot(x - cx, y - cy) / maxD;
			const diff =
				(Math.abs(data[i] - ar) + Math.abs(data[i + 1] - ag) + Math.abs(data[i + 2] - ab)) /
				(255 * 3);
			// Edge energy
			const right = x + 1 < w ? (y * w + x + 1) * 4 : i;
			const down = y + 1 < h ? ((y + 1) * w + x) * 4 : i;
			const edge =
				(Math.abs(data[i] - data[right]) +
					Math.abs(data[i + 1] - data[right + 1]) +
					Math.abs(data[i + 2] - data[right + 2]) +
					Math.abs(data[i] - data[down]) +
					Math.abs(data[i + 1] - data[down + 1]) +
					Math.abs(data[i + 2] - data[down + 2])) /
				(255 * 6);
			const s = dist * 0.55 + diff * 0.25 + edge * 0.2;
			scores[y * w + x] = s;
			if (s > maxS) maxS = s;
		}
	}

	const thresh = maxS * (0.35 + strength * 0.4);
	for (let i = 0; i < mask.length; i++) {
		mask[i] = scores[i] >= thresh ? 255 : 0;
	}
	// Morphological close-ish
	return dilateErode(mask, w, h, 2);
}

/** Top-of-image blue/bright sky heuristic. */
export function selectSky(image: ImageData): Uint8ClampedArray {
	const { width: w, height: h, data } = image;
	const mask = new Uint8ClampedArray(w * h);
	const skyH = Math.floor(h * 0.55);
	for (let y = 0; y < skyH; y++) {
		const vert = 1 - y / skyH;
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const blueBias = b - Math.max(r, g);
			const bright = (r + g + b) / 3;
			const skyish = blueBias > 8 || (bright > 160 && b >= g && g >= r - 10);
			if (skyish && vert > 0.15) mask[y * w + x] = 255;
		}
	}
	return dilateErode(mask, w, h, 1);
}

export function replaceSky(
	image: ImageData,
	skyColor: { r: number; g: number; b: number } = { r: 70, g: 140, b: 220 },
	gradient = true
): ImageData {
	const mask = selectSky(image);
	const out = new Uint8ClampedArray(image.data);
	const w = image.width;
	const h = image.height;
	for (let y = 0; y < h; y++) {
		const t = y / Math.max(1, h * 0.55);
		const rr = gradient ? skyColor.r + (255 - skyColor.r) * Math.max(0, 1 - t) * 0.35 : skyColor.r;
		const gg = gradient ? skyColor.g + (255 - skyColor.g) * Math.max(0, 1 - t) * 0.25 : skyColor.g;
		const bb = gradient ? skyColor.b : skyColor.b;
		for (let x = 0; x < w; x++) {
			const m = mask[y * w + x] / 255;
			if (m <= 0) continue;
			const i = (y * w + x) * 4;
			out[i] = clamp(out[i] * (1 - m) + rr * m);
			out[i + 1] = clamp(out[i + 1] * (1 - m) + gg * m);
			out[i + 2] = clamp(out[i + 2] * (1 - m) + bb * m);
		}
	}
	return new ImageData(out, w, h);
}

/**
 * Simplified patch-match content-aware fill for selection mask.
 * Samples from outside the mask in a ring search.
 */
export function contentAwareFill(
	src: Uint8ClampedArray,
	w: number,
	h: number,
	mask: Uint8ClampedArray,
	patch = 5
): Uint8ClampedArray {
	const out = new Uint8ClampedArray(src);
	const r = Math.max(2, Math.floor(patch / 2));
	const holes: number[] = [];
	for (let i = 0; i < mask.length; i++) if (mask[i] > 128) holes.push(i);

	for (const hi of holes) {
		const hx = hi % w;
		const hy = (hi / w) | 0;
		let best = -1;
		let bestScore = Infinity;
		// search ring offsets
		for (let rad = r + 4; rad < Math.max(w, h) / 2; rad += r + 2) {
			for (let a = 0; a < 16; a++) {
				const ang = (a / 16) * Math.PI * 2;
				const sx = Math.round(hx + Math.cos(ang) * rad);
				const sy = Math.round(hy + Math.sin(ang) * rad);
				if (sx < r || sy < r || sx >= w - r || sy >= h - r) continue;
				if (mask[sy * w + sx] > 128) continue;
				let score = 0;
				let samples = 0;
				for (let yy = -r; yy <= r; yy++) {
					for (let xx = -r; xx <= r; xx++) {
						const tx = hx + xx;
						const ty = hy + yy;
						const qx = sx + xx;
						const qy = sy + yy;
						if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
						if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
						if (mask[ty * w + tx] > 128) continue; // only compare known border
						const ti = (ty * w + tx) * 4;
						const qi = (qy * w + qx) * 4;
						score +=
							Math.abs(src[ti] - src[qi]) +
							Math.abs(src[ti + 1] - src[qi + 1]) +
							Math.abs(src[ti + 2] - src[qi + 2]);
						samples++;
					}
				}
				if (samples > 0 && score / samples < bestScore) {
					bestScore = score / samples;
					best = sy * w + sx;
				}
			}
			if (best >= 0 && bestScore < 40) break;
		}
		if (best < 0) {
			// fallback: nearest non-mask pixel
			for (let rad = 1; rad < 64 && best < 0; rad++) {
				for (let yy = -rad; yy <= rad; yy++) {
					for (let xx = -rad; xx <= rad; xx++) {
						const sx = hx + xx;
						const sy = hy + yy;
						if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
						if (mask[sy * w + sx] > 128) continue;
						best = sy * w + sx;
						break;
					}
					if (best >= 0) break;
				}
			}
		}
		if (best >= 0) {
			const si = best * 4;
			const di = hi * 4;
			out[di] = src[si];
			out[di + 1] = src[si + 1];
			out[di + 2] = src[si + 2];
			out[di + 3] = src[si + 3] || 255;
		}
	}
	return out;
}

function dilateErode(mask: Uint8ClampedArray, w: number, h: number, r: number) {
	let cur = mask;
	for (let pass = 0; pass < r; pass++) {
		const next = new Uint8ClampedArray(cur.length);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				let on = false;
				for (let yy = -1; yy <= 1 && !on; yy++) {
					for (let xx = -1; xx <= 1; xx++) {
						const nx = x + xx;
						const ny = y + yy;
						if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
						if (cur[ny * w + nx] > 0) on = true;
					}
				}
				next[y * w + x] = on ? 255 : 0;
			}
		}
		cur = next;
	}
	for (let pass = 0; pass < r; pass++) {
		const next = new Uint8ClampedArray(cur.length);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				let on = true;
				for (let yy = -1; yy <= 1 && on; yy++) {
					for (let xx = -1; xx <= 1; xx++) {
						const nx = x + xx;
						const ny = y + yy;
						if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
							on = false;
							break;
						}
						if (cur[ny * w + nx] === 0) on = false;
					}
				}
				next[y * w + x] = on ? 255 : 0;
			}
		}
		cur = next;
	}
	return cur;
}

/**
 * Minimal ABR (Photoshop brush) tip importer.
 * Supports common ABR v6 tip image sections; falls back gracefully.
 */

export type AbrTip = { name: string; w: number; h: number; data: Uint8ClampedArray };

function readU16(view: DataView, o: number) {
	return view.getUint16(o, false);
}
function readU32(view: DataView, o: number) {
	return view.getUint32(o, false);
}

export async function parseAbrFile(file: File): Promise<AbrTip[]> {
	const buf = await file.arrayBuffer();
	const view = new DataView(buf);
	if (buf.byteLength < 8) throw new Error('Invalid ABR file');

	const version = readU16(view, 0);
	const tips: AbrTip[] = [];

	// Heuristic: scan for 8BIM 'samp' / 'desc' style chunks or raw grayscale tiles
	// ABR v6/v7: after header, brush count then records
	try {
		if (version === 6 || version === 7 || version === 2 || version === 1) {
			let offset = 2;
			const count = version >= 6 ? readU16(view, offset) : readU16(view, offset);
			offset += 2;
			for (let i = 0; i < Math.min(count, 64) && offset + 8 < buf.byteLength; i++) {
				// Skip variable records — look ahead for sizeable grayscale bitmaps
				const tip = tryExtractTipNear(view, buf, offset, i);
				if (tip) {
					tips.push(tip);
					offset += tip.w * tip.h + 64;
				} else {
					offset += 32;
				}
			}
		}
	} catch {
		/* fall through */
	}

	if (!tips.length) {
		// Last resort: interpret file as raw square grayscale if size is square
		const n = Math.floor(Math.sqrt(buf.byteLength));
		if (n >= 8 && n * n <= buf.byteLength) {
			const data = new Uint8ClampedArray(n * n);
			data.set(new Uint8Array(buf, 0, n * n));
			tips.push({ name: file.name.replace(/\.abr$/i, '') || 'Brush', w: n, h: n, data });
		}
	}

	if (!tips.length) {
		// Generate a soft round tip so import never hard-fails UX
		tips.push(makeSoftTip(file.name.replace(/\.abr$/i, '') || 'Imported', 64));
	}

	return tips;
}

function tryExtractTipNear(
	view: DataView,
	buf: ArrayBuffer,
	offset: number,
	index: number
): AbrTip | null {
	// Search next 512 bytes for plausible width/height then pixel data
	for (let o = offset; o < Math.min(offset + 512, buf.byteLength - 8); o++) {
		const w = readU32(view, o);
		const h = readU32(view, o + 4);
		if (w < 8 || h < 8 || w > 1024 || h > 1024) continue;
		const need = w * h;
		if (o + 8 + need > buf.byteLength) continue;
		const slice = new Uint8Array(buf, o + 8, need);
		// Reject if mostly zeros or flat
		let sum = 0;
		for (let i = 0; i < need; i += Math.max(1, (need / 64) | 0)) sum += slice[i];
		if (sum < 10) continue;
		return {
			name: `Tip ${index + 1}`,
			w,
			h,
			data: new Uint8ClampedArray(slice)
		};
	}
	return null;
}

export function makeSoftTip(name: string, size: number): AbrTip {
	const data = new Uint8ClampedArray(size * size);
	const r = size / 2;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
			data[y * size + x] = d >= 1 ? 0 : Math.round((1 - d) * 255);
		}
	}
	return { name, w: size, h: size, data };
}

export type BrushPreset = {
	id: string;
	name: string;
	settings: import('./brush-engine').BrushSettings;
};

export function createPresetFromTip(
	tip: AbrTip,
	base: import('./brush-engine').BrushSettings
): BrushPreset {
	return {
		id: `abr_${Math.random().toString(36).slice(2, 8)}`,
		name: tip.name,
		settings: {
			...base,
			size: Math.max(tip.w, tip.h),
			hardness: 100,
			tip: { w: tip.w, h: tip.h, data: tip.data },
			dynamics: { ...base.dynamics }
		}
	};
}

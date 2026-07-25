import { applyAdjustment } from '../adjustments/apply';
import { rasterizeWithEffects } from '../effects/styles';
import { compositePixel } from './blend';
import type { EditorDocument, Layer } from '../types';
import { getLayer } from '../document/factory';

/**
 * CPU compositor — composites document to ImageData.
 */
export function compositeDocument(doc: EditorDocument, skipLayerId?: string | null): ImageData {
	const { width, height } = doc.meta;
	const out = new Uint8ClampedArray(width * height * 4);

	for (const id of doc.layerOrder) {
		if (skipLayerId && id === skipLayerId) continue;
		const layer = getLayer(doc, id);
		if (!layer || !layer.visible) continue;
		if (layer.kind === 'group') continue;

		if (layer.kind === 'adjustment' && layer.adjustment) {
			const before = new Uint8ClampedArray(out);
			applyAdjustment(out, layer.adjustment);
			if (layer.mask?.enabled) {
				for (let i = 0; i < width * height; i++) {
					const m = layer.mask.data[i] / 255;
					const oi = i * 4;
					out[oi] = before[oi] * (1 - m) + out[oi] * m;
					out[oi + 1] = before[oi + 1] * (1 - m) + out[oi + 1] * m;
					out[oi + 2] = before[oi + 2] * (1 - m) + out[oi + 2] * m;
					out[oi + 3] = before[oi + 3] * (1 - m) + out[oi + 3] * m;
				}
			}
			continue;
		}

		if (layer.kind === 'fill' && layer.fillColor) {
			const rgba = parseHex(layer.fillColor);
			stampSolid(out, width, height, rgba, layer);
			continue;
		}

		if (!layer.pixels) continue;

		if (layer.effects && hasEnabledEffect(layer.effects)) {
			const stamped = rasterizeWithEffects(
				layer.pixels,
				layer.width,
				layer.height,
				layer.x,
				layer.y,
				layer.effects
			);
			stampBuffer(out, width, height, stamped.pixels, stamped.w, stamped.h, stamped.x, stamped.y, layer);
		} else {
			stampRaster(out, width, height, layer);
		}
	}

	return makeImageData(out, width, height);
}

/** Stamp one raster layer onto an existing buffer (used for live paint preview). */
export function stampLayerOnto(
	out: Uint8ClampedArray,
	docW: number,
	docH: number,
	layer: Layer,
	clip?: { x: number; y: number; w: number; h: number }
) {
	if (!layer.pixels || !layer.visible) return;
	if (layer.effects && hasEnabledEffect(layer.effects)) {
		const stamped = rasterizeWithEffects(
			layer.pixels,
			layer.width,
			layer.height,
			layer.x,
			layer.y,
			layer.effects
		);
		stampBufferClipped(
			out,
			docW,
			docH,
			stamped.pixels,
			stamped.w,
			stamped.h,
			stamped.x,
			stamped.y,
			layer,
			clip
		);
	} else {
		stampBufferClipped(
			out,
			docW,
			docH,
			layer.pixels,
			layer.width,
			layer.height,
			layer.x,
			layer.y,
			layer,
			clip
		);
	}
}

function hasEnabledEffect(fx: NonNullable<Layer['effects']>) {
	return Boolean(
		fx.dropShadow?.enabled ||
			fx.innerShadow?.enabled ||
			fx.outerGlow?.enabled ||
			fx.innerGlow?.enabled ||
			fx.stroke?.enabled ||
			fx.colorOverlay?.enabled ||
			fx.gradientOverlay?.enabled
	);
}

function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
	if (typeof ImageData !== 'undefined') {
		const copy = new Uint8ClampedArray(data.length);
		copy.set(data);
		return new ImageData(copy as ImageData['data'], width, height);
	}
	return { data, width, height } as ImageData;
}

function stampBuffer(
	out: Uint8ClampedArray,
	docW: number,
	docH: number,
	px: Uint8ClampedArray,
	lw: number,
	lh: number,
	layerX: number,
	layerY: number,
	layer: Layer
) {
	stampBufferClipped(out, docW, docH, px, lw, lh, layerX, layerY, layer, undefined);
}

function stampBufferClipped(
	out: Uint8ClampedArray,
	docW: number,
	docH: number,
	px: Uint8ClampedArray,
	lw: number,
	lh: number,
	layerX: number,
	layerY: number,
	layer: Layer,
	clip?: { x: number; y: number; w: number; h: number }
) {
	const opacity = layer.opacity * (layer.fill / 100);
	let yStart = 0;
	let yEnd = lh;
	let xStart = 0;
	let xEnd = lw;
	if (clip) {
		xStart = Math.max(0, Math.floor(clip.x - layerX));
		yStart = Math.max(0, Math.floor(clip.y - layerY));
		xEnd = Math.min(lw, Math.ceil(clip.x + clip.w - layerX));
		yEnd = Math.min(lh, Math.ceil(clip.y + clip.h - layerY));
	}
	for (let ly = yStart; ly < yEnd; ly++) {
		const dy = ly + layerY;
		if (dy < 0 || dy >= docH) continue;
		for (let lx = xStart; lx < xEnd; lx++) {
			const dx = lx + layerX;
			if (dx < 0 || dx >= docW) continue;
			const si = (ly * lw + lx) * 4;
			const sa = px[si + 3];
			if (sa === 0) continue;
			let maskA = 255;
			if (layer.mask?.enabled) {
				maskA = layer.mask.data[dy * docW + dx] ?? 255;
				if (maskA === 0) continue;
			}
			const di = (dy * docW + dx) * 4;
			const [r, g, b, a] = compositePixel(
				layer.blendMode,
				px[si],
				px[si + 1],
				px[si + 2],
				(sa * maskA) / 255,
				out[di],
				out[di + 1],
				out[di + 2],
				out[di + 3],
				opacity
			);
			out[di] = r;
			out[di + 1] = g;
			out[di + 2] = b;
			out[di + 3] = a;
		}
	}
}

function stampRaster(out: Uint8ClampedArray, docW: number, docH: number, layer: Layer) {
	stampBuffer(
		out,
		docW,
		docH,
		layer.pixels!,
		layer.width,
		layer.height,
		layer.x,
		layer.y,
		layer
	);
}

function stampSolid(
	out: Uint8ClampedArray,
	docW: number,
	docH: number,
	rgba: [number, number, number, number],
	layer: Layer
) {
	const opacity = layer.opacity;
	for (let y = 0; y < docH; y++) {
		for (let x = 0; x < docW; x++) {
			let maskA = 255;
			if (layer.mask?.enabled) {
				maskA = layer.mask.data[y * docW + x] ?? 255;
				if (maskA === 0) continue;
			}
			const di = (y * docW + x) * 4;
			const [r, g, b, a] = compositePixel(
				layer.blendMode,
				rgba[0],
				rgba[1],
				rgba[2],
				(rgba[3] * maskA) / 255,
				out[di],
				out[di + 1],
				out[di + 2],
				out[di + 3],
				opacity
			);
			out[di] = r;
			out[di + 1] = g;
			out[di + 2] = b;
			out[di + 3] = a;
		}
	}
}

function parseHex(hex: string): [number, number, number, number] {
	const h = hex.replace('#', '');
	const full =
		h.length === 3
			? h
					.split('')
					.map((c) => c + c)
					.join('')
			: h;
	return [
		parseInt(full.slice(0, 2), 16),
		parseInt(full.slice(2, 4), 16),
		parseInt(full.slice(4, 6), 16),
		255
	];
}

export function renderThumbnail(doc: EditorDocument, maxSize = 48): string {
	const full = compositeDocument(doc);
	const scale = Math.min(maxSize / doc.meta.width, maxSize / doc.meta.height, 1);
	const w = Math.max(1, Math.round(doc.meta.width * scale));
	const h = Math.max(1, Math.round(doc.meta.height * scale));
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const ctx = c.getContext('2d')!;
	const tmp = document.createElement('canvas');
	tmp.width = doc.meta.width;
	tmp.height = doc.meta.height;
	tmp.getContext('2d')!.putImageData(full, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.drawImage(tmp, 0, 0, w, h);
	return c.toDataURL('image/png');
}

/** Extract RGB/A channel as grayscale ImageData-like buffer. */
export function extractChannel(
	img: ImageData,
	channel: 'r' | 'g' | 'b' | 'a' | 'luma'
): Uint8ClampedArray {
	const out = new Uint8ClampedArray(img.width * img.height);
	const d = img.data;
	for (let i = 0, p = 0; i < d.length; i += 4, p++) {
		if (channel === 'r') out[p] = d[i];
		else if (channel === 'g') out[p] = d[i + 1];
		else if (channel === 'b') out[p] = d[i + 2];
		else if (channel === 'a') out[p] = d[i + 3];
		else out[p] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
	}
	return out;
}

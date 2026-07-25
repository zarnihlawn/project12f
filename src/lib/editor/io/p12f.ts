import type { EditorDocument, Layer } from '../types';
import { createId } from '../types';

export type P12FFile = {
	version: 1;
	format: 'project12f-editor';
	meta: EditorDocument['meta'];
	background: EditorDocument['background'];
	layerOrder: string[];
	activeLayerId: string | null;
	layers: Array<
		Omit<Layer, 'pixels' | 'mask'> & {
			pixelsBase64: string | null;
			maskBase64: string | null;
		}
	>;
};

function bufferToBase64(buf: Uint8ClampedArray): string {
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < buf.length; i += chunk) {
		binary += String.fromCharCode(...buf.subarray(i, i + chunk));
	}
	return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8ClampedArray {
	const binary = atob(b64);
	const out = new Uint8ClampedArray(binary.length);
	for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
	return out;
}

export function serializeDocument(doc: EditorDocument): P12FFile {
	return {
		version: 1,
		format: 'project12f-editor',
		meta: { ...doc.meta },
		background: doc.background,
		layerOrder: [...doc.layerOrder],
		activeLayerId: doc.activeLayerId,
		layers: doc.layers.map((l) => ({
			id: l.id,
			name: l.name,
			kind: l.kind,
			visible: l.visible,
			opacity: l.opacity,
			fill: l.fill,
			blendMode: l.blendMode,
			locks: { ...l.locks },
			x: l.x,
			y: l.y,
			width: l.width,
			height: l.height,
			clippingMask: l.clippingMask,
			groupId: l.groupId,
			collapsed: l.collapsed,
			children: l.children,
			adjustment: l.adjustment,
			fillColor: l.fillColor,
			effects: l.effects,
			text: l.text,
			labelColor: l.labelColor,
			mask: null,
			pixels: null,
			pixelsBase64: l.pixels ? bufferToBase64(l.pixels) : null,
			maskBase64: l.mask ? bufferToBase64(l.mask.data) : null
		}))
	};
}

export function deserializeDocument(file: P12FFile): EditorDocument {
	const layers: Layer[] = file.layers.map((l) => {
		const { pixelsBase64, maskBase64, ...rest } = l;
		const layer: Layer = {
			...(rest as Omit<Layer, 'pixels' | 'mask'>),
			pixels: pixelsBase64 ? base64ToBuffer(pixelsBase64) : null,
			mask: maskBase64
				? {
						data: base64ToBuffer(maskBase64),
						enabled: true,
						linked: true,
						density: 100,
						feather: 0
					}
				: null
		};
		return layer;
	});
	return {
		meta: { ...file.meta, id: file.meta.id || createId('doc') },
		background: file.background,
		layerOrder: file.layerOrder,
		activeLayerId: file.activeLayerId,
		layers,
		selection: { mask: null, feather: 0, antiAlias: true }
	};
}

export async function downloadP12F(doc: EditorDocument) {
	const json = JSON.stringify(serializeDocument(doc));
	const blob = new Blob([json], { type: 'application/json' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${doc.meta.name || 'untitled'}.p12f`;
	a.click();
	URL.revokeObjectURL(a.href);
}

export async function loadP12F(file: File): Promise<EditorDocument> {
	const text = await file.text();
	const parsed = JSON.parse(text) as P12FFile;
	if (parsed.format !== 'project12f-editor') throw new Error('Not a project12f editor file');
	return deserializeDocument(parsed);
}

export async function exportRaster(
	imageData: ImageData,
	format: 'png' | 'jpeg' | 'webp',
	quality = 0.92,
	filename = 'export'
) {
	const canvas = document.createElement('canvas');
	canvas.width = imageData.width;
	canvas.height = imageData.height;
	canvas.getContext('2d')!.putImageData(imageData, 0, 0);
	const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
	const blob = await new Promise<Blob | null>((res) =>
		canvas.toBlob(res, mime, quality)
	);
	if (!blob) throw new Error('Export failed');
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${filename}.${format === 'jpeg' ? 'jpg' : format}`;
	a.click();
	URL.revokeObjectURL(a.href);
}

import {
	createEmptyMask,
	createId,
	emptyLocks,
	type AdjustmentKind,
	type EditorDocument,
	type Layer,
	type RGBA
} from '../types';

export function createRasterLayer(
	name: string,
	width: number,
	height: number,
	opts?: { fill?: RGBA; x?: number; y?: number }
): Layer {
	const pixels = new Uint8ClampedArray(width * height * 4);
	if (opts?.fill) {
		const { r, g, b, a } = opts.fill;
		for (let i = 0; i < pixels.length; i += 4) {
			pixels[i] = r;
			pixels[i + 1] = g;
			pixels[i + 2] = b;
			pixels[i + 3] = a;
		}
	}
	return {
		id: createId('layer'),
		name,
		kind: 'raster',
		visible: true,
		opacity: 100,
		fill: 100,
		blendMode: 'normal',
		locks: emptyLocks(),
		x: opts?.x ?? 0,
		y: opts?.y ?? 0,
		width,
		height,
		pixels,
		mask: null,
		clippingMask: false,
		groupId: null,
		labelColor: null
	};
}

export function createAdjustmentLayer(
	name: string,
	kind: AdjustmentKind,
	values: Record<string, number | number[] | number[][]>
): Layer {
	return {
		id: createId('adj'),
		name,
		kind: 'adjustment',
		visible: true,
		opacity: 100,
		fill: 100,
		blendMode: 'normal',
		locks: emptyLocks(),
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		pixels: null,
		mask: null,
		clippingMask: false,
		groupId: null,
		adjustment: { kind, values },
		labelColor: null
	};
}

export function createDocument(opts: {
	name?: string;
	width: number;
	height: number;
	background?: 'transparent' | 'white' | 'black';
	dpi?: number;
}): EditorDocument {
	const width = Math.max(1, Math.floor(opts.width));
	const height = Math.max(1, Math.floor(opts.height));
	const background = opts.background ?? 'white';
	const layers: Layer[] = [];
	const layerOrder: string[] = [];

	if (background !== 'transparent') {
		const fill =
			background === 'white'
				? { r: 255, g: 255, b: 255, a: 255 }
				: { r: 0, g: 0, b: 0, a: 255 };
		const bg = createRasterLayer('Background', width, height, { fill });
		bg.locks.all = true;
		layers.push(bg);
		layerOrder.push(bg.id);
	}

	const now = Date.now();
	return {
		meta: {
			id: createId('doc'),
			name: opts.name ?? 'Untitled',
			width,
			height,
			dpi: opts.dpi ?? 72,
			colorMode: 'rgb',
			bitDepth: 8,
			createdAt: now,
			modifiedAt: now
		},
		layers,
		layerOrder,
		activeLayerId: layerOrder[layerOrder.length - 1] ?? null,
		selection: { mask: null, feather: 0, antiAlias: true },
		background,
		paths: [],
		activePathId: null,
		channels: [],
		actions: [],
		artboards: [],
		activeArtboardId: null
	};
}

export function getLayer(doc: EditorDocument, id: string | null | undefined): Layer | null {
	if (!id) return null;
	return doc.layers.find((l) => l.id === id) ?? null;
}

export function getActiveLayer(doc: EditorDocument): Layer | null {
	return getLayer(doc, doc.activeLayerId);
}

export function cloneLayerPixels(layer: Layer): Uint8ClampedArray | null {
	if (!layer.pixels) return null;
	return new Uint8ClampedArray(layer.pixels);
}

export function documentFromImageData(
	name: string,
	imageData: ImageData
): EditorDocument {
	const doc = createDocument({
		name,
		width: imageData.width,
		height: imageData.height,
		background: 'transparent'
	});
	const layer = createRasterLayer('Layer 1', imageData.width, imageData.height);
	layer.pixels = new Uint8ClampedArray(imageData.data);
	doc.layers = [layer];
	doc.layerOrder = [layer.id];
	doc.activeLayerId = layer.id;
	doc.paths = [];
	doc.channels = [];
	doc.actions = [];
	return doc;
}

export async function documentFromFile(file: File): Promise<EditorDocument> {
	const bitmap = await createImageBitmap(file);
	const canvas = document.createElement('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(bitmap, 0, 0);
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	bitmap.close();
	return documentFromImageData(file.name.replace(/\.[^.]+$/, '') || 'Untitled', imageData);
}

export function ensureLayerMask(doc: EditorDocument, layer: Layer, reveal = true) {
	if (!layer.mask) {
		layer.mask = createEmptyMask(doc.meta.width, doc.meta.height, reveal ? 255 : 0);
	}
	return layer.mask;
}

import { readPsd } from 'ag-psd';
import { createId, emptyLocks, type BlendMode, type EditorDocument, type Layer } from '../types';

const BLEND_MAP: Record<string, BlendMode> = {
	norm: 'normal',
	mul: 'multiply',
	scrn: 'screen',
	over: 'overlay',
	sLit: 'soft-light',
	hLit: 'hard-light',
	dark: 'darken',
	lite: 'lighten',
	div: 'color-dodge',
	idiv: 'color-burn',
	diff: 'difference',
	smud: 'exclusion',
	hue: 'hue',
	sat: 'saturation',
	colr: 'color',
	lum: 'luminosity'
};

export async function importPsdFile(file: File): Promise<EditorDocument> {
	const buf = await file.arrayBuffer();
	const psd = readPsd(buf, {
		skipLayerImageData: false,
		skipCompositeImageData: false,
		useImageData: true
	});

	const width = psd.width || 1;
	const height = psd.height || 1;
	const layers: Layer[] = [];
	const layerOrder: string[] = [];

	const walk = (nodes: typeof psd.children | undefined) => {
		if (!nodes) return;
		for (const node of nodes) {
			if (node.hidden && node.children) {
				walk(node.children);
				continue;
			}
			if (node.children?.length) {
				walk(node.children);
				continue;
			}
			const canvas = node.canvas;
			if (!canvas) continue;
			const ctx = canvas.getContext('2d');
			if (!ctx) continue;
			const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const left = node.left ?? 0;
			const top = node.top ?? 0;
			const blend = BLEND_MAP[(node.blendMode || 'norm').toString()] || 'normal';
			const layer: Layer = {
				id: createId('psd'),
				name: node.name || 'Layer',
				kind: 'raster',
				visible: !node.hidden,
				opacity: Math.round(((node.opacity ?? 1) as number) * 100),
				fill: 100,
				blendMode: blend,
				locks: emptyLocks(),
				x: left,
				y: top,
				width: canvas.width,
				height: canvas.height,
				pixels: new Uint8ClampedArray(img.data),
				mask: null,
				clippingMask: Boolean(node.clipping),
				groupId: null,
				labelColor: null
			};
			layers.push(layer);
			layerOrder.push(layer.id);
		}
	};

	if (psd.children?.length) {
		walk(psd.children);
	} else if (psd.canvas) {
		const ctx = psd.canvas.getContext('2d')!;
		const img = ctx.getImageData(0, 0, width, height);
		const layer: Layer = {
			id: createId('psd'),
			name: file.name.replace(/\.psd$/i, '') || 'Background',
			kind: 'raster',
			visible: true,
			opacity: 100,
			fill: 100,
			blendMode: 'normal',
			locks: emptyLocks(),
			x: 0,
			y: 0,
			width,
			height,
			pixels: new Uint8ClampedArray(img.data),
			mask: null,
			clippingMask: false,
			groupId: null,
			labelColor: null
		};
		layers.push(layer);
		layerOrder.push(layer.id);
	}

	if (!layers.length) throw new Error('PSD contained no readable raster layers');

	const now = Date.now();
	return {
		meta: {
			id: createId('doc'),
			name: file.name.replace(/\.psd$/i, '') || 'PSD',
			width,
			height,
			dpi: 72,
			colorMode: 'rgb',
			bitDepth: 8,
			createdAt: now,
			modifiedAt: now
		},
		layers,
		layerOrder,
		activeLayerId: layerOrder[layerOrder.length - 1] ?? null,
		selection: { mask: null, feather: 0, antiAlias: true },
		background: 'transparent'
	};
}

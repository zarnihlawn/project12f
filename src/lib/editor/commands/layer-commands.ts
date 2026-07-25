import { cloneLayerPixels, getLayer } from '../document/factory';
import type { BlendMode, EditorDocument, Layer } from '../types';
import type { Command } from './history';

export function snapshotLayerCommand(
	name: string,
	layerId: string,
	mutate: (layer: Layer, doc: EditorDocument) => void
): Command {
	let before: Uint8ClampedArray | null = null;
	let after: Uint8ClampedArray | null = null;
	let beforeMeta: Partial<Layer> | null = null;
	let afterMeta: Partial<Layer> | null = null;

	return {
		name,
		memoryBytes: 0,
		do(doc) {
			const layer = getLayer(doc, layerId);
			if (!layer) return;
			if (!before) {
				before = cloneLayerPixels(layer);
				beforeMeta = pickMeta(layer);
				mutate(layer, doc);
				after = cloneLayerPixels(layer);
				afterMeta = pickMeta(layer);
				this.memoryBytes = (before?.byteLength ?? 0) + (after?.byteLength ?? 0);
			} else {
				if (after) layer.pixels = new Uint8ClampedArray(after);
				if (afterMeta) Object.assign(layer, afterMeta);
			}
		},
		undo(doc) {
			const layer = getLayer(doc, layerId);
			if (!layer) return;
			if (before) layer.pixels = new Uint8ClampedArray(before);
			if (beforeMeta) Object.assign(layer, beforeMeta);
		}
	};
}

function pickMeta(layer: Layer): Partial<Layer> {
	return {
		opacity: layer.opacity,
		fill: layer.fill,
		blendMode: layer.blendMode,
		visible: layer.visible,
		x: layer.x,
		y: layer.y,
		name: layer.name,
		clippingMask: layer.clippingMask
	};
}

export function addLayerCommand(layer: Layer, index?: number): Command {
	return {
		name: `New ${layer.name}`,
		do(doc) {
			if (!doc.layers.find((l) => l.id === layer.id)) {
				doc.layers.push(layer);
			}
			const order = [...doc.layerOrder.filter((id) => id !== layer.id)];
			const at = index ?? order.length;
			order.splice(at, 0, layer.id);
			doc.layerOrder = order;
			doc.activeLayerId = layer.id;
		},
		undo(doc) {
			doc.layers = doc.layers.filter((l) => l.id !== layer.id);
			doc.layerOrder = doc.layerOrder.filter((id) => id !== layer.id);
			doc.activeLayerId = doc.layerOrder[doc.layerOrder.length - 1] ?? null;
		}
	};
}

export function deleteLayerCommand(layerId: string): Command {
	let removed: Layer | null = null;
	let index = -1;
	return {
		name: 'Delete Layer',
		do(doc) {
			index = doc.layerOrder.indexOf(layerId);
			removed = getLayer(doc, layerId);
			if (!removed) return;
			doc.layers = doc.layers.filter((l) => l.id !== layerId);
			doc.layerOrder = doc.layerOrder.filter((id) => id !== layerId);
			doc.activeLayerId = doc.layerOrder[Math.max(0, index - 1)] ?? null;
		},
		undo(doc) {
			if (!removed || index < 0) return;
			doc.layers.push(removed);
			doc.layerOrder.splice(index, 0, removed.id);
			doc.activeLayerId = removed.id;
		}
	};
}

export function reorderLayerCommand(from: number, to: number): Command {
	return {
		name: 'Reorder Layer',
		do(doc) {
			const order = [...doc.layerOrder];
			const [item] = order.splice(from, 1);
			order.splice(to, 0, item);
			doc.layerOrder = order;
		},
		undo(doc) {
			const order = [...doc.layerOrder];
			const [item] = order.splice(to, 1);
			order.splice(from, 0, item);
			doc.layerOrder = order;
		}
	};
}

export function setLayerPropCommand(
	layerId: string,
	props: Partial<Pick<Layer, 'opacity' | 'fill' | 'blendMode' | 'visible' | 'name' | 'clippingMask'>>
): Command {
	let prev: Partial<Layer> = {};
	return {
		name: 'Layer Property',
		do(doc) {
			const layer = getLayer(doc, layerId);
			if (!layer) return;
			prev = {
				opacity: layer.opacity,
				fill: layer.fill,
				blendMode: layer.blendMode,
				visible: layer.visible,
				name: layer.name,
				clippingMask: layer.clippingMask
			};
			Object.assign(layer, props);
		},
		undo(doc) {
			const layer = getLayer(doc, layerId);
			if (!layer) return;
			Object.assign(layer, prev);
		}
	};
}

export function paintStrokeCommand(
	layerId: string,
	before: Uint8ClampedArray,
	after: Uint8ClampedArray
): Command {
	return {
		name: 'Brush Stroke',
		mergeable: true,
		memoryBytes: before.byteLength + after.byteLength,
		do(doc) {
			const layer = getLayer(doc, layerId);
			if (layer) layer.pixels = new Uint8ClampedArray(after);
		},
		undo(doc) {
			const layer = getLayer(doc, layerId);
			if (layer) layer.pixels = new Uint8ClampedArray(before);
		},
		merge(previous) {
			const prev = previous as Command & { _before?: Uint8ClampedArray; _after?: Uint8ClampedArray };
			// Keep earliest before, latest after
			return paintStrokeCommand(layerId, (prev as unknown as { __b: Uint8ClampedArray }).__b ?? before, after);
		}
	};
}

/** Simpler stroke command that stores before once. */
export function makeStrokeCommand(
	layerId: string,
	beforePixels: Uint8ClampedArray,
	getAfter: () => Uint8ClampedArray
): Command {
	let afterPixels: Uint8ClampedArray | null = null;
	return {
		name: 'Brush Stroke',
		mergeable: false,
		do(doc) {
			const layer = getLayer(doc, layerId);
			if (!layer) return;
			if (!afterPixels) afterPixels = getAfter();
			layer.pixels = new Uint8ClampedArray(afterPixels);
			this.memoryBytes = beforePixels.byteLength + afterPixels.byteLength;
		},
		undo(doc) {
			const layer = getLayer(doc, layerId);
			if (layer) layer.pixels = new Uint8ClampedArray(beforePixels);
		}
	};
}

export type { BlendMode };

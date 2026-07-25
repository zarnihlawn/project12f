import type { EditorDocument, Layer } from '../types';
import { createId, emptyLocks } from '../types';

export type PathPoint = { x: number; y: number; kind: 'corner' | 'smooth' };
export type EditorPath = {
	id: string;
	name: string;
	closed: boolean;
	points: PathPoint[];
};

export function createPath(name = 'Path 1'): EditorPath {
	return { id: createId('path'), name, closed: false, points: [] };
}

/** Rasterize polygon/polyline path to a document-sized mask. */
export function pathToMask(
	path: EditorPath,
	width: number,
	height: number,
	stroke = false,
	strokeWidth = 2
): Uint8ClampedArray {
	const canvas =
		typeof document !== 'undefined' ? document.createElement('canvas') : null;
	if (!canvas) return new Uint8ClampedArray(width * height);
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;
	ctx.clearRect(0, 0, width, height);
	if (path.points.length < 2) return new Uint8ClampedArray(width * height);
	ctx.beginPath();
	ctx.moveTo(path.points[0].x, path.points[0].y);
	for (let i = 1; i < path.points.length; i++) {
		ctx.lineTo(path.points[i].x, path.points[i].y);
	}
	if (path.closed) ctx.closePath();
	if (stroke || !path.closed) {
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = strokeWidth;
		ctx.stroke();
	} else {
		ctx.fillStyle = '#fff';
		ctx.fill();
	}
	const data = ctx.getImageData(0, 0, width, height).data;
	const mask = new Uint8ClampedArray(width * height);
	for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4];
	return mask;
}

export function rasterizeTextLayer(
	text: { content: string; fontSize: number; fontFamily: string; color: string },
	maxW: number
): { pixels: Uint8ClampedArray; width: number; height: number } {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	ctx.font = `${text.fontSize}px ${text.fontFamily}`;
	const metrics = ctx.measureText(text.content || ' ');
	const width = Math.min(maxW, Math.ceil(metrics.width) + 8);
	const height = Math.ceil(text.fontSize * 1.4) + 8;
	canvas.width = Math.max(1, width);
	canvas.height = Math.max(1, height);
	ctx.font = `${text.fontSize}px ${text.fontFamily}`;
	ctx.fillStyle = text.color;
	ctx.textBaseline = 'top';
	ctx.fillText(text.content || '', 4, 4);
	const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
	return { pixels: new Uint8ClampedArray(img.data), width: canvas.width, height: canvas.height };
}

export function rasterizeShape(
	kind: 'rect' | 'ellipse',
	w: number,
	h: number,
	color: string,
	strokeOnly = false
): Uint8ClampedArray {
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, w);
	canvas.height = Math.max(1, h);
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	if (kind === 'ellipse') {
		ctx.beginPath();
		ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
		if (strokeOnly) ctx.stroke();
		else ctx.fill();
	} else {
		if (strokeOnly) ctx.strokeRect(1, 1, w - 2, h - 2);
		else ctx.fillRect(0, 0, w, h);
	}
	return new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data);
}

export function createTextLayer(
	content: string,
	x: number,
	y: number,
	opts?: { fontSize?: number; fontFamily?: string; color?: string }
): Layer {
	const text = {
		content,
		fontSize: opts?.fontSize ?? 48,
		fontFamily: opts?.fontFamily ?? 'Adwaita Sans, sans-serif',
		color: opts?.color ?? '#ffffff'
	};
	const { pixels, width, height } = rasterizeTextLayer(text, 2000);
	return {
		id: createId('text'),
		name: content.slice(0, 24) || 'Text',
		kind: 'text',
		visible: true,
		opacity: 100,
		fill: 100,
		blendMode: 'normal',
		locks: emptyLocks(),
		x: Math.round(x),
		y: Math.round(y),
		width,
		height,
		pixels,
		mask: null,
		clippingMask: false,
		groupId: null,
		text,
		labelColor: null
	};
}

export function createShapeLayer(
	kind: 'rect' | 'ellipse',
	x: number,
	y: number,
	w: number,
	h: number,
	color: string
): Layer {
	const width = Math.max(1, Math.round(w));
	const height = Math.max(1, Math.round(h));
	return {
		id: createId('shape'),
		name: kind === 'rect' ? 'Rectangle' : 'Ellipse',
		kind: 'shape',
		visible: true,
		opacity: 100,
		fill: 100,
		blendMode: 'normal',
		locks: emptyLocks(),
		x: Math.round(x),
		y: Math.round(y),
		width,
		height,
		pixels: rasterizeShape(kind, width, height, color),
		mask: null,
		clippingMask: false,
		groupId: null,
		fillColor: color,
		labelColor: null
	};
}

export function createFillLayer(
	name: string,
	fillColor: string,
	doc: EditorDocument
): Layer {
	return {
		id: createId('fill'),
		name,
		kind: 'fill',
		visible: true,
		opacity: 100,
		fill: 100,
		blendMode: 'normal',
		locks: emptyLocks(),
		x: 0,
		y: 0,
		width: doc.meta.width,
		height: doc.meta.height,
		pixels: null,
		mask: null,
		clippingMask: false,
		groupId: null,
		fillColor,
		labelColor: null
	};
}

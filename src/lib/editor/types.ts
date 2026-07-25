/**
 * project12f Image Editor — shared types (Phases 0–4).
 */

export type BlendMode =
	| 'normal'
	| 'multiply'
	| 'screen'
	| 'overlay'
	| 'soft-light'
	| 'hard-light'
	| 'darken'
	| 'lighten'
	| 'color-dodge'
	| 'color-burn'
	| 'difference'
	| 'exclusion'
	| 'hue'
	| 'saturation'
	| 'color'
	| 'luminosity';

export type LayerKind =
	| 'raster'
	| 'group'
	| 'adjustment'
	| 'fill'
	| 'text'
	| 'shape'
	| 'smart-object';

export type AdjustmentKind =
	| 'brightness-contrast'
	| 'levels'
	| 'curves'
	| 'exposure'
	| 'vibrance'
	| 'hue-saturation'
	| 'color-balance'
	| 'black-white'
	| 'photo-filter'
	| 'invert'
	| 'threshold'
	| 'posterize';

export type ToolId =
	| 'move'
	| 'marquee-rect'
	| 'marquee-ellipse'
	| 'lasso'
	| 'poly-lasso'
	| 'magic-wand'
	| 'quick-select'
	| 'crop'
	| 'eyedropper'
	| 'brush'
	| 'pencil'
	| 'eraser'
	| 'paint-bucket'
	| 'gradient'
	| 'clone'
	| 'spot-heal'
	| 'healing'
	| 'patch'
	| 'dodge'
	| 'burn'
	| 'sponge'
	| 'blur'
	| 'sharpen'
	| 'smudge'
	| 'pen'
	| 'path-select'
	| 'text'
	| 'shape-rect'
	| 'shape-ellipse'
	| 'hand'
	| 'zoom'
	| 'rotate-view'
	| 'mixer-brush'
	| 'pattern-stamp'
	| 'history-brush'
	| 'ruler'
	| 'count'
	| 'note';

export type ColorMode = 'rgb' | 'cmyk' | 'lab' | 'grayscale';
export type BitDepth = 8 | 16;

export interface RGBA {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface LayerLocks {
	transparency: boolean;
	image: boolean;
	position: boolean;
	all: boolean;
}

export interface LayerMask {
	/** Same size as document; alpha used as mask (0=hide, 255=reveal). */
	data: Uint8ClampedArray;
	enabled: boolean;
	linked: boolean;
	density: number;
	feather: number;
}

export interface AdjustmentParams {
	kind: AdjustmentKind;
	/** Generic numeric bag — interpreted per kind. */
	values: Record<string, number | number[] | number[][]>;
}

export interface LayerEffects {
	dropShadow?: {
		enabled: boolean;
		opacity: number;
		angle: number;
		distance: number;
		size: number;
		color: string;
	};
	innerShadow?: {
		enabled: boolean;
		opacity: number;
		angle: number;
		distance: number;
		size: number;
		color: string;
	};
	outerGlow?: { enabled: boolean; opacity: number; size: number; color: string };
	innerGlow?: { enabled: boolean; opacity: number; size: number; color: string };
	stroke?: {
		enabled: boolean;
		size: number;
		color: string;
		position: 'outside' | 'inside' | 'center';
	};
	colorOverlay?: { enabled: boolean; opacity: number; color: string };
	gradientOverlay?: {
		enabled: boolean;
		opacity: number;
		angle: number;
		colorA: string;
		colorB: string;
	};
}

export interface EditorPathDoc {
	id: string;
	name: string;
	closed: boolean;
	points: { x: number; y: number; kind: 'corner' | 'smooth' }[];
}

export interface ActionStep {
	name: string;
	/** Serialized lightweight action id */
	op: string;
	payload?: Record<string, unknown>;
}

export interface EditorAction {
	id: string;
	name: string;
	steps: ActionStep[];
}

export interface Layer {
	id: string;
	name: string;
	kind: LayerKind;
	visible: boolean;
	opacity: number;
	fill: number;
	blendMode: BlendMode;
	locks: LayerLocks;
	/** Document-space offset of raster pixels */
	x: number;
	y: number;
	width: number;
	height: number;
	/** RGBA buffer; length width*height*4. Null for non-raster kinds until rasterized. */
	pixels: Uint8ClampedArray | null;
	mask: LayerMask | null;
	clippingMask: boolean;
	groupId: string | null;
	collapsed?: boolean;
	children?: string[];
	adjustment?: AdjustmentParams;
	fillColor?: string;
	effects?: LayerEffects;
	text?: { content: string; fontSize: number; fontFamily: string; color: string };
	labelColor?: string | null;
}

export interface Selection {
	/** Document-sized mask; 0 or 255 (soft edges allowed). */
	mask: Uint8ClampedArray | null;
	feather: number;
	antiAlias: boolean;
}

export interface DocumentMeta {
	id: string;
	name: string;
	width: number;
	height: number;
	dpi: number;
	colorMode: ColorMode;
	bitDepth: BitDepth;
	createdAt: number;
	modifiedAt: number;
}

export interface EditorDocument {
	meta: DocumentMeta;
	layers: Layer[];
	/** Bottom → top order (last paints on top). */
	layerOrder: string[];
	activeLayerId: string | null;
	selection: Selection;
	background: 'transparent' | 'white' | 'black';
	/** Phase 2 vector paths */
	paths?: EditorPathDoc[];
	activePathId?: string | null;
	/** Saved alpha channels */
	channels?: { id: string; name: string; data: Uint8ClampedArray }[];
	/** Phase 2 actions */
	actions?: EditorAction[];
	/** Phase 4 artboards */
	artboards?: {
		id: string;
		name: string;
		x: number;
		y: number;
		width: number;
		height: number;
		background: 'transparent' | 'white' | 'black';
	}[];
	activeArtboardId?: string | null;
}

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
	{ id: 'normal', label: 'Normal' },
	{ id: 'multiply', label: 'Multiply' },
	{ id: 'screen', label: 'Screen' },
	{ id: 'overlay', label: 'Overlay' },
	{ id: 'soft-light', label: 'Soft Light' },
	{ id: 'hard-light', label: 'Hard Light' },
	{ id: 'darken', label: 'Darken' },
	{ id: 'lighten', label: 'Lighten' },
	{ id: 'color-dodge', label: 'Color Dodge' },
	{ id: 'color-burn', label: 'Color Burn' },
	{ id: 'difference', label: 'Difference' },
	{ id: 'exclusion', label: 'Exclusion' },
	{ id: 'hue', label: 'Hue' },
	{ id: 'saturation', label: 'Saturation' },
	{ id: 'color', label: 'Color' },
	{ id: 'luminosity', label: 'Luminosity' }
];

export function createId(prefix = 'id') {
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function emptyLocks(): LayerLocks {
	return { transparency: false, image: false, position: false, all: false };
}

export function createEmptyMask(w: number, h: number, fill = 255): LayerMask {
	return {
		data: new Uint8ClampedArray(w * h).fill(fill),
		enabled: true,
		linked: true,
		density: 100,
		feather: 0
	};
}

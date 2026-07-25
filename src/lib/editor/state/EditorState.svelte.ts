import { createAdjustmentLayer, createDocument, createRasterLayer, documentFromFile, ensureLayerMask, getActiveLayer, getLayer } from '../document/factory';
import { HistoryStack } from '../commands/history';
import {
	addLayerCommand,
	deleteLayerCommand,
	makeStrokeCommand,
	reorderLayerCommand,
	setLayerPropCommand
} from '../commands/layer-commands';
import { compositeDocument, extractChannel, stampLayerOnto } from '../compositor/composite';
import { defaultBrush, drawBrushLine, historyStamp, stampOnMask, type BrushSettings } from '../tools/brush-engine';
import { createPresetFromTip, parseAbrFile, type BrushPreset } from '../tools/abr';
import { softProofImageData, type Artboard } from '../color/cmyk';
import type { AdjustmentKind, EditorDocument, LayerEffects, RGBA, ToolId } from '../types';
import { createId } from '../types';
import { defaultEffects } from '../effects/styles';
import {
	createFillLayer,
	createPath,
	createShapeLayer,
	createTextLayer,
	pathToMask
} from '../vectors/paths';
import {
	contentAwareFill,
	replaceSky,
	selectSky,
	selectSubject
} from '../intelligence/vision';
import { importPsdFile } from '../io/psd';
import { applyFilterToActiveLayer, type FilterId } from '../filters/catalog';

export type EditorPanel =
	| 'layers'
	| 'history'
	| 'color'
	| 'properties'
	| 'adjustments'
	| 'filters'
	| 'paths'
	| 'channels'
	| 'actions'
	| 'character'
	| 'paragraph'
	| 'styles'
	| 'info';

export class EditorState {
	doc: EditorDocument | null = $state(null);
	history = new HistoryStack();
	tool: ToolId = $state('move');
	brush: BrushSettings = $state(defaultBrush());
	fg: RGBA = $state({ r: 0, g: 0, b: 0, a: 255 });
	bg: RGBA = $state({ r: 255, g: 255, b: 255, a: 255 });
	zoom = $state(1);
	panX = $state(0);
	panY = $state(0);
	dirty = $state(0);
	/** Bumps during live stroke without full document invalidation */
	strokeTick = $state(0);
	/** True while a paint stroke is in progress */
	painting = $state(false);
	/** Last dirty rect in document space for GPU partial upload */
	strokeDirtyRect: { x: number; y: number; w: number; h: number } | null = $state(null);
	spaceDown = $state(false);
	paintOnMask = $state(false);
	quickMask = $state(false);
	status = $state('Ready');
	cursorDoc = $state({ x: 0, y: 0 });
	activePanels: EditorPanel[] = $state(['layers', 'history', 'color', 'properties']);
	/** Phase 2+ feature flags / stubs visibility */
	featureTier = $state<'core' | 'pro' | 'lab'>('pro');

	private strokeBefore: Uint8ClampedArray | null = null;
	private lastPaint: { x: number; y: number } | null = null;
	private cloneSource: { x: number; y: number } | null = null;
	private selectionDrag: { x0: number; y0: number; x1: number; y1: number } | null = null;
	private panning: { x: number; y: number; panX: number; panY: number } | null = null;
	private lassoPoints: { x: number; y: number }[] = [];
	private shapeDrag: { x0: number; y0: number; x1: number; y1: number } | null = null;
	private gradientDrag: { x0: number; y0: number; x1: number; y1: number } | null = null;
	recordingAction = $state(false);
	private actionBuffer: { name: string; op: string; payload?: Record<string, unknown> }[] = [];
	channelPreview = $state<'rgb' | 'r' | 'g' | 'b' | 'a' | 'luma'>('rgb');
	textDraft = $state('Hello project12f');
	textSize = $state(48);

	/** Phase 4 — view / print / brushes */
	viewRotation = $state(0);
	softProof = $state(false);
	brushPresets: BrushPreset[] = $state([]);
	/** Layer-pixel snapshot for History Brush (active layer at capture time) */
	historyBrushSnapshot: { layerId: string; pixels: Uint8ClampedArray } | null = $state(null);
	printBleedMm = $state(3);
	printCropMarks = $state(true);
	printColorBars = $state(false);
	rulerMeasure: { x0: number; y0: number; x1: number; y1: number } | null = $state(null);
	countMarks: { x: number; y: number }[] = $state([]);
	private rulerDrag: { x0: number; y0: number; x1: number; y1: number } | null = null;
	private rotateDrag: { lastX: number } | null = null;
	private composedCache: ImageData | null = null;
	private composedCacheKey = -1;
	/** Underlay (all layers except active) captured at stroke start */
	private paintUnderlay: Uint8ClampedArray | null = null;
	/** Live display buffer during stroke */
	private liveDisplay: ImageData | null = null;
	private strokeContinuing = false;

	get composed(): ImageData | null {
		if (!this.doc) return null;
		void this.dirty;
		void this.softProof;
		void this.strokeTick;
		if (this.painting && this.liveDisplay) {
			return this.liveDisplay;
		}
		if (this.composedCache && this.composedCacheKey === this.dirty && !this.softProof) {
			return this.composedCache;
		}
		const img = compositeDocument(this.doc);
		const out = this.softProof ? softProofImageData(img, 1) : img;
		if (!this.softProof) {
			this.composedCache = out;
			this.composedCacheKey = this.dirty;
		}
		return out;
	}

	markDirty() {
		this.composedCache = null;
		this.composedCacheKey = -1;
		this.dirty++;
	}

	private markStrokePreview(docX: number, docY: number, radius: number) {
		const pad = Math.ceil(radius + 2);
		const rect = {
			x: Math.floor(docX - pad),
			y: Math.floor(docY - pad),
			w: pad * 2,
			h: pad * 2
		};
		this.refreshLiveDisplay(rect);
		// Latest dirty only — prior stroke segments already live in the GPU texture
		this.strokeDirtyRect = rect;
		this.strokeTick++;
	}

	private beginPaintSession() {
		if (!this.doc) return;
		const layer = getActiveLayer(this.doc);
		const order = this.doc.layerOrder;
		const idx = layer ? order.indexOf(layer.id) : -1;
		const hasAbove =
			idx >= 0 &&
			order.slice(idx + 1).some((id) => {
				const l = getLayer(this.doc!, id);
				return l && l.visible && l.kind !== 'group';
			});

		if (!hasAbove) {
			const under = compositeDocument(this.doc, layer?.id ?? null);
			this.paintUnderlay = new Uint8ClampedArray(under.data);
			const data = new Uint8ClampedArray(under.data);
			this.liveDisplay =
				typeof ImageData !== 'undefined'
					? new ImageData(data, under.width, under.height)
					: ({ data, width: under.width, height: under.height } as ImageData);
			if (layer) stampLayerOnto(this.liveDisplay.data, under.width, under.height, layer);
		} else {
			// Active not on top: snapshot full composite; live stamps approximate on buffer
			const full = compositeDocument(this.doc);
			this.paintUnderlay = null;
			const data = new Uint8ClampedArray(full.data);
			this.liveDisplay =
				typeof ImageData !== 'undefined'
					? new ImageData(data, full.width, full.height)
					: ({ data, width: full.width, height: full.height } as ImageData);
		}
		this.painting = true;
		this.strokeDirtyRect = null;
		this.strokeContinuing = false;
		this.strokeTick++;
	}

	private refreshLiveDisplay(clip?: { x: number; y: number; w: number; h: number }) {
		if (!this.doc || !this.liveDisplay) return;
		const layer = getActiveLayer(this.doc);
		const { width, height } = this.doc.meta;
		const dst = this.liveDisplay.data;

		if (this.paintUnderlay) {
			const src = this.paintUnderlay;
			if (clip) {
				const x0 = Math.max(0, Math.floor(clip.x));
				const y0 = Math.max(0, Math.floor(clip.y));
				const x1 = Math.min(width, Math.ceil(clip.x + clip.w));
				const y1 = Math.min(height, Math.ceil(clip.y + clip.h));
				for (let y = y0; y < y1; y++) {
					const i = (y * width + x0) * 4;
					dst.set(src.subarray(i, i + (x1 - x0) * 4), i);
				}
				if (layer)
					stampLayerOnto(dst, width, height, layer, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
			} else {
				dst.set(src);
				if (layer) stampLayerOnto(dst, width, height, layer);
			}
		}
		// If no underlay (layer not on top), liveDisplay was stamped directly during paintAt
	}

	/** Direct stamp onto live display when active layer is buried (approximate preview). */
	private stampLiveBrush(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		color: { r: number; g: number; b: number },
		brush: BrushSettings,
		erase: boolean,
		skipFirst: boolean
	) {
		if (!this.liveDisplay || this.paintUnderlay) return;
		drawBrushLine(
			this.liveDisplay.data,
			this.liveDisplay.width,
			this.liveDisplay.height,
			0,
			0,
			x0,
			y0,
			x1,
			y1,
			color,
			brush,
			erase,
			skipFirst
		);
	}

	private endPaintSession() {
		this.painting = false;
		this.paintUnderlay = null;
		this.liveDisplay = null;
		this.strokeDirtyRect = null;
		this.strokeContinuing = false;
		this.markDirty();
	}

	newDocument(width = 1920, height = 1080, background: 'transparent' | 'white' | 'black' = 'white') {
		this.doc = createDocument({ width, height, background, name: 'Untitled' });
		this.history.clear();
		this.fitZoom();
		this.markDirty();
		this.status = `New ${width}×${height}`;
	}

	async openFile(file: File) {
		this.doc = await documentFromFile(file);
		this.history.clear();
		this.fitZoom();
		this.markDirty();
		this.status = `Opened ${file.name}`;
	}

	fitZoom(viewW = 800, viewH = 600) {
		if (!this.doc) return;
		const zx = (viewW - 80) / this.doc.meta.width;
		const zy = (viewH - 80) / this.doc.meta.height;
		this.zoom = Math.min(Math.max(0.05, Math.min(zx, zy)), 4);
		this.panX = 0;
		this.panY = 0;
	}

	undo() {
		if (!this.doc || !this.history.canUndo) return;
		this.history.undo(this.doc);
		this.markDirty();
		this.status = 'Undo';
	}

	redo() {
		if (!this.doc || !this.history.canRedo) return;
		this.history.redo(this.doc);
		this.markDirty();
		this.status = 'Redo';
	}

	setTool(tool: ToolId) {
		this.tool = tool;
		this.status = `Tool: ${tool}`;
	}

	swapColors() {
		const t = this.fg;
		this.fg = this.bg;
		this.bg = t;
	}

	resetColors() {
		this.fg = { r: 0, g: 0, b: 0, a: 255 };
		this.bg = { r: 255, g: 255, b: 255, a: 255 };
	}

	addEmptyLayer() {
		if (!this.doc) return;
		const layer = createRasterLayer(
			`Layer ${this.doc.layers.length + 1}`,
			this.doc.meta.width,
			this.doc.meta.height
		);
		this.history.execute(this.doc, addLayerCommand(layer));
		this.markDirty();
	}

	addAdjustment(kind: AdjustmentKind) {
		if (!this.doc) return;
		const defaults: Record<AdjustmentKind, Record<string, number | number[] | number[][]>> = {
			'brightness-contrast': { brightness: 0, contrast: 0 },
			levels: { inBlack: 0, inWhite: 255, gamma: 1, outBlack: 0, outWhite: 255 },
			curves: {
				points: [
					[0, 0],
					[128, 128],
					[255, 255]
				]
			},
			exposure: { exposure: 0 },
			vibrance: { vibrance: 30 },
			'hue-saturation': { hue: 0, saturation: 0, lightness: 0 },
			'color-balance': { shadowsCyanRed: 0, midCyanRed: 0, highlightsCyanRed: 0 },
			'black-white': {},
			'photo-filter': { density: 25, r: 236, g: 138, b: 0 },
			invert: {},
			threshold: { threshold: 128 },
			posterize: { levels: 4 }
		};
		const values = { ...defaults[kind] };
		const layer = createAdjustmentLayer(kind, kind, values);
		this.history.execute(this.doc, addLayerCommand(layer));
		this.markDirty();
	}

	deleteActiveLayer() {
		if (!this.doc?.activeLayerId) return;
		this.history.execute(this.doc, deleteLayerCommand(this.doc.activeLayerId));
		this.markDirty();
	}

	duplicateActiveLayer() {
		if (!this.doc) return;
		const src = getActiveLayer(this.doc);
		if (!src || !src.pixels) return;
		const copy = createRasterLayer(`${src.name} copy`, src.width, src.height, {
			x: src.x,
			y: src.y
		});
		copy.pixels = new Uint8ClampedArray(src.pixels);
		copy.opacity = src.opacity;
		copy.blendMode = src.blendMode;
		this.history.execute(this.doc, addLayerCommand(copy));
		this.markDirty();
	}

	setActiveLayer(id: string) {
		if (!this.doc) return;
		this.doc.activeLayerId = id;
		this.markDirty();
	}

	setLayerOpacity(id: string, opacity: number) {
		if (!this.doc) return;
		this.history.execute(this.doc, setLayerPropCommand(id, { opacity }));
		this.markDirty();
	}

	setLayerBlend(id: string, blendMode: LayerBlend) {
		if (!this.doc) return;
		this.history.execute(this.doc, setLayerPropCommand(id, { blendMode }));
		this.markDirty();
	}

	toggleLayerVisible(id: string) {
		if (!this.doc) return;
		const layer = getLayer(this.doc, id);
		if (!layer) return;
		this.history.execute(this.doc, setLayerPropCommand(id, { visible: !layer.visible }));
		this.markDirty();
	}

	reorderLayer(from: number, to: number) {
		if (!this.doc) return;
		this.history.execute(this.doc, reorderLayerCommand(from, to));
		this.markDirty();
	}

	addMask(reveal = true) {
		if (!this.doc) return;
		const layer = getActiveLayer(this.doc);
		if (!layer) return;
		ensureLayerMask(this.doc, layer, reveal);
		this.markDirty();
		this.status = 'Layer mask added';
	}

	/* —— pointer interaction —— */
	pointerDown(docX: number, docY: number, buttons: number, shiftKey: boolean) {
		if (!this.doc) return;
		if (this.spaceDown || this.tool === 'hand' || buttons === 4) {
			this.panning = { x: docX, y: docY, panX: this.panX, panY: this.panY };
			return;
		}

		if (this.tool === 'rotate-view') {
			this.rotateDrag = { lastX: docX };
			return;
		}

		if (this.tool === 'ruler') {
			this.rulerDrag = { x0: docX, y0: docY, x1: docX, y1: docY };
			this.rulerMeasure = { ...this.rulerDrag };
			return;
		}

		if (this.tool === 'count') {
			this.countMarks = [...this.countMarks, { x: docX, y: docY }];
			this.status = `Count: ${this.countMarks.length}`;
			this.markDirty();
			return;
		}

		const layer = getActiveLayer(this.doc);

		if (this.tool === 'eyedropper') {
			const img = this.composed;
			if (!img) return;
			const x = Math.floor(docX);
			const y = Math.floor(docY);
			if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
			const i = (y * img.width + x) * 4;
			this.fg = { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2], a: img.data[i + 3] };
			return;
		}

		if (this.tool === 'marquee-rect' || this.tool === 'marquee-ellipse') {
			this.selectionDrag = { x0: docX, y0: docY, x1: docX, y1: docY };
			return;
		}

		if (this.tool === 'lasso') {
			this.lassoPoints = [{ x: docX, y: docY }];
			return;
		}

		if (this.tool === 'magic-wand') {
			this.magicWandSelect(Math.floor(docX), Math.floor(docY));
			return;
		}

		if (this.tool === 'pen') {
			this.addPenPoint(docX, docY);
			return;
		}

		if (this.tool === 'text') {
			this.placeText(docX, docY);
			return;
		}

		if (this.tool === 'shape-rect' || this.tool === 'shape-ellipse') {
			this.shapeDrag = { x0: docX, y0: docY, x1: docX, y1: docY };
			return;
		}

		if (this.tool === 'gradient') {
			this.gradientDrag = { x0: docX, y0: docY, x1: docX, y1: docY };
			return;
		}

		if (this.tool === 'crop') {
			this.selectionDrag = { x0: docX, y0: docY, x1: docX, y1: docY };
			return;
		}

		if (this.tool === 'clone' && shiftKey) {
			this.cloneSource = { x: docX, y: docY };
			this.status = `Clone source set (${Math.round(docX)}, ${Math.round(docY)})`;
			return;
		}

		if (
			layer?.pixels &&
			(this.tool === 'brush' ||
				this.tool === 'pencil' ||
				this.tool === 'eraser' ||
				this.tool === 'clone' ||
				this.tool === 'spot-heal' ||
				this.tool === 'dodge' ||
				this.tool === 'burn' ||
				this.tool === 'mixer-brush' ||
				this.tool === 'pattern-stamp' ||
				this.tool === 'history-brush' ||
				this.paintOnMask)
		) {
			if (this.paintOnMask && layer.mask) {
				this.strokeBefore = new Uint8ClampedArray(layer.mask.data);
			} else {
				this.strokeBefore = new Uint8ClampedArray(layer.pixels);
			}
			this.beginPaintSession();
			this.lastPaint = { x: docX, y: docY };
			this.paintAt(docX, docY, docX, docY, false);
		}

		if (this.tool === 'paint-bucket' && layer?.pixels) {
			this.floodFill(Math.floor(docX), Math.floor(docY));
		}

		void shiftKey;
	}

	pointerMove(docX: number, docY: number, screenDX?: number, screenDY?: number) {
		this.cursorDoc = { x: docX, y: docY };
		if (this.panning && screenDX != null && screenDY != null) {
			this.panX += screenDX;
			this.panY += screenDY;
			return;
		}
		if (this.rotateDrag) {
			const delta = docX - this.rotateDrag.lastX;
			this.viewRotation = (this.viewRotation + delta * 0.4) % 360;
			this.rotateDrag.lastX = docX;
			this.status = `View rotate ${Math.round(this.viewRotation)}°`;
			return;
		}
		if (this.rulerDrag) {
			this.rulerDrag.x1 = docX;
			this.rulerDrag.y1 = docY;
			this.rulerMeasure = { ...this.rulerDrag };
			const dx = this.rulerDrag.x1 - this.rulerDrag.x0;
			const dy = this.rulerDrag.y1 - this.rulerDrag.y0;
			const dist = Math.hypot(dx, dy);
			const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
			this.status = `Ruler ${dist.toFixed(1)}px · ${angle.toFixed(1)}°`;
			this.markDirty();
			return;
		}
		if (this.selectionDrag) {
			this.selectionDrag.x1 = docX;
			this.selectionDrag.y1 = docY;
			this.markDirty();
			return;
		}
		if (this.shapeDrag) {
			this.shapeDrag.x1 = docX;
			this.shapeDrag.y1 = docY;
			this.markDirty();
			return;
		}
		if (this.gradientDrag) {
			this.gradientDrag.x1 = docX;
			this.gradientDrag.y1 = docY;
			this.markDirty();
			return;
		}
		if (this.tool === 'lasso' && this.lassoPoints.length) {
			this.lassoPoints.push({ x: docX, y: docY });
			this.markDirty();
			return;
		}
		if (this.lastPaint && this.strokeBefore) {
			this.paintAt(this.lastPaint.x, this.lastPaint.y, docX, docY, true);
			this.lastPaint = { x: docX, y: docY };
		}
	}

	/** Batch many pointer samples (coalesced events) into one stroke. */
	pointerMoveBatch(points: { x: number; y: number }[]) {
		if (!points.length) return;
		this.cursorDoc = points[points.length - 1];
		if (!this.lastPaint || !this.strokeBefore) {
			const p = points[points.length - 1];
			this.pointerMove(p.x, p.y);
			return;
		}
		let prev = this.lastPaint;
		for (const p of points) {
			this.paintAt(prev.x, prev.y, p.x, p.y, true);
			prev = p;
		}
		this.lastPaint = prev;
	}

	pointerUp() {
		if (!this.doc) return;
		this.rotateDrag = null;
		if (this.rulerDrag) {
			this.rulerMeasure = { ...this.rulerDrag };
			this.rulerDrag = null;
			this.markDirty();
		}
		if (this.tool === 'crop' && this.selectionDrag) {
			this.applyCrop(this.selectionDrag);
			this.selectionDrag = null;
			this.markDirty();
			return;
		}
		if (this.selectionDrag) {
			this.commitSelection(this.selectionDrag);
			this.selectionDrag = null;
			this.markDirty();
		}
		if (this.shapeDrag) {
			this.commitShape(this.shapeDrag);
			this.shapeDrag = null;
			this.markDirty();
		}
		if (this.gradientDrag) {
			this.commitGradient(this.gradientDrag);
			this.gradientDrag = null;
			this.markDirty();
		}
		if (this.tool === 'lasso' && this.lassoPoints.length > 2) {
			this.commitLasso();
			this.lassoPoints = [];
			this.markDirty();
		}
		if (this.strokeBefore) {
			const layer = getActiveLayer(this.doc);
			if (layer) {
				const before = this.strokeBefore;
				if (this.paintOnMask && layer.mask) {
					const after = new Uint8ClampedArray(layer.mask.data);
					this.history.execute(this.doc, {
						name: 'Paint Mask',
						do: (d) => {
							const l = getLayer(d, layer.id);
							if (l?.mask) l.mask.data = new Uint8ClampedArray(after);
						},
						undo: (d) => {
							const l = getLayer(d, layer.id);
							if (l?.mask) l.mask.data = new Uint8ClampedArray(before);
						},
						memoryBytes: before.byteLength + after.byteLength
					});
				} else if (layer.pixels) {
					const after = new Uint8ClampedArray(layer.pixels);
					this.history.execute(
						this.doc,
						makeStrokeCommand(layer.id, before, () => after)
					);
				}
			}
			this.strokeBefore = null;
			this.lastPaint = null;
			this.endPaintSession();
		}
		this.panning = null;
	}

	private paintAt(x0: number, y0: number, x1: number, y1: number, continuing = false) {
		if (!this.doc) return;
		const layer = getActiveLayer(this.doc);
		if (!layer) return;
		const skipFirst = continuing || this.strokeContinuing;
		this.strokeContinuing = true;

		if (this.paintOnMask) {
			ensureLayerMask(this.doc, layer, true);
			const value = this.tool === 'eraser' ? 0 : 255;
			const dist = Math.hypot(x1 - x0, y1 - y0);
			const step = Math.max(1, this.brush.size * 0.15);
			const n = Math.max(1, Math.ceil(dist / step));
			const start = skipFirst && dist > 0.01 ? 1 : 0;
			for (let i = start; i <= n; i++) {
				const t = i / n;
				stampOnMask(
					layer.mask!.data,
					this.doc.meta.width,
					this.doc.meta.height,
					x0 + (x1 - x0) * t,
					y0 + (y1 - y0) * t,
					this.brush,
					value
				);
			}
			this.markStrokePreview(x1, y1, this.brush.size / 2);
			return;
		}

		if (!layer.pixels) return;

		if (this.tool === 'clone' && this.cloneSource) {
			this.cloneStroke(layer, x0, y0, x1, y1);
			this.markStrokePreview(x1, y1, this.brush.size / 2);
			return;
		}

		if (this.tool === 'spot-heal') {
			this.spotHeal(layer, x1, y1);
			this.markStrokePreview(x1, y1, this.brush.size / 2);
			return;
		}

		if (this.tool === 'dodge' || this.tool === 'burn') {
			this.dodgeBurn(layer, x0, y0, x1, y1, this.tool === 'dodge');
			this.markStrokePreview(x1, y1, this.brush.size / 2);
			return;
		}

		if (this.tool === 'history-brush') {
			this.historyBrushStroke(layer, x0, y0, x1, y1);
			this.markStrokePreview(x1, y1, this.brush.size / 2);
			return;
		}

		const erase = this.tool === 'eraser';
		const color = { r: this.fg.r, g: this.fg.g, b: this.fg.b };
		let brush: BrushSettings =
			this.tool === 'pencil'
				? { ...this.brush, size: Math.max(1, this.brush.size), hardness: 100, wetness: 0, mix: 0 }
				: { ...this.brush };

		if (this.tool === 'mixer-brush') {
			brush = {
				...brush,
				wetness: brush.wetness > 0 ? brush.wetness : 50,
				mix: brush.mix > 0 ? brush.mix : 50
			};
		} else if (this.tool !== 'pattern-stamp') {
			brush = { ...brush, wetness: 0, mix: 0 };
		}

		if (this.tool === 'pattern-stamp' && !brush.pattern) {
			this.ensureDefaultPattern(brush);
			brush = { ...brush, pattern: this.brush.pattern };
		}

		drawBrushLine(
			layer.pixels,
			layer.width,
			layer.height,
			layer.x,
			layer.y,
			x0,
			y0,
			x1,
			y1,
			color,
			brush,
			erase,
			skipFirst
		);
		if (!this.paintUnderlay) {
			this.stampLiveBrush(x0, y0, x1, y1, color, brush, erase, skipFirst);
			const pad = this.brush.size / 2 + Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
			this.strokeDirtyRect = {
				x: Math.floor(Math.min(x0, x1) - pad),
				y: Math.floor(Math.min(y0, y1) - pad),
				w: Math.ceil(Math.abs(x1 - x0) + pad * 2),
				h: Math.ceil(Math.abs(y1 - y0) + pad * 2)
			};
			this.strokeTick++;
		} else {
			this.markStrokePreview(
				(x0 + x1) / 2,
				(y0 + y1) / 2,
				this.brush.size / 2 + Math.hypot(x1 - x0, y1 - y0) / 2
			);
		}
	}

	private historyBrushStroke(
		layer: NonNullable<ReturnType<typeof getActiveLayer>>,
		x0: number,
		y0: number,
		x1: number,
		y1: number
	) {
		if (!layer.pixels || !this.historyBrushSnapshot) {
			this.status = 'Capture a History snapshot first (Color panel)';
			return;
		}
		if (this.historyBrushSnapshot.layerId !== layer.id) {
			this.status = 'History snapshot is for another layer';
			return;
		}
		const snap = this.historyBrushSnapshot.pixels;
		if (snap.length !== layer.pixels.length) {
			this.status = 'History snapshot size mismatch — capture again';
			return;
		}
		const dist = Math.hypot(x1 - x0, y1 - y0);
		const step = Math.max(1, this.brush.size * (this.brush.spacing / 100));
		const n = Math.max(1, Math.ceil(dist / step));
		for (let i = 0; i <= n; i++) {
			const t = i / n;
			historyStamp(
				layer.pixels,
				snap,
				layer.width,
				layer.height,
				layer.x,
				layer.y,
				x0 + (x1 - x0) * t,
				y0 + (y1 - y0) * t,
				this.brush
			);
		}
	}

	private ensureDefaultPattern(brush: BrushSettings) {
		if (brush.pattern) return;
		const size = 32;
		const data = new Uint8ClampedArray(size * size * 4);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const i = (y * size + x) * 4;
				const on = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
				data[i] = on ? this.fg.r : this.bg.r;
				data[i + 1] = on ? this.fg.g : this.bg.g;
				data[i + 2] = on ? this.fg.b : this.bg.b;
				data[i + 3] = 255;
			}
		}
		this.brush = { ...this.brush, pattern: { w: size, h: size, data } };
	}

	private cloneStroke(layer: NonNullable<ReturnType<typeof getActiveLayer>>, x0: number, y0: number, x1: number, y1: number) {
		if (!this.cloneSource || !layer.pixels) return;
		const ox = this.cloneSource.x - x0;
		const oy = this.cloneSource.y - y0;
		const dist = Math.hypot(x1 - x0, y1 - y0);
		const step = Math.max(1, this.brush.size * 0.2);
		const n = Math.max(1, Math.ceil(dist / step));
		const px = layer.pixels;
		for (let i = 0; i <= n; i++) {
			const t = i / n;
			const dx = x0 + (x1 - x0) * t;
			const dy = y0 + (y1 - y0) * t;
			const sx = dx + ox;
			const sy = dy + oy;
			const radius = this.brush.size / 2;
			for (let yy = -radius; yy <= radius; yy++) {
				for (let xx = -radius; xx <= radius; xx++) {
					if (xx * xx + yy * yy > radius * radius) continue;
					const lx = Math.floor(dx - layer.x + xx);
					const ly = Math.floor(dy - layer.y + yy);
					const slx = Math.floor(sx - layer.x + xx);
					const sly = Math.floor(sy - layer.y + yy);
					if (lx < 0 || ly < 0 || lx >= layer.width || ly >= layer.height) continue;
					if (slx < 0 || sly < 0 || slx >= layer.width || sly >= layer.height) continue;
					const di = (ly * layer.width + lx) * 4;
					const si = (sly * layer.width + slx) * 4;
					px[di] = px[si];
					px[di + 1] = px[si + 1];
					px[di + 2] = px[si + 2];
					px[di + 3] = px[si + 3];
				}
			}
		}
	}

	private spotHeal(layer: NonNullable<ReturnType<typeof getActiveLayer>>, x: number, y: number) {
		if (!layer.pixels) return;
		const r = Math.max(2, this.brush.size / 2);
		const samples: number[] = [];
		for (const [ox, oy] of [
			[r * 2, 0],
			[-r * 2, 0],
			[0, r * 2],
			[0, -r * 2]
		]) {
			const sx = Math.floor(x - layer.x + ox);
			const sy = Math.floor(y - layer.y + oy);
			if (sx < 0 || sy < 0 || sx >= layer.width || sy >= layer.height) continue;
			const i = (sy * layer.width + sx) * 4;
			samples.push(layer.pixels[i], layer.pixels[i + 1], layer.pixels[i + 2], layer.pixels[i + 3]);
		}
		if (!samples.length) return;
		const n = samples.length / 4;
		const avg = [0, 0, 0, 0];
		for (let i = 0; i < samples.length; i++) avg[i % 4] += samples[i];
		for (let i = 0; i < 4; i++) avg[i] /= n;
		for (let yy = -r; yy <= r; yy++) {
			for (let xx = -r; xx <= r; xx++) {
				if (xx * xx + yy * yy > r * r) continue;
				const lx = Math.floor(x - layer.x + xx);
				const ly = Math.floor(y - layer.y + yy);
				if (lx < 0 || ly < 0 || lx >= layer.width || ly >= layer.height) continue;
				const i = (ly * layer.width + lx) * 4;
				const w = 1 - Math.sqrt(xx * xx + yy * yy) / r;
				layer.pixels[i] = layer.pixels[i] * (1 - w) + avg[0] * w;
				layer.pixels[i + 1] = layer.pixels[i + 1] * (1 - w) + avg[1] * w;
				layer.pixels[i + 2] = layer.pixels[i + 2] * (1 - w) + avg[2] * w;
			}
		}
	}

	private dodgeBurn(
		layer: NonNullable<ReturnType<typeof getActiveLayer>>,
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		dodge: boolean
	) {
		if (!layer.pixels) return;
		const amount = dodge ? 1.05 : 0.95;
		const dist = Math.hypot(x1 - x0, y1 - y0);
		const step = Math.max(1, this.brush.size * 0.25);
		const n = Math.max(1, Math.ceil(dist / step));
		const r = this.brush.size / 2;
		for (let i = 0; i <= n; i++) {
			const t = i / n;
			const cx = x0 + (x1 - x0) * t - layer.x;
			const cy = y0 + (y1 - y0) * t - layer.y;
			for (let yy = -r; yy <= r; yy++) {
				for (let xx = -r; xx <= r; xx++) {
					if (xx * xx + yy * yy > r * r) continue;
					const lx = Math.floor(cx + xx);
					const ly = Math.floor(cy + yy);
					if (lx < 0 || ly < 0 || lx >= layer.width || ly >= layer.height) continue;
					const idx = (ly * layer.width + lx) * 4;
					layer.pixels[idx] = Math.min(255, layer.pixels[idx] * amount);
					layer.pixels[idx + 1] = Math.min(255, layer.pixels[idx + 1] * amount);
					layer.pixels[idx + 2] = Math.min(255, layer.pixels[idx + 2] * amount);
				}
			}
		}
	}

	private floodFill(docX: number, docY: number) {
		if (!this.doc) return;
		const layer = getActiveLayer(this.doc);
		if (!layer?.pixels) return;
		const lx = docX - layer.x;
		const ly = docY - layer.y;
		if (lx < 0 || ly < 0 || lx >= layer.width || ly >= layer.height) return;
		const before = new Uint8ClampedArray(layer.pixels);
		const px = layer.pixels;
		const w = layer.width;
		const h = layer.height;
		const start = (ly * w + lx) * 4;
		const tr = px[start];
		const tg = px[start + 1];
		const tb = px[start + 2];
		const ta = px[start + 3];
		const tol = 32;
		const stack = [[lx, ly]];
		const seen = new Uint8Array(w * h);
		while (stack.length) {
			const [x, y] = stack.pop()!;
			if (x < 0 || y < 0 || x >= w || y >= h) continue;
			const si = y * w + x;
			if (seen[si]) continue;
			seen[si] = 1;
			const i = si * 4;
			if (
				Math.abs(px[i] - tr) > tol ||
				Math.abs(px[i + 1] - tg) > tol ||
				Math.abs(px[i + 2] - tb) > tol ||
				Math.abs(px[i + 3] - ta) > tol
			)
				continue;
			px[i] = this.fg.r;
			px[i + 1] = this.fg.g;
			px[i + 2] = this.fg.b;
			px[i + 3] = 255;
			stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
		}
		const after = new Uint8ClampedArray(px);
		this.history.execute(this.doc, makeStrokeCommand(layer.id, before, () => after));
		this.markDirty();
	}

	private commitSelection(drag: { x0: number; y0: number; x1: number; y1: number }) {
		if (!this.doc) return;
		const x = Math.max(0, Math.floor(Math.min(drag.x0, drag.x1)));
		const y = Math.max(0, Math.floor(Math.min(drag.y0, drag.y1)));
		const x2 = Math.min(this.doc.meta.width, Math.ceil(Math.max(drag.x0, drag.x1)));
		const y2 = Math.min(this.doc.meta.height, Math.ceil(Math.max(drag.y0, drag.y1)));
		const mask = new Uint8ClampedArray(this.doc.meta.width * this.doc.meta.height);
		const ellipse = this.tool === 'marquee-ellipse';
		const cx = (x + x2) / 2;
		const cy = (y + y2) / 2;
		const rx = (x2 - x) / 2;
		const ry = (y2 - y) / 2;
		for (let yy = y; yy < y2; yy++) {
			for (let xx = x; xx < x2; xx++) {
				if (ellipse) {
					const nx = rx ? (xx + 0.5 - cx) / rx : 0;
					const ny = ry ? (yy + 0.5 - cy) / ry : 0;
					if (nx * nx + ny * ny > 1) continue;
				}
				mask[yy * this.doc.meta.width + xx] = 255;
			}
		}
		this.doc.selection.mask = mask;
		this.status = `Selection ${x2 - x}×${y2 - y}`;
	}

	getSelectionPreview() {
		return this.selectionDrag ?? this.shapeDrag ?? this.gradientDrag;
	}

	getLassoPreview() {
		return this.lassoPoints;
	}

	deselect() {
		if (!this.doc) return;
		this.doc.selection.mask = null;
		this.markDirty();
	}

	invertSelection() {
		if (!this.doc?.selection.mask) return;
		const m = this.doc.selection.mask;
		for (let i = 0; i < m.length; i++) m[i] = 255 - m[i];
		this.markDirty();
	}

	/* —— Phase 2 —— */
	ensureEffects() {
		const layer = this.doc ? getActiveLayer(this.doc) : null;
		if (!layer) return null;
		if (!layer.effects) layer.effects = defaultEffects();
		return layer;
	}

	setEffectEnabled(key: keyof LayerEffects, enabled: boolean) {
		const layer = this.ensureEffects();
		if (!layer?.effects?.[key]) return;
		(layer.effects[key] as { enabled: boolean }).enabled = enabled;
		this.markDirty();
		this.status = `Layer style: ${key}`;
	}

	updateEffect<K extends keyof LayerEffects>(key: K, patch: Partial<NonNullable<LayerEffects[K]>>) {
		const layer = this.ensureEffects();
		if (!layer?.effects?.[key]) return;
		Object.assign(layer.effects[key]!, patch);
		this.markDirty();
	}

	addSolidFill(color?: string) {
		if (!this.doc) return;
		const hex = color ?? this.rgbaToHex(this.fg);
		const layer = createFillLayer('Color Fill', hex, this.doc);
		this.history.execute(this.doc, addLayerCommand(layer));
		this.markDirty();
	}

	placeText(x: number, y: number) {
		if (!this.doc) return;
		const layer = createTextLayer(this.textDraft, x, y, {
			fontSize: this.textSize,
			color: this.rgbaToHex(this.fg)
		});
		this.history.execute(this.doc, addLayerCommand(layer));
		this.markDirty();
		this.status = 'Text layer added';
	}

	addPenPoint(x: number, y: number) {
		if (!this.doc) return;
		if (!this.doc.paths) this.doc.paths = [];
		let path = this.doc.paths.find((p) => p.id === this.doc!.activePathId);
		if (!path) {
			path = createPath(`Path ${(this.doc.paths.length || 0) + 1}`);
			this.doc.paths.push(path);
			this.doc.activePathId = path.id;
		}
		path.points.push({ x, y, kind: 'corner' });
		this.markDirty();
		this.status = `Path point ${path.points.length}`;
	}

	closePath() {
		if (!this.doc?.activePathId || !this.doc.paths) return;
		const path = this.doc.paths.find((p) => p.id === this.doc!.activePathId);
		if (!path || path.points.length < 3) return;
		path.closed = true;
		this.markDirty();
	}

	pathToSelection() {
		if (!this.doc?.activePathId || !this.doc.paths) return;
		const path = this.doc.paths.find((p) => p.id === this.doc!.activePathId);
		if (!path) return;
		this.doc.selection.mask = pathToMask(
			path,
			this.doc.meta.width,
			this.doc.meta.height,
			!path.closed,
			2
		);
		this.markDirty();
		this.status = 'Path → selection';
	}

	private commitShape(drag: { x0: number; y0: number; x1: number; y1: number }) {
		if (!this.doc) return;
		const x = Math.min(drag.x0, drag.x1);
		const y = Math.min(drag.y0, drag.y1);
		const w = Math.abs(drag.x1 - drag.x0);
		const h = Math.abs(drag.y1 - drag.y0);
		if (w < 2 || h < 2) return;
		const kind = this.tool === 'shape-ellipse' ? 'ellipse' : 'rect';
		const layer = createShapeLayer(kind, x, y, w, h, this.rgbaToHex(this.fg));
		this.history.execute(this.doc, addLayerCommand(layer));
		this.status = `${kind} created`;
	}

	private commitGradient(drag: { x0: number; y0: number; x1: number; y1: number }) {
		if (!this.doc) return;
		const layer = getActiveLayer(this.doc);
		if (!layer?.pixels) {
			this.addEmptyLayer();
		}
		const target = getActiveLayer(this.doc);
		if (!target?.pixels) return;
		const before = new Uint8ClampedArray(target.pixels);
		const w = target.width;
		const h = target.height;
		const x0 = drag.x0 - target.x;
		const y0 = drag.y0 - target.y;
		const x1 = drag.x1 - target.x;
		const y1 = drag.y1 - target.y;
		const dx = x1 - x0;
		const dy = y1 - y0;
		const len2 = dx * dx + dy * dy || 1;
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
				const i = (y * w + x) * 4;
				target.pixels[i] = this.fg.r + (this.bg.r - this.fg.r) * t;
				target.pixels[i + 1] = this.fg.g + (this.bg.g - this.fg.g) * t;
				target.pixels[i + 2] = this.fg.b + (this.bg.b - this.fg.b) * t;
				target.pixels[i + 3] = 255;
			}
		}
		const after = new Uint8ClampedArray(target.pixels);
		this.history.execute(this.doc, makeStrokeCommand(target.id, before, () => after));
		this.status = 'Gradient applied';
	}

	private commitLasso() {
		if (!this.doc || this.lassoPoints.length < 3) return;
		const path = {
			id: 'lasso',
			name: 'Lasso',
			closed: true,
			points: this.lassoPoints.map((p) => ({ ...p, kind: 'corner' as const }))
		};
		this.doc.selection.mask = pathToMask(path, this.doc.meta.width, this.doc.meta.height);
		this.status = 'Lasso selection';
	}

	private magicWandSelect(docX: number, docY: number) {
		if (!this.doc) return;
		const img = this.composed;
		if (!img) return;
		const w = img.width;
		const h = img.height;
		if (docX < 0 || docY < 0 || docX >= w || docY >= h) return;
		const data = img.data;
		const start = (docY * w + docX) * 4;
		const tr = data[start];
		const tg = data[start + 1];
		const tb = data[start + 2];
		const tol = 40;
		const mask = new Uint8ClampedArray(w * h);
		const stack = [[docX, docY]];
		const seen = new Uint8Array(w * h);
		while (stack.length) {
			const [x, y] = stack.pop()!;
			const si = y * w + x;
			if (x < 0 || y < 0 || x >= w || y >= h || seen[si]) continue;
			seen[si] = 1;
			const i = si * 4;
			if (
				Math.abs(data[i] - tr) > tol ||
				Math.abs(data[i + 1] - tg) > tol ||
				Math.abs(data[i + 2] - tb) > tol
			)
				continue;
			mask[si] = 255;
			stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
		}
		this.doc.selection.mask = mask;
		this.markDirty();
		this.status = 'Magic wand selection';
	}

	private applyCrop(drag: { x0: number; y0: number; x1: number; y1: number }) {
		if (!this.doc) return;
		const x = Math.max(0, Math.floor(Math.min(drag.x0, drag.x1)));
		const y = Math.max(0, Math.floor(Math.min(drag.y0, drag.y1)));
		const x2 = Math.min(this.doc.meta.width, Math.ceil(Math.max(drag.x0, drag.x1)));
		const y2 = Math.min(this.doc.meta.height, Math.ceil(Math.max(drag.y0, drag.y1)));
		const nw = x2 - x;
		const nh = y2 - y;
		if (nw < 2 || nh < 2) return;
		const composed = this.composed;
		if (!composed) return;
		const cropped = new Uint8ClampedArray(nw * nh * 4);
		for (let yy = 0; yy < nh; yy++) {
			for (let xx = 0; xx < nw; xx++) {
				const si = ((y + yy) * this.doc.meta.width + (x + xx)) * 4;
				const di = (yy * nw + xx) * 4;
				cropped[di] = composed.data[si];
				cropped[di + 1] = composed.data[si + 1];
				cropped[di + 2] = composed.data[si + 2];
				cropped[di + 3] = composed.data[si + 3];
			}
		}
		const layer = createRasterLayer('Cropped', nw, nh);
		layer.pixels = cropped;
		this.doc.meta.width = nw;
		this.doc.meta.height = nh;
		this.doc.layers = [layer];
		this.doc.layerOrder = [layer.id];
		this.doc.activeLayerId = layer.id;
		this.doc.selection.mask = null;
		this.history.clear();
		this.fitZoom();
		this.status = `Cropped to ${nw}×${nh}`;
	}

	saveSelectionAsChannel(name = 'Alpha 1') {
		if (!this.doc?.selection.mask) return;
		if (!this.doc.channels) this.doc.channels = [];
		this.doc.channels.push({
			id: createId('ch'),
			name,
			data: new Uint8ClampedArray(this.doc.selection.mask)
		});
		this.status = `Saved channel “${name}”`;
		this.markDirty();
	}

	loadChannelAsSelection(id: string) {
		if (!this.doc?.channels) return;
		const ch = this.doc.channels.find((c) => c.id === id);
		if (!ch) return;
		this.doc.selection.mask = new Uint8ClampedArray(ch.data);
		this.markDirty();
	}

	getChannelPreviewData(): ImageData | null {
		const img = this.composed;
		if (!img || this.channelPreview === 'rgb') return img;
		const ch = extractChannel(img, this.channelPreview);
		const data = new Uint8ClampedArray(img.width * img.height * 4);
		for (let i = 0; i < ch.length; i++) {
			const v = ch[i];
			const o = i * 4;
			data[o] = data[o + 1] = data[o + 2] = v;
			data[o + 3] = 255;
		}
		return new ImageData(data, img.width, img.height);
	}

	async openPsd(file: File) {
		this.doc = await importPsdFile(file);
		this.history.clear();
		this.fitZoom();
		this.markDirty();
		this.status = `Imported PSD (${this.doc.layers.length} layers)`;
	}

	applyFilter(id: FilterId) {
		if (!this.doc) return;
		if (id === 'select-subject') {
			this.runSelectSubject();
			return;
		}
		if (id === 'content-aware-fill') {
			this.runContentAwareFill();
			return;
		}
		const layer = getActiveLayer(this.doc);
		if (!layer?.pixels) {
			this.status = 'Select a raster layer';
			return;
		}
		const before = new Uint8ClampedArray(layer.pixels);
		const ok = applyFilterToActiveLayer(this.doc, id);
		if (!ok) {
			this.status = 'Filter failed';
			return;
		}
		const after = new Uint8ClampedArray(layer.pixels);
		this.history.execute(this.doc, makeStrokeCommand(layer.id, before, () => after));
		this.markDirty();
		this.status = `Filter: ${id}`;
	}

	/* —— Phase 3 —— */
	runSelectSubject() {
		const img = this.composed;
		if (!this.doc || !img) return;
		this.doc.selection.mask = selectSubject(img);
		this.markDirty();
		this.status = 'Select Subject (heuristic)';
	}

	runSelectSky() {
		const img = this.composed;
		if (!this.doc || !img) return;
		this.doc.selection.mask = selectSky(img);
		this.markDirty();
		this.status = 'Select Sky';
	}

	runReplaceSky() {
		const img = this.composed;
		if (!this.doc || !img) return;
		const filled = replaceSky(img, {
			r: this.fg.r,
			g: this.fg.g,
			b: this.fg.b
		});
		const layer = createRasterLayer('Sky Replace', img.width, img.height);
		layer.pixels = new Uint8ClampedArray(filled.data);
		this.history.execute(this.doc, addLayerCommand(layer));
		this.markDirty();
		this.status = 'Sky replaced';
	}

	runContentAwareFill() {
		if (!this.doc?.selection.mask) {
			this.status = 'Make a selection first';
			return;
		}
		const layer = getActiveLayer(this.doc);
		if (!layer?.pixels) {
			this.status = 'Select a raster layer';
			return;
		}
		const before = new Uint8ClampedArray(layer.pixels);
		// Build layer-local mask
		const local = new Uint8ClampedArray(layer.width * layer.height);
		for (let y = 0; y < layer.height; y++) {
			for (let x = 0; x < layer.width; x++) {
				const dx = x + layer.x;
				const dy = y + layer.y;
				if (dx < 0 || dy < 0 || dx >= this.doc.meta.width || dy >= this.doc.meta.height) continue;
				local[y * layer.width + x] = this.doc.selection.mask[dy * this.doc.meta.width + dx];
			}
		}
		layer.pixels = contentAwareFill(layer.pixels, layer.width, layer.height, local);
		const after = new Uint8ClampedArray(layer.pixels);
		this.history.execute(this.doc, makeStrokeCommand(layer.id, before, () => after));
		this.markDirty();
		this.status = 'Content-Aware Fill';
	}

	featherSelection(radius = 4) {
		if (!this.doc?.selection.mask) return;
		const w = this.doc.meta.width;
		const h = this.doc.meta.height;
		const src = this.doc.selection.mask;
		const dst = new Uint8ClampedArray(src.length);
		const r = Math.max(1, radius);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				let sum = 0;
				let c = 0;
				for (let yy = -r; yy <= r; yy++) {
					for (let xx = -r; xx <= r; xx++) {
						const nx = Math.min(w - 1, Math.max(0, x + xx));
						const ny = Math.min(h - 1, Math.max(0, y + yy));
						sum += src[ny * w + nx];
						c++;
					}
				}
				dst[y * w + x] = sum / c;
			}
		}
		this.doc.selection.mask = dst;
		this.markDirty();
		this.status = `Feather ${r}px`;
	}

	expandSelection(px = 2) {
		if (!this.doc?.selection.mask) return;
		const w = this.doc.meta.width;
		const h = this.doc.meta.height;
		let cur = this.doc.selection.mask;
		for (let p = 0; p < px; p++) {
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
		this.doc.selection.mask = cur;
		this.markDirty();
	}

	startActionRecording() {
		this.recordingAction = true;
		this.actionBuffer = [];
		this.status = 'Recording action…';
	}

	stopActionRecording(name = 'Action 1') {
		if (!this.doc) return;
		this.recordingAction = false;
		if (!this.doc.actions) this.doc.actions = [];
		this.doc.actions.push({
			id: createId('act'),
			name,
			steps: [...this.actionBuffer]
		});
		this.actionBuffer = [];
		this.status = `Saved action “${name}”`;
	}

	/** Phase 4 helpers */

	captureHistorySnapshot() {
		const layer = this.doc ? getActiveLayer(this.doc) : null;
		if (!layer?.pixels) {
			this.status = 'Select a raster layer to capture History';
			return;
		}
		this.historyBrushSnapshot = {
			layerId: layer.id,
			pixels: new Uint8ClampedArray(layer.pixels)
		};
		this.status = 'History snapshot captured';
	}

	async importAbr(file: File) {
		try {
			const tips = await parseAbrFile(file);
			const presets = tips.map((t) => createPresetFromTip(t, this.brush));
			this.brushPresets = [...this.brushPresets, ...presets];
			if (presets[0]) this.applyBrushPreset(presets[0].id);
			this.status = `Imported ${presets.length} brush tip(s) from ${file.name}`;
		} catch (err) {
			this.status = err instanceof Error ? err.message : 'ABR import failed';
		}
	}

	applyBrushPreset(id: string) {
		const p = this.brushPresets.find((x) => x.id === id);
		if (!p) return;
		this.brush = {
			...p.settings,
			dynamics: { ...p.settings.dynamics },
			tip: p.settings.tip
				? { w: p.settings.tip.w, h: p.settings.tip.h, data: new Uint8ClampedArray(p.settings.tip.data) }
				: undefined,
			pattern: p.settings.pattern
				? {
						w: p.settings.pattern.w,
						h: p.settings.pattern.h,
						data: new Uint8ClampedArray(p.settings.pattern.data)
					}
				: this.brush.pattern
		};
		this.status = `Brush: ${p.name}`;
	}

	setPatternFromDocument() {
		const img = this.doc ? compositeDocument(this.doc) : null;
		if (!img) {
			this.status = 'No document for pattern';
			return;
		}
		const max = 128;
		const scale = Math.min(1, max / Math.max(img.width, img.height));
		const w = Math.max(1, Math.round(img.width * scale));
		const h = Math.max(1, Math.round(img.height * scale));
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		const ctx = c.getContext('2d');
		if (!ctx) return;
		const tmp = document.createElement('canvas');
		tmp.width = img.width;
		tmp.height = img.height;
		tmp.getContext('2d')!.putImageData(img, 0, 0);
		ctx.drawImage(tmp, 0, 0, w, h);
		const data = ctx.getImageData(0, 0, w, h).data;
		this.brush = { ...this.brush, pattern: { w, h, data: new Uint8ClampedArray(data) } };
		this.status = `Pattern ${w}×${h} from document`;
	}

	updateBrushDynamics(partial: Partial<BrushSettings['dynamics']>) {
		this.brush = {
			...this.brush,
			dynamics: { ...this.brush.dynamics, ...partial }
		};
	}

	addArtboard(name?: string) {
		if (!this.doc) return;
		if (!this.doc.artboards) this.doc.artboards = [];
		const n = this.doc.artboards.length + 1;
		const board: Artboard = {
			id: createId('ab'),
			name: name ?? `Artboard ${n}`,
			x: 40 + (n - 1) * 24,
			y: 40 + (n - 1) * 24,
			width: Math.min(800, this.doc.meta.width - 80),
			height: Math.min(600, this.doc.meta.height - 80),
			background: 'transparent'
		};
		this.doc.artboards = [...this.doc.artboards, board];
		this.doc.activeArtboardId = board.id;
		this.markDirty();
		this.status = `Added ${board.name}`;
	}

	removeActiveArtboard() {
		if (!this.doc?.artboards?.length) return;
		const id = this.doc.activeArtboardId ?? this.doc.artboards[this.doc.artboards.length - 1]?.id;
		this.doc.artboards = this.doc.artboards.filter((a) => a.id !== id);
		this.doc.activeArtboardId = this.doc.artboards[0]?.id ?? null;
		this.markDirty();
		this.status = 'Artboard removed';
	}

	resetViewRotation() {
		this.viewRotation = 0;
		this.status = 'View rotation reset';
	}

	toggleSoftProof() {
		this.softProof = !this.softProof;
		this.status = this.softProof ? 'CMYK soft-proof on' : 'Soft-proof off';
		this.markDirty();
	}

	clearCountMarks() {
		this.countMarks = [];
		this.status = 'Count cleared';
		this.markDirty();
	}

	clearRuler() {
		this.rulerMeasure = null;
		this.markDirty();
	}

	/** Open browser print with crop marks / bleed note */
	printDocument() {
		if (!this.doc) return;
		const img = compositeDocument(this.doc);
		const proof = this.softProof ? softProofImageData(img, 1) : img;
		const c = document.createElement('canvas');
		const bleedPx = Math.round((this.printBleedMm / 25.4) * (this.doc.meta.dpi || 72));
		const mark = this.printCropMarks ? 24 : 0;
		c.width = proof.width + bleedPx * 2 + mark * 2;
		c.height = proof.height + bleedPx * 2 + mark * 2;
		const ctx = c.getContext('2d');
		if (!ctx) return;
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, c.width, c.height);
		const ox = mark + bleedPx;
		const oy = mark + bleedPx;
		ctx.putImageData(proof, ox, oy);
		if (this.printCropMarks) {
			ctx.strokeStyle = '#000';
			ctx.lineWidth = 1;
			const edges = [
				[ox, oy, ox - mark, oy],
				[ox, oy, ox, oy - mark],
				[ox + proof.width, oy, ox + proof.width + mark, oy],
				[ox + proof.width, oy, ox + proof.width, oy - mark],
				[ox, oy + proof.height, ox - mark, oy + proof.height],
				[ox, oy + proof.height, ox, oy + proof.height + mark],
				[ox + proof.width, oy + proof.height, ox + proof.width + mark, oy + proof.height],
				[ox + proof.width, oy + proof.height, ox + proof.width, oy + proof.height + mark]
			];
			for (const [x0, y0, x1, y1] of edges) {
				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
				ctx.stroke();
			}
		}
		if (this.printColorBars) {
			const barH = 12;
			const colors = ['#00ffff', '#ff00ff', '#ffff00', '#000', '#fff', '#f00', '#0f0', '#00f'];
			const bw = proof.width / colors.length;
			colors.forEach((col, i) => {
				ctx.fillStyle = col;
				ctx.fillRect(ox + i * bw, oy + proof.height + 4, bw, barH);
			});
		}
		const url = c.toDataURL('image/png');
		const w = window.open('', '_blank');
		if (!w) {
			this.status = 'Popup blocked — allow popups to print';
			return;
		}
		w.document.write(
			`<html><head><title>Print ${this.doc.meta.name}</title><style>@page{margin:0}body{margin:0;display:flex;justify-content:center;background:#ccc}img{max-width:100%}</style></head><body><img src="${url}" onload="window.print()"/></body></html>`
		);
		w.document.close();
		this.status = `Print · bleed ${this.printBleedMm}mm`;
	}

	private rgbaToHex(c: RGBA) {
		const h = (n: number) => n.toString(16).padStart(2, '0');
		return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
	}
}

type LayerBlend = import('../types').BlendMode;

export function createEditorState() {
	return new EditorState();
}

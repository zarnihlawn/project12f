import { RetouchHistory } from './history';
import { exportRetouchImage, loadRetouchFile } from './io';
import {
	crop,
	cropEllipse,
	cropPolygon,
	dist2,
	fitWithin,
	flipHorizontal,
	flipVertical,
	normalizeCrop,
	resize,
	rotate180,
	rotate90CCW,
	rotate90CW
} from './ops';
import { applyAdjustments, applyRetouchFilter } from './filters';
import type {
	CropAspect,
	CropMode,
	CropPoint,
	CropRect,
	ExportFormat,
	RetouchFilterId,
	RetouchImage,
	RetouchPanel,
	RetouchTool
} from './types';
import { cloneImage, PEN_CLOSE_THRESHOLD } from './types';

export class RetouchState {
	image: RetouchImage | null = $state(null);
	history = new RetouchHistory();
	tool: RetouchTool = $state('pan');
	panel: RetouchPanel = $state('size');
	zoom = $state(1);
	panX = $state(0);
	panY = $state(0);
	spaceDown = $state(false);
	status = $state('Open an image to start');
	dirty = $state(0);

	cropAspect: CropAspect = $state('free');
	cropMode: CropMode = $state('rect');
	cropRect: CropRect | null = $state(null);
	/** Pen / polygon crop vertices (document space) */
	penPoints: CropPoint[] = $state([]);
	penClosed = $state(false);

	lockAspect = $state(true);
	resizeW = $state(0);
	resizeH = $state(0);

	brightness = $state(0);
	contrast = $state(0);
	saturation = $state(0);

	exportFormat: ExportFormat = $state('png');
	exportQuality = $state(92);

	markDirty() {
		this.dirty++;
	}

	get canUndo() {
		void this.dirty;
		return this.history.canUndo;
	}

	get canRedo() {
		void this.dirty;
		return this.history.canRedo;
	}

	private commit(next: RetouchImage, label: string) {
		if (!this.image) return;
		this.history.push(this.image);
		this.image = next;
		this.syncResizeFields();
		this.resetCropToFull();
		this.status = label;
		this.markDirty();
	}

	private syncResizeFields() {
		if (!this.image) return;
		this.resizeW = this.image.width;
		this.resizeH = this.image.height;
	}

	resetCropToFull() {
		if (!this.image) {
			this.cropRect = null;
			this.penPoints = [];
			this.penClosed = false;
			return;
		}
		const w = Math.round(this.image.width * 0.8);
		const h = Math.round(this.image.height * 0.8);
		this.cropRect = {
			x: Math.round((this.image.width - w) / 2),
			y: Math.round((this.image.height - h) / 2),
			w,
			h
		};
		this.penPoints = [];
		this.penClosed = false;
		if (this.cropMode === 'rect' || this.cropMode === 'ellipse') {
			this.applyCropAspect();
		}
	}

	setCropMode(mode: CropMode) {
		this.cropMode = mode;
		this.tool = 'crop';
		this.panel = 'crop';
		if (mode === 'pen') {
			this.penPoints = [];
			this.penClosed = false;
			this.status = 'Pen crop: click points, click near start to close';
		} else {
			this.resetCropToFull();
			this.status = mode === 'ellipse' ? 'Ellipse crop: drag on canvas' : 'Rect crop: drag on canvas';
		}
		this.markDirty();
	}

	applyCropAspect() {
		if (!this.image || !this.cropRect || this.cropAspect === 'free') return;
		if (this.cropMode === 'pen') return;
		const ratios: Record<Exclude<CropAspect, 'free'>, number> = {
			'1:1': 1,
			'4:3': 4 / 3,
			'3:4': 3 / 4,
			'16:9': 16 / 9,
			'9:16': 9 / 16
		};
		const ratio = ratios[this.cropAspect];
		const cx = this.cropRect.x + this.cropRect.w / 2;
		const cy = this.cropRect.y + this.cropRect.h / 2;
		let w = this.cropRect.w;
		let h = w / ratio;
		if (h > this.image.height) {
			h = this.image.height;
			w = h * ratio;
		}
		if (w > this.image.width) {
			w = this.image.width;
			h = w / ratio;
		}
		this.cropRect = normalizeCrop(this.image, {
			x: cx - w / 2,
			y: cy - h / 2,
			w,
			h
		});
		this.markDirty();
	}

	setCropAspect(aspect: CropAspect) {
		this.cropAspect = aspect;
		this.applyCropAspect();
	}

	/** Add a pen vertex; closes path when near the first point (≥3 verts). */
	addPenPoint(x: number, y: number): boolean {
		if (!this.image) return false;
		const pt = {
			x: Math.max(0, Math.min(this.image.width, x)),
			y: Math.max(0, Math.min(this.image.height, y))
		};
		const thresh = Math.max(8, PEN_CLOSE_THRESHOLD / Math.max(this.zoom, 0.25));
		if (this.penPoints.length >= 3 && !this.penClosed) {
			const start = this.penPoints[0];
			if (dist2(pt, start) <= thresh * thresh) {
				this.penClosed = true;
				this.status = 'Path closed — Apply crop when ready';
				this.markDirty();
				return true;
			}
		}
		if (this.penClosed) {
			this.penPoints = [pt];
			this.penClosed = false;
			this.status = 'New pen path started';
		} else {
			this.penPoints = [...this.penPoints, pt];
			this.status =
				this.penPoints.length < 3
					? `Pen: point ${this.penPoints.length} — need ${3 - this.penPoints.length} more`
					: 'Pen: click near start to close, or keep adding points';
		}
		this.markDirty();
		return false;
	}

	clearPenPath() {
		this.penPoints = [];
		this.penClosed = false;
		this.status = 'Pen path cleared';
		this.markDirty();
	}

	closePenPath() {
		if (this.penPoints.length < 3) {
			this.status = 'Need at least 3 points to close';
			return;
		}
		this.penClosed = true;
		this.status = 'Path closed — Apply crop when ready';
		this.markDirty();
	}

	async openFile(file: File) {
		try {
			const img = await loadRetouchFile(file);
			this.image = img;
			this.history.clear();
			this.syncResizeFields();
			this.resetCropToFull();
			this.brightness = 0;
			this.contrast = 0;
			this.saturation = 0;
			this.fitZoom();
			this.status = `Opened ${file.name} (${img.width}×${img.height})`;
			this.markDirty();
		} catch (err) {
			this.status = err instanceof Error ? err.message : 'Open failed';
		}
	}

	fitZoom(viewW = 900, viewH = 600) {
		if (!this.image) return;
		const zx = (viewW - 48) / this.image.width;
		const zy = (viewH - 48) / this.image.height;
		this.zoom = Math.min(Math.max(0.05, Math.min(zx, zy)), 4);
		this.panX = 0;
		this.panY = 0;
	}

	undo() {
		if (!this.image) return;
		const prev = this.history.undo(this.image);
		if (!prev) return;
		this.image = prev;
		this.syncResizeFields();
		this.resetCropToFull();
		this.status = 'Undo';
		this.markDirty();
	}

	redo() {
		if (!this.image) return;
		const next = this.history.redo(this.image);
		if (!next) return;
		this.image = next;
		this.syncResizeFields();
		this.resetCropToFull();
		this.status = 'Redo';
		this.markDirty();
	}

	setResizeWidth(w: number) {
		this.resizeW = Math.max(1, Math.floor(w));
		if (this.lockAspect && this.image) {
			const ratio = this.image.height / this.image.width;
			this.resizeH = Math.max(1, Math.round(this.resizeW * ratio));
		}
	}

	setResizeHeight(h: number) {
		this.resizeH = Math.max(1, Math.floor(h));
		if (this.lockAspect && this.image) {
			const ratio = this.image.width / this.image.height;
			this.resizeW = Math.max(1, Math.round(this.resizeH * ratio));
		}
	}

	applyResize() {
		if (!this.image) return;
		if (this.resizeW === this.image.width && this.resizeH === this.image.height) {
			this.status = 'Already that size';
			return;
		}
		this.commit(resize(this.image, this.resizeW, this.resizeH), `Resized to ${this.resizeW}×${this.resizeH}`);
	}

	fitPreset(max: number) {
		if (!this.image) return;
		this.commit(fitWithin(this.image, max, max), `Fit within ${max}px`);
	}

	scalePercent(pct: number) {
		if (!this.image) return;
		const s = pct / 100;
		const w = Math.max(1, Math.round(this.image.width * s));
		const h = Math.max(1, Math.round(this.image.height * s));
		this.commit(resize(this.image, w, h), `Scaled to ${pct}%`);
	}

	flipH() {
		if (!this.image) return;
		this.commit(flipHorizontal(this.image), 'Flip horizontal');
	}

	flipV() {
		if (!this.image) return;
		this.commit(flipVertical(this.image), 'Flip vertical');
	}

	rotateCW() {
		if (!this.image) return;
		this.commit(rotate90CW(this.image), 'Rotate 90° CW');
	}

	rotateCCW() {
		if (!this.image) return;
		this.commit(rotate90CCW(this.image), 'Rotate 90° CCW');
	}

	rotate180() {
		if (!this.image) return;
		this.commit(rotate180(this.image), 'Rotate 180°');
	}

	applyCrop() {
		if (!this.image) return;
		if (this.cropMode === 'pen') {
			if (!this.penClosed || this.penPoints.length < 3) {
				this.status = 'Close the pen path first (click near the start point)';
				return;
			}
			try {
				const next = cropPolygon(this.image, this.penPoints);
				this.commit(next, `Polygon crop ${next.width}×${next.height}`);
			} catch (err) {
				this.status = err instanceof Error ? err.message : 'Crop failed';
			}
			return;
		}
		if (!this.cropRect) return;
		const rect = normalizeCrop(this.image, this.cropRect);
		if (this.cropMode === 'ellipse') {
			this.commit(cropEllipse(this.image, rect), `Ellipse crop ${Math.round(rect.w)}×${Math.round(rect.h)}`);
			return;
		}
		this.commit(crop(this.image, rect), `Cropped ${rect.w}×${rect.h}`);
	}

	applyFilter(id: RetouchFilterId) {
		if (!this.image) return;
		this.commit(applyRetouchFilter(this.image, id), `Filter: ${id}`);
	}

	applyCurrentAdjustments() {
		if (!this.image) return;
		if (this.brightness === 0 && this.contrast === 0 && this.saturation === 0) {
			this.status = 'No adjustment changes';
			return;
		}
		this.commit(
			applyAdjustments(this.image, this.brightness, this.contrast, this.saturation),
			'Applied adjustments'
		);
		this.brightness = 0;
		this.contrast = 0;
		this.saturation = 0;
	}

	async export() {
		if (!this.image) {
			this.status = 'Nothing to export';
			return;
		}
		try {
			await exportRetouchImage(this.image, this.exportFormat, this.exportQuality / 100);
			this.status = `Exported ${this.exportFormat.toUpperCase()}`;
		} catch (err) {
			this.status = err instanceof Error ? err.message : 'Export failed';
		}
	}

	/** Preview image with live adjust sliders (does not commit). */
	get previewImage(): RetouchImage | null {
		void this.dirty;
		if (!this.image) return null;
		if (this.brightness === 0 && this.contrast === 0 && this.saturation === 0) {
			return this.image;
		}
		return applyAdjustments(
			cloneImage(this.image),
			this.brightness,
			this.contrast,
			this.saturation
		);
	}
}

export function createRetouchState() {
	return new RetouchState();
}

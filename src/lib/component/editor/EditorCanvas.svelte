<script lang="ts">
	import type { EditorState } from '$lib/editor/state/EditorState.svelte';
	import { GpuDisplay } from '$lib/editor/render/gpu-display';
	import { onDestroy } from 'svelte';

	let { editor }: { editor: EditorState } = $props();

	let viewportEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();
	let overlayEl: HTMLCanvasElement | undefined = $state();
	let antsOffset = $state(0);
	let lastScreen = $state<{ x: number; y: number } | null>(null);
	let gpu: GpuDisplay | null = null;
	let ctx2d: CanvasRenderingContext2D | null = null;
	let useGpu = false;
	let rafPending = 0;
	let needsFullUpload = true;
	let lastUploadTick = -1;
	let lastDirtyKey = -1;
	let selectionEdgeCache: ImageData | null = null;
	let selectionCacheKey = '';

	onDestroy(() => {
		if (rafPending) cancelAnimationFrame(rafPending);
		gpu?.destroy();
	});

	function origin() {
		if (!viewportEl || !editor.doc) return { ox: 0, oy: 0 };
		const vw = viewportEl.clientWidth;
		const vh = viewportEl.clientHeight;
		const dw = editor.doc.meta.width * editor.zoom;
		const dh = editor.doc.meta.height * editor.zoom;
		return {
			ox: (vw - dw) / 2 + editor.panX,
			oy: (vh - dh) / 2 + editor.panY
		};
	}

	function screenToDoc(clientX: number, clientY: number) {
		if (!viewportEl || !editor.doc) return { x: 0, y: 0 };
		const rect = viewportEl.getBoundingClientRect();
		const { ox, oy } = origin();
		const z = editor.zoom;
		const dw = editor.doc.meta.width * z;
		const dh = editor.doc.meta.height * z;
		let sx = clientX - rect.left - ox;
		let sy = clientY - rect.top - oy;
		const rot = editor.viewRotation;
		if (rot) {
			const cx = dw / 2;
			const cy = dh / 2;
			const rad = (-rot * Math.PI) / 180;
			const dx = sx - cx;
			const dy = sy - cy;
			sx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
			sy = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
		}
		return { x: sx / z, y: sy / z };
	}

	function ensureRenderer() {
		if (!canvasEl) return;
		if (!gpu) {
			gpu = new GpuDisplay(canvasEl);
			useGpu = gpu.ok;
			if (!useGpu) {
				ctx2d = canvasEl.getContext('2d', { alpha: true });
			}
		}
	}

	function schedulePaint() {
		if (rafPending) return;
		rafPending = requestAnimationFrame(() => {
			rafPending = 0;
			paintComposed();
			if (!editor.painting) paintOverlay();
		});
	}

	function paintComposed() {
		if (!canvasEl || !editor.doc) return;
		ensureRenderer();
		const img = editor.composed;
		if (!img) return;
		const w = editor.doc.meta.width;
		const h = editor.doc.meta.height;

		if (useGpu && gpu) {
			gpu.ensureSize(w, h);
			const rect = editor.strokeDirtyRect;
			const tick = editor.strokeTick;
			const dirty = editor.dirty;
			if (needsFullUpload || dirty !== lastDirtyKey || !editor.painting) {
				gpu.uploadFull(img);
				needsFullUpload = false;
				lastDirtyKey = dirty;
				lastUploadTick = tick;
			} else if (editor.painting && tick !== lastUploadTick && rect) {
				gpu.uploadRegion(img, rect.x, rect.y, rect.w, rect.h);
				lastUploadTick = tick;
			} else if (editor.painting && tick !== lastUploadTick) {
				gpu.uploadFull(img);
				lastUploadTick = tick;
			}
			gpu.draw();
			return;
		}

		if (!ctx2d) ctx2d = canvasEl.getContext('2d');
		if (!ctx2d) return;
		if (canvasEl.width !== w || canvasEl.height !== h) {
			canvasEl.width = w;
			canvasEl.height = h;
		}
		ctx2d.putImageData(img, 0, 0);
	}

	function getSelectionEdgeImage(
		mask: Uint8ClampedArray,
		mw: number,
		mh: number,
		offset: number
	): ImageData {
		const key = `${mw}x${mh}:${mask.length}:${offset >> 1}`;
		// Rebuild when mask identity changes (use dirty as proxy via length+first/last samples)
		const sample = `${mask[0]}:${mask[mask.length >> 1]}:${mask[mask.length - 1]}:${editor.dirty}`;
		const fullKey = key + sample;
		if (selectionEdgeCache && selectionCacheKey === fullKey) return selectionEdgeCache;

		const data = new Uint8ClampedArray(mw * mh * 4);
		for (let y = 0; y < mh; y++) {
			for (let x = 0; x < mw; x++) {
				const i = y * mw + x;
				if (mask[i] < 128) continue;
				const edge =
					x === 0 ||
					y === 0 ||
					x === mw - 1 ||
					y === mh - 1 ||
					mask[i - 1] < 128 ||
					mask[i + 1] < 128 ||
					mask[i - mw] < 128 ||
					mask[i + mw] < 128;
				if (!edge) continue;
				const on = ((x + y + Math.floor(offset / 2)) & 1) === 0;
				const di = i * 4;
				data[di] = data[di + 1] = data[di + 2] = on ? 0 : 255;
				data[di + 3] = 220;
			}
		}
		selectionEdgeCache =
			typeof ImageData !== 'undefined'
				? new ImageData(data, mw, mh)
				: ({ data, width: mw, height: mh } as ImageData);
		selectionCacheKey = fullKey;
		return selectionEdgeCache;
	}

	function paintOverlay() {
		if (!overlayEl || !viewportEl || !editor.doc) return;
		const vw = viewportEl.clientWidth;
		const vh = viewportEl.clientHeight;
		if (overlayEl.width !== vw || overlayEl.height !== vh) {
			overlayEl.width = vw;
			overlayEl.height = vh;
		}
		const ctx = overlayEl.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, vw, vh);

		const { ox, oy } = origin();
		const z = editor.zoom;
		const dw = editor.doc.meta.width * z;
		const dh = editor.doc.meta.height * z;

		ctx.strokeStyle = 'rgba(255,255,255,0.25)';
		ctx.lineWidth = 1;
		ctx.strokeRect(ox - 0.5, oy - 0.5, dw + 1, dh + 1);

		const preview = editor.getSelectionPreview();
		if (preview) {
			const x = Math.min(preview.x0, preview.x1) * z + ox;
			const y = Math.min(preview.y0, preview.y1) * z + oy;
			const w = Math.abs(preview.x1 - preview.x0) * z;
			const h = Math.abs(preview.y1 - preview.y0) * z;
			drawMarchingAnts(ctx, x, y, w, h, antsOffset, editor.tool === 'marquee-ellipse');
		}

		const mask = editor.doc.selection.mask;
		if (mask && !editor.painting) {
			const edge = getSelectionEdgeImage(mask, editor.doc.meta.width, editor.doc.meta.height, antsOffset);
			const tmp = document.createElement('canvas');
			tmp.width = edge.width;
			tmp.height = edge.height;
			tmp.getContext('2d')!.putImageData(edge, 0, 0);
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(tmp, ox, oy, dw, dh);
		}

		const lasso = editor.getLassoPreview?.() ?? [];
		if (lasso.length > 1) {
			ctx.save();
			ctx.strokeStyle = '#fff';
			ctx.setLineDash([4, 4]);
			ctx.lineDashOffset = -antsOffset;
			ctx.beginPath();
			ctx.moveTo(ox + lasso[0].x * z, oy + lasso[0].y * z);
			for (let i = 1; i < lasso.length; i++) {
				ctx.lineTo(ox + lasso[i].x * z, oy + lasso[i].y * z);
			}
			ctx.stroke();
			ctx.strokeStyle = '#000';
			ctx.lineDashOffset = -antsOffset + 4;
			ctx.stroke();
			ctx.restore();
		}

		const path = editor.doc.paths?.find((p) => p.id === editor.doc?.activePathId);
		if (path && path.points.length) {
			ctx.save();
			ctx.strokeStyle = '#f62440';
			ctx.fillStyle = '#f62440';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(ox + path.points[0].x * z, oy + path.points[0].y * z);
			for (let i = 1; i < path.points.length; i++) {
				ctx.lineTo(ox + path.points[i].x * z, oy + path.points[i].y * z);
			}
			if (path.closed) ctx.closePath();
			ctx.stroke();
			for (const pt of path.points) {
				ctx.fillRect(ox + pt.x * z - 2, oy + pt.y * z - 2, 4, 4);
			}
			ctx.restore();
		}

		const artboards = editor.doc.artboards ?? [];
		for (const ab of artboards) {
			const ax = ox + ab.x * z;
			const ay = oy + ab.y * z;
			ctx.save();
			ctx.strokeStyle = ab.id === editor.doc.activeArtboardId ? '#f62440' : 'rgba(255,255,255,0.45)';
			ctx.lineWidth = 1.5;
			ctx.setLineDash([6, 4]);
			ctx.strokeRect(ax, ay, ab.width * z, ab.height * z);
			ctx.setLineDash([]);
			ctx.fillStyle = 'rgba(246,36,64,0.85)';
			ctx.font = '11px sans-serif';
			ctx.fillText(ab.name, ax + 4, ay - 4);
			ctx.restore();
		}

		const ruler = editor.rulerMeasure;
		if (ruler) {
			ctx.save();
			ctx.strokeStyle = '#0af';
			ctx.fillStyle = '#0af';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(ox + ruler.x0 * z, oy + ruler.y0 * z);
			ctx.lineTo(ox + ruler.x1 * z, oy + ruler.y1 * z);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(ox + ruler.x0 * z, oy + ruler.y0 * z, 3, 0, Math.PI * 2);
			ctx.arc(ox + ruler.x1 * z, oy + ruler.y1 * z, 3, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		for (let i = 0; i < editor.countMarks.length; i++) {
			const m = editor.countMarks[i];
			const mx = ox + m.x * z;
			const my = oy + m.y * z;
			ctx.save();
			ctx.fillStyle = '#f62440';
			ctx.beginPath();
			ctx.arc(mx, my, 5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#fff';
			ctx.font = '9px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String(i + 1), mx, my);
			ctx.restore();
		}
	}

	function drawMarchingAnts(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		offset: number,
		ellipse: boolean
	) {
		ctx.save();
		ctx.setLineDash([4, 4]);
		ctx.lineDashOffset = -offset;
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1;
		if (ellipse) {
			ctx.beginPath();
			ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.lineDashOffset = -offset + 4;
			ctx.strokeStyle = '#fff';
			ctx.stroke();
		} else {
			ctx.strokeRect(x, y, w, h);
			ctx.lineDashOffset = -offset + 4;
			ctx.strokeStyle = '#fff';
			ctx.strokeRect(x, y, w, h);
		}
		ctx.restore();
	}

	$effect(() => {
		void editor.dirty;
		void editor.strokeTick;
		void editor.zoom;
		void editor.panX;
		void editor.panY;
		void editor.viewRotation;
		void editor.rulerMeasure;
		void editor.countMarks;
		void editor.painting;
		if (!editor.painting) needsFullUpload = true;
		schedulePaint();
	});

	$effect(() => {
		const id = setInterval(() => {
			if (editor.painting) return;
			antsOffset = (antsOffset + 1) % 8;
			paintOverlay();
		}, 80);
		return () => clearInterval(id);
	});

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const factor = e.deltaY < 0 ? 1.1 : 0.9;
		editor.zoom = Math.min(32, Math.max(0.05, editor.zoom * factor));
	}

	function onPointerDown(e: PointerEvent) {
		if (!viewportEl) return;
		viewportEl.setPointerCapture(e.pointerId);
		lastScreen = { x: e.clientX, y: e.clientY };
		const { x, y } = screenToDoc(e.clientX, e.clientY);
		editor.pointerDown(x, y, e.buttons, e.shiftKey);
		needsFullUpload = true;
		schedulePaint();
	}

	function onPointerMove(e: PointerEvent) {
		let sdx: number | undefined;
		let sdy: number | undefined;
		if (lastScreen) {
			sdx = e.clientX - lastScreen.x;
			sdy = e.clientY - lastScreen.y;
			lastScreen = { x: e.clientX, y: e.clientY };
		}

		const coalesced =
			typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];

		if (editor.painting) {
			const pts = coalesced.map((ev) => screenToDoc(ev.clientX, ev.clientY));
			if (pts.length > 1) editor.pointerMoveBatch(pts);
			else {
				const { x, y } = pts[0] ?? screenToDoc(e.clientX, e.clientY);
				editor.pointerMove(x, y, sdx, sdy);
			}
		} else {
			const { x, y } = screenToDoc(e.clientX, e.clientY);
			editor.pointerMove(x, y, sdx, sdy);
			paintOverlay();
		}
		schedulePaint();
	}

	function onPointerUp(e: PointerEvent) {
		lastScreen = null;
		try {
			viewportEl?.releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}
		editor.pointerUp();
		needsFullUpload = true;
		schedulePaint();
	}
</script>

<div
	bind:this={viewportEl}
	class="editor-canvas relative h-full w-full overflow-hidden touch-none"
	class:cursor-grab={editor.tool === 'hand' || editor.spaceDown}
	class:cursor-crosshair={editor.tool.startsWith('marquee') || editor.tool === 'eyedropper'}
	onwheel={onWheel}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	role="presentation"
>
	<div
		class="pointer-events-none absolute shadow-lg"
		style="left: {origin().ox}px; top: {origin().oy}px; width: {(editor.doc?.meta.width ?? 0) *
			editor.zoom}px; height: {(editor.doc?.meta.height ?? 0) *
			editor.zoom}px; transform: rotate({editor.viewRotation}deg); transform-origin: center center; will-change: transform;"
	>
		<div class="checker absolute inset-0"></div>
		<canvas
			bind:this={canvasEl}
			class="absolute inset-0 h-full w-full"
			style="image-rendering: pixelated;"
		></canvas>
	</div>
	<canvas bind:this={overlayEl} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
</div>

<style>
	.checker {
		background-color: #2a2a2a;
		background-image:
			linear-gradient(45deg, #3a3a3a 25%, transparent 25%),
			linear-gradient(-45deg, #3a3a3a 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #3a3a3a 75%),
			linear-gradient(-45deg, transparent 75%, #3a3a3a 75%);
		background-size: 16px 16px;
		background-position:
			0 0,
			0 8px,
			8px -8px,
			-8px 0;
	}
</style>

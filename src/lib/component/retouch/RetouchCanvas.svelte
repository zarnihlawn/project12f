<script lang="ts">
	import { normalizeCrop } from '$lib/retouch/ops';
	import type { CropRect } from '$lib/retouch/types';
	import { PEN_CLOSE_THRESHOLD, toImageData } from '$lib/retouch/types';
	import type { RetouchState } from '$lib/retouch/RetouchState.svelte';

	let { retouch }: { retouch: RetouchState } = $props();

	let viewportEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();
	let overlayEl: HTMLCanvasElement | undefined = $state();
	let lastScreen = $state<{ x: number; y: number } | null>(null);
	let cropDrag: null | { mode: 'move' | 'new'; start: CropRect; ox: number; oy: number } = $state(null);
	let hoverDoc = $state<{ x: number; y: number } | null>(null);

	function origin() {
		if (!viewportEl || !retouch.image) return { ox: 0, oy: 0 };
		const vw = viewportEl.clientWidth;
		const vh = viewportEl.clientHeight;
		const dw = retouch.image.width * retouch.zoom;
		const dh = retouch.image.height * retouch.zoom;
		return {
			ox: (vw - dw) / 2 + retouch.panX,
			oy: (vh - dh) / 2 + retouch.panY
		};
	}

	function screenToDoc(clientX: number, clientY: number) {
		if (!viewportEl || !retouch.image) return { x: 0, y: 0 };
		const rect = viewportEl.getBoundingClientRect();
		const { ox, oy } = origin();
		return {
			x: (clientX - rect.left - ox) / retouch.zoom,
			y: (clientY - rect.top - oy) / retouch.zoom
		};
	}

	function paint() {
		if (!canvasEl || !retouch.image) return;
		const preview = retouch.previewImage;
		if (!preview) return;
		const w = preview.width;
		const h = preview.height;
		if (canvasEl.width !== w || canvasEl.height !== h) {
			canvasEl.width = w;
			canvasEl.height = h;
		}
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;
		ctx.putImageData(toImageData(preview), 0, 0);
		paintOverlay();
	}

	function paintOverlay() {
		if (!overlayEl || !viewportEl || !retouch.image) return;
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
		const z = retouch.zoom;
		const dw = retouch.image.width * z;
		const dh = retouch.image.height * z;

		ctx.strokeStyle = 'rgba(255,255,255,0.3)';
		ctx.strokeRect(ox - 0.5, oy - 0.5, dw + 1, dh + 1);

		if (retouch.tool !== 'crop') return;

		if (retouch.cropMode === 'pen') {
			drawPenOverlay(ctx, ox, oy, z, dw, dh);
			return;
		}

		if (!retouch.cropRect) return;
		const r = retouch.cropRect;
		const x = ox + r.x * z;
		const y = oy + r.y * z;
		const w = r.w * z;
		const h = r.h * z;

		ctx.save();
		ctx.fillStyle = 'rgba(0,0,0,0.45)';
		ctx.fillRect(ox, oy, dw, dh);
		ctx.globalCompositeOperation = 'destination-out';
		if (retouch.cropMode === 'ellipse') {
			ctx.beginPath();
			ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.fillRect(x, y, w, h);
		}
		ctx.restore();

		ctx.strokeStyle = '#f62440';
		ctx.lineWidth = 1.5;
		if (retouch.cropMode === 'ellipse') {
			ctx.beginPath();
			ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
			ctx.stroke();
		} else {
			ctx.strokeRect(x, y, w, h);
		}

		const hs = 6;
		for (const [hx, hy] of [
			[x, y],
			[x + w, y],
			[x, y + h],
			[x + w, y + h],
			[x + w / 2, y],
			[x + w / 2, y + h],
			[x, y + h / 2],
			[x + w, y + h / 2]
		]) {
			ctx.fillStyle = '#fff';
			ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
			ctx.strokeStyle = '#f62440';
			ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
		}
	}

	function drawPenOverlay(
		ctx: CanvasRenderingContext2D,
		ox: number,
		oy: number,
		z: number,
		dw: number,
		dh: number
	) {
		const pts = retouch.penPoints;
		if (retouch.penClosed && pts.length >= 3) {
			ctx.save();
			ctx.fillStyle = 'rgba(0,0,0,0.45)';
			ctx.fillRect(ox, oy, dw, dh);
			ctx.globalCompositeOperation = 'destination-out';
			ctx.beginPath();
			ctx.moveTo(ox + pts[0].x * z, oy + pts[0].y * z);
			for (let i = 1; i < pts.length; i++) {
				ctx.lineTo(ox + pts[i].x * z, oy + pts[i].y * z);
			}
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}

		if (pts.length) {
			ctx.strokeStyle = '#f62440';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(ox + pts[0].x * z, oy + pts[0].y * z);
			for (let i = 1; i < pts.length; i++) {
				ctx.lineTo(ox + pts[i].x * z, oy + pts[i].y * z);
			}
			if (retouch.penClosed) ctx.closePath();
			else if (hoverDoc) {
				ctx.lineTo(ox + hoverDoc.x * z, oy + hoverDoc.y * z);
			}
			ctx.stroke();

			const closeR = Math.max(6, (PEN_CLOSE_THRESHOLD / Math.max(retouch.zoom, 0.25)) * z);
			for (let i = 0; i < pts.length; i++) {
				const px = ox + pts[i].x * z;
				const py = oy + pts[i].y * z;
				ctx.beginPath();
				ctx.fillStyle = i === 0 ? '#0af' : '#fff';
				ctx.arc(px, py, i === 0 ? 5 : 3.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#f62440';
				ctx.stroke();
			}
			if (!retouch.penClosed && pts.length >= 3) {
				ctx.beginPath();
				ctx.strokeStyle = 'rgba(0,170,255,0.6)';
				ctx.setLineDash([4, 4]);
				ctx.arc(ox + pts[0].x * z, oy + pts[0].y * z, closeR, 0, Math.PI * 2);
				ctx.stroke();
				ctx.setLineDash([]);
			}
		}
	}

	$effect(() => {
		void retouch.dirty;
		void retouch.zoom;
		void retouch.panX;
		void retouch.panY;
		void retouch.tool;
		void retouch.cropMode;
		void retouch.cropRect;
		void retouch.penPoints;
		void retouch.penClosed;
		void retouch.brightness;
		void retouch.contrast;
		void retouch.saturation;
		void hoverDoc;
		paint();
	});

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const factor = e.deltaY < 0 ? 1.1 : 0.9;
		retouch.zoom = Math.min(8, Math.max(0.05, retouch.zoom * factor));
	}

	function onPointerDown(e: PointerEvent) {
		if (!viewportEl || !retouch.image) return;
		viewportEl.setPointerCapture(e.pointerId);
		lastScreen = { x: e.clientX, y: e.clientY };
		const doc = screenToDoc(e.clientX, e.clientY);

		if (retouch.spaceDown || retouch.tool === 'pan') {
			return;
		}

		if (retouch.tool === 'crop' && retouch.cropMode === 'pen') {
			retouch.addPenPoint(doc.x, doc.y);
			paintOverlay();
			return;
		}

		if (retouch.tool === 'crop') {
			const r = retouch.cropRect;
			if (r && doc.x >= r.x && doc.x <= r.x + r.w && doc.y >= r.y && doc.y <= r.y + r.h) {
				cropDrag = { mode: 'move', start: { ...r }, ox: doc.x, oy: doc.y };
			} else {
				cropDrag = {
					mode: 'new',
					start: { x: doc.x, y: doc.y, w: 1, h: 1 },
					ox: doc.x,
					oy: doc.y
				};
				retouch.cropRect = { x: doc.x, y: doc.y, w: 1, h: 1 };
			}
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!retouch.image) return;
		const doc = screenToDoc(e.clientX, e.clientY);
		hoverDoc = doc;

		if (lastScreen && (retouch.spaceDown || retouch.tool === 'pan') && !cropDrag) {
			retouch.panX += e.clientX - lastScreen.x;
			retouch.panY += e.clientY - lastScreen.y;
			lastScreen = { x: e.clientX, y: e.clientY };
			paintOverlay();
			return;
		}
		lastScreen = { x: e.clientX, y: e.clientY };

		if (retouch.tool === 'crop' && retouch.cropMode === 'pen') {
			paintOverlay();
			return;
		}

		if (cropDrag && retouch.cropRect) {
			if (cropDrag.mode === 'move') {
				const dx = doc.x - cropDrag.ox;
				const dy = doc.y - cropDrag.oy;
				retouch.cropRect = normalizeCrop(retouch.image, {
					x: cropDrag.start.x + dx,
					y: cropDrag.start.y + dy,
					w: cropDrag.start.w,
					h: cropDrag.start.h
				});
			} else {
				retouch.cropRect = normalizeCrop(retouch.image, {
					x: cropDrag.ox,
					y: cropDrag.oy,
					w: doc.x - cropDrag.ox,
					h: doc.y - cropDrag.oy
				});
				if (retouch.cropAspect !== 'free') retouch.applyCropAspect();
			}
			paintOverlay();
		}
	}

	function onPointerUp(e: PointerEvent) {
		lastScreen = null;
		cropDrag = null;
		try {
			viewportEl?.releasePointerCapture(e.pointerId);
		} catch {
			/* */
		}
	}

	function onDblClick(e: MouseEvent) {
		if (retouch.tool !== 'crop' || retouch.cropMode !== 'pen') return;
		e.preventDefault();
		retouch.closePenPath();
	}

	$effect(() => {
		if (!viewportEl || !retouch.image) return;
		const ro = new ResizeObserver(() => {
			retouch.fitZoom(viewportEl!.clientWidth, viewportEl!.clientHeight);
		});
		ro.observe(viewportEl);
		return () => ro.disconnect();
	});
</script>

{#if !retouch.image}
	<div
		class="flex h-full w-full flex-col items-center justify-center gap-3 bg-base-300 px-6 text-center"
		role="presentation"
		ondragover={(e) => {
			e.preventDefault();
		}}
		ondrop={(e) => {
			e.preventDefault();
			const f = e.dataTransfer?.files?.[0];
			if (f) void retouch.openFile(f);
		}}
	>
		<p class="text-lg font-semibold">Drop an image here</p>
		<p class="max-w-md text-sm opacity-60">
			PNG, JPEG, WebP, GIF, BMP, AVIF — whatever your browser can decode. TIFF: convert first.
		</p>
	</div>
{:else}
	<div
		bind:this={viewportEl}
		class="relative h-full w-full overflow-hidden touch-none"
		class:cursor-grab={retouch.tool === 'pan' || retouch.spaceDown}
		class:cursor-crosshair={retouch.tool === 'crop'}
		onwheel={onWheel}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		ondblclick={onDblClick}
		role="presentation"
	>
		<div
			class="pointer-events-none absolute shadow-lg"
			style="left: {origin().ox}px; top: {origin().oy}px; width: {retouch.image.width *
				retouch.zoom}px; height: {retouch.image.height * retouch.zoom}px;"
		>
			<div class="checker absolute inset-0"></div>
			<canvas
				bind:this={canvasEl}
				class="absolute inset-0 h-full w-full"
				style="image-rendering: auto;"
			></canvas>
		</div>
		<canvas bind:this={overlayEl} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
	</div>
{/if}

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

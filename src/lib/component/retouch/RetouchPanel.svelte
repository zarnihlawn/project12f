<script lang="ts">
	import { resolve } from '$app/paths';
	import type { RetouchState } from '$lib/retouch/RetouchState.svelte';
	import { RETOUCH_FILTERS } from '$lib/retouch/filters';
	import type { CropAspect, RetouchPanel } from '$lib/retouch/types';
	import {
		FlipHorizontal2,
		FlipVertical2,
		RotateCcw,
		RotateCw
	} from '@lucide/svelte';

	let { retouch }: { retouch: RetouchState } = $props();

	const tabs: { id: RetouchPanel; label: string }[] = [
		{ id: 'size', label: 'Size' },
		{ id: 'crop', label: 'Crop' },
		{ id: 'adjust', label: 'Adjust' },
		{ id: 'filters', label: 'Filters' },
		{ id: 'export', label: 'Export' }
	];

	const aspects: { id: CropAspect; label: string }[] = [
		{ id: 'free', label: 'Free' },
		{ id: '1:1', label: '1:1' },
		{ id: '4:3', label: '4:3' },
		{ id: '3:4', label: '3:4' },
		{ id: '16:9', label: '16:9' },
		{ id: '9:16', label: '9:16' }
	];
</script>

<aside class="flex w-72 shrink-0 flex-col border-l border-base-300 bg-base-200">
	<div role="tablist" class="tabs tabs-box tabs-xs m-1 flex-wrap">
		{#each tabs as tab}
			<button
				type="button"
				role="tab"
				class="tab {retouch.panel === tab.id ? 'tab-active' : ''}"
				onclick={() => (retouch.panel = tab.id)}>{tab.label}</button
			>
		{/each}
	</div>

	<div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
		{#if !retouch.image}
			<p class="opacity-60">Open an image to edit.</p>
		{:else if retouch.panel === 'size'}
			<p class="font-semibold">Resize</p>
			<label class="flex items-center gap-2">
				<input type="checkbox" class="checkbox checkbox-xs" bind:checked={retouch.lockAspect} />
				Lock aspect ratio
			</label>
			<label class="block space-y-1">
				Width
				<input
					type="number"
					class="input input-bordered input-xs w-full"
					value={retouch.resizeW}
					min="1"
					oninput={(e) => retouch.setResizeWidth(Number((e.currentTarget as HTMLInputElement).value))}
				/>
			</label>
			<label class="block space-y-1">
				Height
				<input
					type="number"
					class="input input-bordered input-xs w-full"
					value={retouch.resizeH}
					min="1"
					oninput={(e) => retouch.setResizeHeight(Number((e.currentTarget as HTMLInputElement).value))}
				/>
			</label>
			<button type="button" class="btn btn-primary btn-xs w-full" onclick={() => retouch.applyResize()}
				>Apply resize</button
			>
			<p class="pt-2 font-semibold">Presets</p>
			<div class="flex flex-wrap gap-1">
				<button type="button" class="btn btn-ghost btn-xs" onclick={() => retouch.fitPreset(1920)}>Fit 1920</button>
				<button type="button" class="btn btn-ghost btn-xs" onclick={() => retouch.fitPreset(1280)}>Fit 1280</button>
				<button type="button" class="btn btn-ghost btn-xs" onclick={() => retouch.fitPreset(800)}>Fit 800</button>
				<button type="button" class="btn btn-ghost btn-xs" onclick={() => retouch.scalePercent(50)}>50%</button>
				<button type="button" class="btn btn-ghost btn-xs" onclick={() => retouch.scalePercent(200)}>200%</button>
			</div>
			<p class="pt-2 font-semibold">Flip / rotate</p>
			<div class="flex flex-wrap gap-1">
				<div class="tooltip" data-tip="Flip horizontal">
					<button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Flip horizontal" onclick={() => retouch.flipH()}>
						<FlipHorizontal2 class="h-3.5 w-3.5" />
					</button>
				</div>
				<div class="tooltip" data-tip="Flip vertical">
					<button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Flip vertical" onclick={() => retouch.flipV()}>
						<FlipVertical2 class="h-3.5 w-3.5" />
					</button>
				</div>
				<div class="tooltip" data-tip="Rotate 90° CCW">
					<button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Rotate CCW" onclick={() => retouch.rotateCCW()}>
						<RotateCcw class="h-3.5 w-3.5" />
					</button>
				</div>
				<div class="tooltip" data-tip="Rotate 90° CW">
					<button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Rotate CW" onclick={() => retouch.rotateCW()}>
						<RotateCw class="h-3.5 w-3.5" />
					</button>
				</div>
				<button type="button" class="btn btn-ghost btn-xs" onclick={() => retouch.rotate180()}>180°</button>
			</div>
		{:else if retouch.panel === 'crop'}
			<p class="font-semibold">Crop</p>
			<p class="font-medium opacity-80">Shape</p>
			<div class="flex flex-wrap gap-1">
				<button
					type="button"
					class="btn btn-xs {retouch.cropMode === 'rect' ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => retouch.setCropMode('rect')}>Rect</button
				>
				<button
					type="button"
					class="btn btn-xs {retouch.cropMode === 'ellipse' ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => retouch.setCropMode('ellipse')}>Ellipse</button
				>
				<button
					type="button"
					class="btn btn-xs {retouch.cropMode === 'pen' ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => retouch.setCropMode('pen')}>Pen</button
				>
			</div>

			{#if retouch.cropMode === 'pen'}
				<p class="opacity-60">
					Click to place points. Click the blue start point (or inside its ring) to close the shape,
					or double-click / use Close path. Outside the polygon becomes transparent.
				</p>
				<p class="tabular-nums opacity-70">
					{retouch.penPoints.length} point{retouch.penPoints.length === 1 ? '' : 's'}
					{#if retouch.penClosed}
						· closed
					{/if}
				</p>
				<button
					type="button"
					class="btn btn-ghost btn-xs w-full"
					onclick={() => retouch.closePenPath()}
					disabled={retouch.penPoints.length < 3}>Close path</button
				>
				<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => retouch.clearPenPath()}
					>Clear points</button
				>
			{:else}
				<p class="opacity-60">
					{#if retouch.cropMode === 'ellipse'}
						Drag an oval on the canvas. Outside the ellipse becomes transparent.
					{:else}
						Drag a rectangle on the canvas.
					{/if}
				</p>
				<p class="font-medium opacity-80">Aspect</p>
				<div class="flex flex-wrap gap-1">
					{#each aspects as a}
						<button
							type="button"
							class="btn btn-xs {retouch.cropAspect === a.id ? 'btn-primary' : 'btn-ghost'}"
							onclick={() => retouch.setCropAspect(a.id)}>{a.label}</button
						>
					{/each}
				</div>
				{#if retouch.cropRect}
					<p class="tabular-nums opacity-70">
						{Math.round(retouch.cropRect.w)}×{Math.round(retouch.cropRect.h)} at ({Math.round(retouch.cropRect.x)}, {Math.round(
							retouch.cropRect.y
						)})
					</p>
				{/if}
				<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => retouch.resetCropToFull()}
					>Reset crop box</button
				>
			{/if}

			<button type="button" class="btn btn-primary btn-xs w-full" onclick={() => retouch.applyCrop()}
				>Apply crop</button
			>
		{:else if retouch.panel === 'adjust'}
			<p class="font-semibold">Adjustments</p>
			<p class="opacity-60">Live preview — click Apply to commit to history.</p>
			<label class="block space-y-1">
				Brightness ({retouch.brightness})
				<input type="range" min="-100" max="100" class="range range-xs" bind:value={retouch.brightness} />
			</label>
			<label class="block space-y-1">
				Contrast ({retouch.contrast})
				<input type="range" min="-100" max="100" class="range range-xs" bind:value={retouch.contrast} />
			</label>
			<label class="block space-y-1">
				Saturation ({retouch.saturation})
				<input type="range" min="-100" max="100" class="range range-xs" bind:value={retouch.saturation} />
			</label>
			<button type="button" class="btn btn-primary btn-xs w-full" onclick={() => retouch.applyCurrentAdjustments()}
				>Apply adjustments</button
			>
			<button
				type="button"
				class="btn btn-ghost btn-xs w-full"
				onclick={() => {
					retouch.brightness = 0;
					retouch.contrast = 0;
					retouch.saturation = 0;
				}}>Reset sliders</button
			>
		{:else if retouch.panel === 'filters'}
			<p class="font-semibold">Filters</p>
			<ul class="space-y-1">
				{#each RETOUCH_FILTERS as f}
					<li>
						<button
							type="button"
							class="btn btn-ghost btn-xs w-full justify-start"
							onclick={() => retouch.applyFilter(f.id)}>{f.label}</button
						>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="font-semibold">Export</p>
			<label class="block space-y-1">
				Format
				<select class="select select-bordered select-xs w-full" bind:value={retouch.exportFormat}>
					<option value="png">PNG</option>
					<option value="jpeg">JPEG</option>
					<option value="webp">WebP</option>
				</select>
			</label>
			{#if retouch.exportFormat !== 'png'}
				<label class="block space-y-1">
					Quality ({retouch.exportQuality}%)
					<input type="range" min="10" max="100" class="range range-xs" bind:value={retouch.exportQuality} />
				</label>
			{/if}
			<button type="button" class="btn btn-primary btn-sm w-full" onclick={() => void retouch.export()}
				>Download</button
			>
			<a
				class="btn btn-ghost btn-xs w-full"
				href={resolve('/(public)/(service)/utilities/image/editor')}
				>Need layers? Open Editor</a
			>
		{/if}
	</div>
</aside>

<script lang="ts">
	import EditorCanvas from '$lib/component/editor/EditorCanvas.svelte';
	import EditorLayersPanel from '$lib/component/editor/EditorLayersPanel.svelte';
	import EditorMenuBar from '$lib/component/editor/EditorMenuBar.svelte';
	import EditorStylesPanel from '$lib/component/editor/EditorStylesPanel.svelte';
	import EditorToolbar from '$lib/component/editor/EditorToolbar.svelte';
	import { FILTER_CATALOG } from '$lib/editor/filters/catalog';
	import { downloadP12F, exportRaster, loadP12F } from '$lib/editor/io/p12f';
	import { ROADMAP } from '$lib/editor/roadmap';
	import { createEditorState } from '$lib/editor/state/EditorState.svelte';
	import { onMount } from 'svelte';

	const editor = createEditorState();

	let rightTab = $state<
		'layers' | 'history' | 'color' | 'styles' | 'channels' | 'intel' | 'filters' | 'brush' | 'print' | 'roadmap'
	>('layers');
	let showNewModal = $state(false);
	let showPrintModal = $state(false);
	let newW = $state(1920);
	let newH = $state(1080);
	let newBg = $state<'white' | 'black' | 'transparent'>('white');
	let fileInput: HTMLInputElement | undefined = $state();
	let abrInput: HTMLInputElement | undefined = $state();

	onMount(() => {
		if (!editor.doc) {
			editor.newDocument(1920, 1080, 'white');
		}
	});

	function openNewModal() {
		newW = editor.doc?.meta.width ?? 1920;
		newH = editor.doc?.meta.height ?? 1080;
		newBg = 'white';
		showNewModal = true;
	}

	function confirmNew() {
		editor.newDocument(Math.max(1, newW), Math.max(1, newH), newBg);
		showNewModal = false;
	}

	function triggerOpen() {
		fileInput?.click();
	}

	async function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			if (file.name.toLowerCase().endsWith('.p12f')) {
				editor.doc = await loadP12F(file);
				editor.history.clear();
				editor.fitZoom();
				editor.markDirty();
				editor.status = `Opened ${file.name}`;
			} else if (file.name.toLowerCase().endsWith('.psd')) {
				await editor.openPsd(file);
			} else {
				await editor.openFile(file);
			}
		} catch (err) {
			editor.status = err instanceof Error ? err.message : 'Open failed';
		}
	}

	async function saveP12f() {
		if (!editor.doc) return;
		await downloadP12F(editor.doc);
		editor.status = 'Saved .p12f';
	}

	async function doExport(format: 'png' | 'jpeg' | 'webp') {
		const img = editor.composed;
		if (!img || !editor.doc) {
			editor.status = 'Nothing to export';
			return;
		}
		await exportRaster(img, format, 0.92, editor.doc.meta.name || 'export');
		editor.status = `Exported ${format.toUpperCase()}`;
	}

	async function onAbrChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		await editor.importAbr(file);
	}

	function dyn(key: keyof typeof editor.brush.dynamics, value: number) {
		editor.updateBrushDynamics({ [key]: value });
	}

	function applyFilter(id: (typeof FILTER_CATALOG)[number]['id'], implemented: boolean, label: string) {
		if (!editor.doc) return;
		if (!implemented) {
			editor.status = `${label} — not implemented yet`;
			return;
		}
		editor.applyFilter(id);
	}

	function onKeyDown(e: KeyboardEvent) {
		const t = e.target as HTMLElement | null;
		if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
			return;
		}

		if (e.code === 'Space' && !e.repeat) {
			e.preventDefault();
			editor.spaceDown = true;
			return;
		}

		const ctrl = e.ctrlKey || e.metaKey;
		if (ctrl && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			if (e.shiftKey) editor.redo();
			else editor.undo();
			return;
		}
		if (ctrl && e.key.toLowerCase() === 's') {
			e.preventDefault();
			void saveP12f();
			return;
		}
		if (ctrl) return;

		switch (e.key.toLowerCase()) {
			case 'b':
				editor.setTool('brush');
				break;
			case 'e':
				editor.setTool('eraser');
				break;
			case 'v':
				editor.setTool('move');
				break;
			case 'm':
				editor.setTool('marquee-rect');
				break;
			case 'i':
				editor.setTool('eyedropper');
				break;
			case 'x':
				editor.swapColors();
				break;
			case 'd':
				editor.resetColors();
				break;
			case '[':
				editor.brush = { ...editor.brush, size: Math.max(1, editor.brush.size - 2) };
				break;
			case ']':
				editor.brush = { ...editor.brush, size: Math.min(500, editor.brush.size + 2) };
				break;
			case 'delete':
			case 'backspace':
				editor.deleteActiveLayer();
				break;
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') editor.spaceDown = false;
	}

	function rgbaCss(c: { r: number; g: number; b: number; a: number }) {
		return `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
	}

	const historyNames = $derived.by(() => {
		void editor.dirty;
		return [...editor.history.undoNames].reverse();
	});

	const phaseBadge = (phase: number) => {
		if (phase === 2) return 'badge-info';
		if (phase === 3) return 'badge-warning';
		return 'badge-accent';
	};
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />

<div class="flex h-full min-h-0 flex-col bg-base-300 text-base-content">
	<EditorMenuBar
		{editor}
		onnew={openNewModal}
		onopen={triggerOpen}
		onsave={() => void saveP12f()}
		onexport={(f) => void doExport(f)}
		onprint={() => (showPrintModal = true)}
	/>

	<div class="flex min-h-0 flex-1">
		<EditorToolbar {editor} />

		<div class="flex min-w-0 flex-1 flex-col">
			<div
				class="flex h-8 shrink-0 items-center gap-3 border-b border-base-300 bg-base-200 px-3 text-xs"
			>
				<span class="font-medium capitalize">{editor.tool.replaceAll('-', ' ')}</span>
				<span class="opacity-50">|</span>
				<span>Size {editor.brush.size}</span>
				<span>Hard {editor.brush.hardness}%</span>
				<span>Opacity {editor.brush.opacity}%</span>
				<span class="opacity-50">|</span>
				<span class="tabular-nums">{Math.round(editor.zoom * 100)}%</span>
				{#if editor.viewRotation}
					<span class="opacity-50">|</span>
					<span class="tabular-nums">{Math.round(editor.viewRotation)}°</span>
				{/if}
				{#if editor.softProof}
					<span class="badge badge-accent badge-xs">CMYK proof</span>
				{/if}
			</div>
			<div class="min-h-0 flex-1 bg-base-300">
				<EditorCanvas {editor} />
			</div>
		</div>

		<aside class="flex w-64 shrink-0 flex-col border-l border-base-300 bg-base-200">
			<div role="tablist" class="tabs tabs-box tabs-xs m-1 flex-wrap">
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'layers' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'layers')}>Layers</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'styles' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'styles')}>Styles</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'channels' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'channels')}>Ch</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'intel' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'intel')}>AI</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'history' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'history')}>Hist</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'color' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'color')}>Color</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'brush' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'brush')}>Brush</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'print' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'print')}>Print</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'filters' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'filters')}>Fx</button
				>
				<button
					type="button"
					role="tab"
					class="tab {rightTab === 'roadmap' ? 'tab-active' : ''}"
					onclick={() => (rightTab = 'roadmap')}>Map</button
				>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto">
				{#if rightTab === 'layers'}
					<EditorLayersPanel {editor} />
					<div class="space-y-1 border-t border-base-300 p-2 text-xs">
						<label class="flex flex-col gap-0.5"
							>Text draft
							<input class="input input-xs input-bordered" bind:value={editor.textDraft} />
						</label>
						<label class="flex flex-col gap-0.5"
							>Size
							<input type="number" class="input input-xs input-bordered" bind:value={editor.textSize} />
						</label>
					</div>
				{:else if rightTab === 'styles'}
					<EditorStylesPanel {editor} />
				{:else if rightTab === 'channels'}
					<div class="space-y-2 p-2 text-xs">
						<p class="font-semibold">Channels</p>
						<div class="flex flex-wrap gap-1">
							{#each ['rgb', 'r', 'g', 'b', 'a', 'luma'] as ch}
								<button
									type="button"
									class="btn btn-xs {editor.channelPreview === ch ? 'btn-primary' : 'btn-ghost'}"
									onclick={() => (editor.channelPreview = ch as typeof editor.channelPreview)}
									>{ch}</button
								>
							{/each}
						</div>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.saveSelectionAsChannel()}
							>Save selection as channel</button
						>
						<ul class="space-y-1">
							{#each editor.doc?.channels ?? [] as ch}
								<li>
									<button
										type="button"
										class="btn btn-ghost btn-xs w-full justify-start"
										onclick={() => editor.loadChannelAsSelection(ch.id)}>{ch.name}</button
									>
								</li>
							{/each}
						</ul>
					</div>
				{:else if rightTab === 'intel'}
					<div class="space-y-2 p-2 text-xs">
						<p class="font-semibold">Intelligence (Phase 3)</p>
						<button type="button" class="btn btn-primary btn-xs w-full" onclick={() => editor.runSelectSubject()}
							>Select Subject</button
						>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.runSelectSky()}
							>Select Sky</button
						>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.runReplaceSky()}
							>Replace Sky (FG color)</button
						>
						<button
							type="button"
							class="btn btn-ghost btn-xs w-full"
							onclick={() => editor.runContentAwareFill()}>Content-Aware Fill</button
						>
						<p class="opacity-60">Heuristic / patch-match — not cloud ML. Selection required for fill.</p>
					</div>
				{:else if rightTab === 'history'}
					<ul class="space-y-0.5 p-2 text-xs">
						{#if historyNames.length === 0}
							<li class="opacity-50">No history yet</li>
						{:else}
							{#each historyNames as name, i}
								<li class="rounded px-2 py-1 {i === 0 ? 'bg-primary/15' : 'hover:bg-base-100'}">
									{name}
								</li>
							{/each}
						{/if}
					</ul>
				{:else if rightTab === 'color'}
					<div class="space-y-3 p-3 text-xs">
						<div class="flex items-end gap-2">
						<div class="tooltip" data-tip="Foreground (X to swap)">
							<button
								type="button"
								class="h-12 w-12 rounded border border-base-300 shadow"
								style="background: {rgbaCss(editor.fg)}"
								aria-label="Foreground color"
								onclick={() => editor.swapColors()}
							></button>
						</div>
						<div class="tooltip" data-tip="Background">
							<button
								type="button"
								class="h-8 w-8 rounded border border-base-300 shadow"
								style="background: {rgbaCss(editor.bg)}"
								aria-label="Background color"
								onclick={() => editor.swapColors()}
							></button>
						</div>
						<div class="tooltip" data-tip="Reset colors (D)">
							<button type="button" class="btn btn-ghost btn-xs" aria-label="Reset colors" onclick={() => editor.resetColors()}
								>D</button
							>
						</div>
						</div>
						<label class="block space-y-1">
							<span class="opacity-70">Size ({editor.brush.size})</span>
							<input
								type="range"
								min="1"
								max="200"
								class="range range-xs"
								value={editor.brush.size}
								oninput={(e) =>
									(editor.brush = {
										...editor.brush,
										size: Number((e.currentTarget as HTMLInputElement).value)
									})}
							/>
						</label>
						<label class="block space-y-1">
							<span class="opacity-70">Hardness ({editor.brush.hardness}%)</span>
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs"
								value={editor.brush.hardness}
								oninput={(e) =>
									(editor.brush = {
										...editor.brush,
										hardness: Number((e.currentTarget as HTMLInputElement).value)
									})}
							/>
						</label>
						<label class="block space-y-1">
							<span class="opacity-70">Opacity ({editor.brush.opacity}%)</span>
							<input
								type="range"
								min="1"
								max="100"
								class="range range-xs"
								value={editor.brush.opacity}
								oninput={(e) =>
									(editor.brush = {
										...editor.brush,
										opacity: Number((e.currentTarget as HTMLInputElement).value)
									})}
							/>
						</label>
						<label class="block space-y-1">
							<span class="opacity-70">Flow ({editor.brush.flow}%)</span>
							<input
								type="range"
								min="1"
								max="100"
								class="range range-xs"
								value={editor.brush.flow}
								oninput={(e) =>
									(editor.brush = {
										...editor.brush,
										flow: Number((e.currentTarget as HTMLInputElement).value)
									})}
							/>
						</label>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.captureHistorySnapshot()}
							>Capture History Snapshot</button
						>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.setPatternFromDocument()}
							>Pattern from Document</button
						>
					</div>
				{:else if rightTab === 'brush'}
					<div class="space-y-2 p-2 text-xs">
						<p class="font-semibold">Brush Dynamics</p>
						<label class="block space-y-1"
							>Size jitter ({editor.brush.dynamics.sizeJitter})
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs"
								value={editor.brush.dynamics.sizeJitter}
								oninput={(e) => dyn('sizeJitter', Number((e.currentTarget as HTMLInputElement).value))}
							/>
						</label>
						<label class="block space-y-1"
							>Opacity jitter ({editor.brush.dynamics.opacityJitter})
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs"
								value={editor.brush.dynamics.opacityJitter}
								oninput={(e) => dyn('opacityJitter', Number((e.currentTarget as HTMLInputElement).value))}
							/>
						</label>
						<label class="block space-y-1"
							>Scatter ({editor.brush.dynamics.scatter})
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs"
								value={editor.brush.dynamics.scatter}
								oninput={(e) => dyn('scatter', Number((e.currentTarget as HTMLInputElement).value))}
							/>
						</label>
						<label class="block space-y-1"
							>Angle jitter ({editor.brush.dynamics.angleJitter})
							<input
								type="range"
								min="0"
								max="180"
								class="range range-xs"
								value={editor.brush.dynamics.angleJitter}
								oninput={(e) => dyn('angleJitter', Number((e.currentTarget as HTMLInputElement).value))}
							/>
						</label>
						<label class="block space-y-1"
							>Count ({editor.brush.dynamics.count})
							<input
								type="range"
								min="1"
								max="8"
								class="range range-xs"
								value={editor.brush.dynamics.count}
								oninput={(e) => dyn('count', Number((e.currentTarget as HTMLInputElement).value))}
							/>
						</label>
						<label class="block space-y-1"
							>Dual strength ({editor.brush.dynamics.dualStrength})
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs"
								value={editor.brush.dynamics.dualStrength}
								oninput={(e) => dyn('dualStrength', Number((e.currentTarget as HTMLInputElement).value))}
							/>
						</label>
						<p class="pt-1 font-semibold">Mixer</p>
						<label class="block space-y-1"
							>Wetness ({editor.brush.wetness})
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs"
								value={editor.brush.wetness}
								oninput={(e) =>
									(editor.brush = {
										...editor.brush,
										wetness: Number((e.currentTarget as HTMLInputElement).value)
									})}
							/>
						</label>
						<label class="block space-y-1"
							>Mix ({editor.brush.mix})
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs"
								value={editor.brush.mix}
								oninput={(e) =>
									(editor.brush = {
										...editor.brush,
										mix: Number((e.currentTarget as HTMLInputElement).value)
									})}
							/>
						</label>
						<p class="pt-1 font-semibold">Presets / ABR</p>
						<button type="button" class="btn btn-primary btn-xs w-full" onclick={() => abrInput?.click()}
							>Import ABR…</button
						>
						<ul class="max-h-32 space-y-0.5 overflow-y-auto">
							{#each editor.brushPresets as p}
								<li>
									<button
										type="button"
										class="btn btn-ghost btn-xs w-full justify-start"
										onclick={() => editor.applyBrushPreset(p.id)}>{p.name}</button
									>
								</li>
							{:else}
								<li class="opacity-50">No imported tips yet</li>
							{/each}
						</ul>
					</div>
				{:else if rightTab === 'print'}
					<div class="space-y-2 p-2 text-xs">
						<p class="font-semibold">Print / CMYK</p>
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								class="checkbox checkbox-xs"
								checked={editor.softProof}
								onchange={() => editor.toggleSoftProof()}
							/>
							Soft-proof (CMYK)
						</label>
						<label class="block space-y-1"
							>Bleed mm ({editor.printBleedMm})
							<input
								type="range"
								min="0"
								max="20"
								class="range range-xs"
								value={editor.printBleedMm}
								oninput={(e) => (editor.printBleedMm = Number((e.currentTarget as HTMLInputElement).value))}
							/>
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" class="checkbox checkbox-xs" bind:checked={editor.printCropMarks} />
							Crop marks
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" class="checkbox checkbox-xs" bind:checked={editor.printColorBars} />
							Color bars
						</label>
						<button type="button" class="btn btn-primary btn-xs w-full" onclick={() => (showPrintModal = true)}
							>Print…</button
						>
						<p class="pt-2 font-semibold">Artboards</p>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.addArtboard()}
							>Add Artboard</button
						>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.removeActiveArtboard()}
							>Remove Active</button
						>
						<ul class="space-y-0.5">
							{#each editor.doc?.artboards ?? [] as ab}
								<li>
									<button
										type="button"
										class="btn btn-ghost btn-xs w-full justify-start {editor.doc?.activeArtboardId === ab.id
											? 'btn-active'
											: ''}"
										onclick={() => {
											if (editor.doc) editor.doc.activeArtboardId = ab.id;
											editor.markDirty();
										}}>{ab.name}</button
									>
								</li>
							{/each}
						</ul>
						<p class="pt-2 font-semibold">Measure</p>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.clearRuler()}
							>Clear Ruler</button
						>
						<button type="button" class="btn btn-ghost btn-xs w-full" onclick={() => editor.clearCountMarks()}
							>Clear Count ({editor.countMarks.length})</button
						>
					</div>
				{:else if rightTab === 'filters'}
					<ul class="space-y-0.5 p-2 text-xs">
						{#each FILTER_CATALOG as f}
							<li>
								<button
									type="button"
									class="btn btn-ghost btn-xs w-full justify-between"
									onclick={() => applyFilter(f.id, f.implemented, f.label)}
								>
									{f.label}
									{#if !f.implemented}
										<span class="badge badge-ghost badge-xs">soon</span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<ul class="space-y-1 p-2 text-xs">
						{#each ROADMAP as item}
							<li class="rounded border border-base-300 bg-base-100 px-2 py-1.5">
								<div class="flex items-start justify-between gap-1">
									<span class="font-medium leading-snug">{item.label}</span>
									<span class="badge badge-xs {phaseBadge(item.phase)}">P{item.phase}</span>
								</div>
								<div class="mt-0.5 flex gap-1 opacity-60">
									<span>{item.category}</span>
									<span>·</span>
									<span>{item.status}</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</aside>
	</div>

	<footer
		class="flex h-6 shrink-0 items-center gap-3 border-t border-base-300 bg-base-200 px-3 text-[11px]"
	>
		<span class="truncate">{editor.status}</span>
		<span class="opacity-40">|</span>
		{#if editor.doc}
			<span class="tabular-nums"
				>{editor.doc.meta.width}×{editor.doc.meta.height}</span
			>
			<span class="opacity-40">|</span>
			<span class="tabular-nums"
				>{Math.round(editor.cursorDoc.x)}, {Math.round(editor.cursorDoc.y)}</span
			>
		{/if}
		<span class="ml-auto tabular-nums">{Math.round(editor.zoom * 100)}%</span>
	</footer>
</div>

<input
	bind:this={fileInput}
	type="file"
	class="hidden"
	accept="image/*,.p12f,.psd,application/json,image/vnd.adobe.photoshop"
	onchange={onFileChange}
/>

<input bind:this={abrInput} type="file" class="hidden" accept=".abr,application/octet-stream" onchange={onAbrChange} />

{#if showPrintModal}
	<dialog class="modal modal-open">
		<div class="modal-box bg-base-100">
			<h3 class="text-lg font-bold">Print</h3>
			<p class="mt-2 text-sm opacity-70">
				Bleed {editor.printBleedMm}mm
				{#if editor.printCropMarks}· crop marks{/if}
				{#if editor.printColorBars}· color bars{/if}
				{#if editor.softProof}· CMYK soft-proof{/if}
			</p>
			<div class="modal-action">
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => (showPrintModal = false)}>Cancel</button>
				<button
					type="button"
					class="btn btn-primary btn-sm"
					onclick={() => {
						editor.printDocument();
						showPrintModal = false;
					}}>Print</button
				>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button type="button" onclick={() => (showPrintModal = false)}>close</button>
		</form>
	</dialog>
{/if}

{#if showNewModal}
	<dialog class="modal modal-open">
		<div class="modal-box bg-base-100">
			<h3 class="text-lg font-bold">New Document</h3>
			<div class="mt-4 space-y-3">
				<label class="form-control w-full">
					<span class="label-text text-xs">Width (px)</span>
					<input type="number" class="input input-bordered input-sm" bind:value={newW} min="1" />
				</label>
				<label class="form-control w-full">
					<span class="label-text text-xs">Height (px)</span>
					<input type="number" class="input input-bordered input-sm" bind:value={newH} min="1" />
				</label>
				<label class="form-control w-full">
					<span class="label-text text-xs">Background</span>
					<select class="select select-bordered select-sm" bind:value={newBg}>
						<option value="white">White</option>
						<option value="black">Black</option>
						<option value="transparent">Transparent</option>
					</select>
				</label>
			</div>
			<div class="modal-action">
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => (showNewModal = false)}
					>Cancel</button
				>
				<button type="button" class="btn btn-primary btn-sm" onclick={confirmNew}>Create</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button type="button" onclick={() => (showNewModal = false)}>close</button>
		</form>
	</dialog>
{/if}

<script lang="ts">
	import { FILTER_CATALOG } from '$lib/editor/filters/catalog';
	import { ROADMAP } from '$lib/editor/roadmap';
	import type { EditorState } from '$lib/editor/state/EditorState.svelte';
	import type { AdjustmentKind } from '$lib/editor/types';

	let {
		editor,
		onnew,
		onopen,
		onsave,
		onexport,
		onprint
	}: {
		editor: EditorState;
		onnew: () => void;
		onopen: () => void;
		onsave: () => void;
		onexport: (format: 'png' | 'jpeg' | 'webp') => void;
		onprint?: () => void;
	} = $props();

	const adjustments: { id: AdjustmentKind; label: string }[] = [
		{ id: 'brightness-contrast', label: 'Brightness/Contrast' },
		{ id: 'levels', label: 'Levels' },
		{ id: 'curves', label: 'Curves' },
		{ id: 'exposure', label: 'Exposure' },
		{ id: 'vibrance', label: 'Vibrance' },
		{ id: 'hue-saturation', label: 'Hue/Saturation' },
		{ id: 'color-balance', label: 'Color Balance' },
		{ id: 'black-white', label: 'Black & White' },
		{ id: 'photo-filter', label: 'Photo Filter' },
		{ id: 'invert', label: 'Invert' },
		{ id: 'threshold', label: 'Threshold' },
		{ id: 'posterize', label: 'Posterize' }
	];

	function applyFilter(id: (typeof FILTER_CATALOG)[number]['id'], implemented: boolean, label: string) {
		if (!editor.doc) return;
		if (!implemented) {
			editor.status = `${label} — not implemented yet`;
			return;
		}
		editor.applyFilter(id);
	}

	function stub(label: string) {
		editor.status = `${label} — coming in a later phase`;
	}
</script>

<div class="navbar min-h-9 gap-0 border-b border-base-300 bg-base-200 px-1 py-0 text-sm">
	<div class="flex flex-wrap items-center gap-0">
		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">File</button>
			<ul class="menu dropdown-content z-50 w-56 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li><button type="button" onclick={onnew}>New…</button></li>
				<li><button type="button" onclick={onopen}>Open… / PSD</button></li>
				<li><button type="button" onclick={onsave}>Save (.p12f)</button></li>
				<li>
					<details>
						<summary>Export</summary>
						<ul>
							<li><button type="button" onclick={() => onexport('png')}>PNG</button></li>
							<li><button type="button" onclick={() => onexport('jpeg')}>JPEG</button></li>
							<li><button type="button" onclick={() => onexport('webp')}>WebP</button></li>
						</ul>
					</details>
				</li>
				<li><button type="button" onclick={() => onprint?.()}>Print…</button></li>
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">Edit</button>
			<ul class="menu dropdown-content z-50 w-56 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li><button type="button" onclick={() => editor.undo()}>Undo</button></li>
				<li><button type="button" onclick={() => editor.redo()}>Redo</button></li>
				<li><button type="button" onclick={() => editor.deselect()}>Deselect</button></li>
				<li><button type="button" onclick={() => editor.invertSelection()}>Invert Selection</button></li>
				<li><button type="button" onclick={() => editor.runContentAwareFill()}>Content-Aware Fill</button></li>
				<li>
					<button type="button" onclick={() => editor.startActionRecording()}>Start Action Recording</button>
				</li>
				<li>
					<button type="button" onclick={() => editor.stopActionRecording()}>Stop & Save Action</button>
				</li>
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">Image</button>
			<ul class="menu dropdown-content z-50 w-52 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li><button type="button" onclick={() => editor.setTool('crop')}>Crop Tool</button></li>
				<li><button type="button" onclick={() => stub('Image Size')}>Image Size…</button></li>
				<li><button type="button" onclick={() => editor.runReplaceSky()}>Replace Sky</button></li>
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">Layer</button>
			<ul class="menu dropdown-content z-50 w-56 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li><button type="button" onclick={() => editor.addEmptyLayer()}>New Layer</button></li>
				<li><button type="button" onclick={() => editor.addSolidFill()}>New Fill Layer</button></li>
				<li><button type="button" onclick={() => editor.duplicateActiveLayer()}>Duplicate Layer</button></li>
				<li><button type="button" onclick={() => editor.deleteActiveLayer()}>Delete Layer</button></li>
				<li><button type="button" onclick={() => editor.ensureEffects()}>Enable Layer Styles</button></li>
				<li>
					<details>
						<summary>New Adjustment</summary>
						<ul>
							{#each adjustments as adj}
								<li>
									<button type="button" onclick={() => editor.addAdjustment(adj.id)}>{adj.label}</button>
								</li>
							{/each}
						</ul>
					</details>
				</li>
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">Filter</button>
			<ul
				class="menu dropdown-content z-50 max-h-80 w-56 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 shadow"
			>
				{#each FILTER_CATALOG as f}
					<li>
						<button type="button" onclick={() => applyFilter(f.id, f.implemented, f.label)}>
							{f.label}
							{#if !f.implemented}
								<span class="badge badge-ghost badge-xs">soon</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">Select</button>
			<ul class="menu dropdown-content z-50 w-56 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li><button type="button" onclick={() => editor.deselect()}>Deselect</button></li>
				<li><button type="button" onclick={() => editor.invertSelection()}>Inverse</button></li>
				<li><button type="button" onclick={() => editor.runSelectSubject()}>Subject</button></li>
				<li><button type="button" onclick={() => editor.runSelectSky()}>Sky</button></li>
				<li><button type="button" onclick={() => editor.featherSelection(4)}>Feather…</button></li>
				<li><button type="button" onclick={() => editor.expandSelection(2)}>Expand</button></li>
				<li><button type="button" onclick={() => editor.saveSelectionAsChannel()}>Save Channel</button></li>
				<li><button type="button" onclick={() => editor.pathToSelection()}>Path → Selection</button></li>
				<li><button type="button" onclick={() => editor.closePath()}>Close Path</button></li>
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">View</button>
			<ul class="menu dropdown-content z-50 w-52 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li>
					<button type="button" onclick={() => (editor.zoom = Math.min(32, editor.zoom * 1.25))}
						>Zoom In</button
					>
				</li>
				<li>
					<button type="button" onclick={() => (editor.zoom = Math.max(0.05, editor.zoom / 1.25))}
						>Zoom Out</button
					>
				</li>
				<li><button type="button" onclick={() => editor.fitZoom()}>Fit on Screen</button></li>
				<li><button type="button" onclick={() => editor.setTool('rotate-view')}>Rotate View Tool</button></li>
				<li><button type="button" onclick={() => editor.resetViewRotation()}>Reset View Rotation</button></li>
				<li><button type="button" onclick={() => editor.toggleSoftProof()}>Toggle Soft-Proof</button></li>
				<li><button type="button" onclick={() => editor.addArtboard()}>New Artboard</button></li>
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">Window</button>
			<ul class="menu dropdown-content z-50 w-44 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li><button type="button" onclick={() => (editor.status = 'Use right tabs: Styles / Channels')}>Panels</button></li>
			</ul>
		</div>

		<div class="dropdown">
			<button type="button" tabindex="0" class="btn btn-ghost btn-xs">Help</button>
			<ul class="menu dropdown-content z-50 w-56 rounded-box border border-base-300 bg-base-100 p-1 shadow">
				<li>
					<button type="button" onclick={() => (editor.status = `Roadmap: ${ROADMAP.length} items`)}>
						Roadmap ({ROADMAP.length} items)
					</button>
				</li>
				<li>
					<button type="button" onclick={() => (editor.status = 'project12f Image Editor — Phase 4')}
						>About</button
					>
				</li>
			</ul>
		</div>
	</div>
</div>

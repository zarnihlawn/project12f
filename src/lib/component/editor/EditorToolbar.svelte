<script lang="ts">
	import type { EditorState } from '$lib/editor/state/EditorState.svelte';
	import type { ToolId } from '$lib/editor/types';
	import {
		Aperture,
		Bandage,
		Blend,
		Brush,
		CircleDashed,
		Crop,
		Eraser,
		Flame,
		Hand,
		Hash,
		History,
		Lasso,
		Move,
		PaintBucket,
		Paintbrush,
		PenTool,
		Pencil,
		Pipette,
		RotateCw,
		Ruler,
		SquareDashed,
		Stamp,
		Sun,
		Type,
		WandSparkles,
		ZoomIn
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	let { editor }: { editor: EditorState } = $props();

	type ToolEntry = { id: ToolId; label: string; Icon: Component<{ class?: string }> };
	type ToolGroup = ToolEntry[];

	const groups: ToolGroup[] = [
		[
			{ id: 'move', label: 'Move (V)', Icon: Move },
			{ id: 'marquee-rect', label: 'Rectangular Marquee (M)', Icon: SquareDashed },
			{ id: 'marquee-ellipse', label: 'Elliptical Marquee', Icon: CircleDashed },
			{ id: 'lasso', label: 'Lasso', Icon: Lasso },
			{ id: 'magic-wand', label: 'Magic Wand', Icon: WandSparkles }
		],
		[
			{ id: 'crop', label: 'Crop', Icon: Crop },
			{ id: 'eyedropper', label: 'Eyedropper (I)', Icon: Pipette },
			{ id: 'ruler', label: 'Ruler', Icon: Ruler },
			{ id: 'count', label: 'Count', Icon: Hash }
		],
		[
			{ id: 'brush', label: 'Brush (B)', Icon: Brush },
			{ id: 'pencil', label: 'Pencil', Icon: Pencil },
			{ id: 'mixer-brush', label: 'Mixer Brush', Icon: Paintbrush },
			{ id: 'eraser', label: 'Eraser (E)', Icon: Eraser },
			{ id: 'paint-bucket', label: 'Paint Bucket', Icon: PaintBucket },
			{ id: 'gradient', label: 'Gradient', Icon: Blend },
			{ id: 'pattern-stamp', label: 'Pattern Stamp', Icon: Stamp },
			{ id: 'history-brush', label: 'History Brush', Icon: History }
		],
		[
			{ id: 'clone', label: 'Clone Stamp', Icon: Stamp },
			{ id: 'spot-heal', label: 'Spot Healing', Icon: Bandage },
			{ id: 'dodge', label: 'Dodge', Icon: Sun },
			{ id: 'burn', label: 'Burn', Icon: Flame },
			{ id: 'blur', label: 'Blur', Icon: Aperture }
		],
		[
			{ id: 'text', label: 'Text (T)', Icon: Type },
			{ id: 'pen', label: 'Pen (P)', Icon: PenTool },
			{ id: 'shape-rect', label: 'Rectangle', Icon: SquareDashed },
			{ id: 'shape-ellipse', label: 'Ellipse', Icon: CircleDashed }
		],
		[
			{ id: 'hand', label: 'Hand (Space)', Icon: Hand },
			{ id: 'zoom', label: 'Zoom', Icon: ZoomIn },
			{ id: 'rotate-view', label: 'Rotate View', Icon: RotateCw }
		]
	];
</script>

<aside class="flex w-11 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-base-300 bg-base-200 py-1">
	{#each groups as group, gi}
		{#if gi > 0}
			<div class="my-1 h-px w-7 bg-base-300"></div>
		{/if}
		{#each group as tool}
			{@const active = editor.tool === tool.id}
			<div class="tooltip tooltip-right" data-tip={tool.label}>
				<button
					type="button"
					class="btn btn-square btn-xs {active ? 'btn-primary' : 'btn-ghost'}"
					aria-label={tool.label}
					aria-pressed={active}
					onclick={() => editor.setTool(tool.id)}
				>
					<tool.Icon class="h-4 w-4" />
				</button>
			</div>
		{/each}
	{/each}
</aside>

<script lang="ts">
	import type { RetouchState } from '$lib/retouch/RetouchState.svelte';
	import type { CropMode, RetouchTool } from '$lib/retouch/types';
	import { Circle, Crop, Hand, PenTool } from '@lucide/svelte';
	import type { Component } from 'svelte';

	let { retouch }: { retouch: RetouchState } = $props();

	const tools: { id: RetouchTool; label: string; Icon: Component<{ class?: string }> }[] = [
		{ id: 'pan', label: 'Pan (H)', Icon: Hand },
		{ id: 'crop', label: 'Crop (C)', Icon: Crop }
	];

	const cropModes: { id: CropMode; label: string; Icon: Component<{ class?: string }> }[] = [
		{ id: 'rect', label: 'Rectangle crop', Icon: Crop },
		{ id: 'ellipse', label: 'Ellipse / oval crop', Icon: Circle },
		{ id: 'pen', label: 'Pen polygon crop', Icon: PenTool }
	];
</script>

<aside class="flex w-11 shrink-0 flex-col items-center gap-0.5 border-r border-base-300 bg-base-200 py-2">
	{#each tools as tool}
		{@const active = retouch.tool === tool.id}
		<div class="tooltip tooltip-right" data-tip={tool.label}>
			<button
				type="button"
				class="btn btn-square btn-xs {active ? 'btn-primary' : 'btn-ghost'}"
				aria-label={tool.label}
				aria-pressed={active}
				onclick={() => {
					retouch.tool = tool.id;
					if (tool.id === 'crop') retouch.panel = 'crop';
				}}
			>
				<tool.Icon class="h-4 w-4" />
			</button>
		</div>
	{/each}

	<div class="my-1 h-px w-7 bg-base-300"></div>

	{#each cropModes as mode}
		{@const active = retouch.tool === 'crop' && retouch.cropMode === mode.id}
		<div class="tooltip tooltip-right" data-tip={mode.label}>
			<button
				type="button"
				class="btn btn-square btn-xs {active ? 'btn-primary' : 'btn-ghost'}"
				aria-label={mode.label}
				aria-pressed={active}
				onclick={() => retouch.setCropMode(mode.id)}
			>
				<mode.Icon class="h-4 w-4" />
			</button>
		</div>
	{/each}
</aside>

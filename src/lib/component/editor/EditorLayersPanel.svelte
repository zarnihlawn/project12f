<script lang="ts">
	import type { EditorState } from '$lib/editor/state/EditorState.svelte';
	import { BLEND_MODES, type BlendMode } from '$lib/editor/types';
	import { Copy, Eye, EyeOff, Plus, Trash2 } from '@lucide/svelte';

	let { editor }: { editor: EditorState } = $props();

	const layersTopFirst = $derived.by(() => {
		void editor.dirty;
		const doc = editor.doc;
		if (!doc) return [];
		return [...doc.layerOrder]
			.reverse()
			.map((id) => doc.layers.find((l) => l.id === id))
			.filter((l): l is NonNullable<typeof l> => !!l);
	});

	function setOpacity(id: string, e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		editor.setLayerOpacity(id, v);
	}

	function setBlend(id: string, e: Event) {
		const v = (e.currentTarget as HTMLSelectElement).value as BlendMode;
		editor.setLayerBlend(id, v);
	}
</script>

<div class="flex h-full flex-col gap-2 p-2 text-sm">
	<div class="flex items-center gap-1">
		<div class="tooltip" data-tip="New layer">
			<button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="New layer" onclick={() => editor.addEmptyLayer()}>
				<Plus class="h-3.5 w-3.5" />
			</button>
		</div>
		<div class="tooltip" data-tip="Duplicate layer">
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square"
				aria-label="Duplicate layer"
				onclick={() => editor.duplicateActiveLayer()}
			>
				<Copy class="h-3.5 w-3.5" />
			</button>
		</div>
		<div class="tooltip" data-tip="Delete layer">
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square"
				aria-label="Delete layer"
				onclick={() => editor.deleteActiveLayer()}
			>
				<Trash2 class="h-3.5 w-3.5" />
			</button>
		</div>
		<button type="button" class="btn btn-ghost btn-xs" onclick={() => editor.addMask(true)}>
			Add mask
		</button>
	</div>

	<label class="flex cursor-pointer items-center gap-2 px-1 text-xs">
		<input type="checkbox" class="checkbox checkbox-xs" bind:checked={editor.paintOnMask} />
		Paint on mask
	</label>

	<ul class="flex-1 space-y-1 overflow-y-auto">
		{#each layersTopFirst as layer (layer.id)}
			{@const active = editor.doc?.activeLayerId === layer.id}
			<li
				class="rounded border px-1.5 py-1 {active
					? 'border-primary bg-primary/10'
					: 'border-base-300 bg-base-100'}"
			>
				<div class="flex w-full items-center gap-1">
					<div class="tooltip" data-tip={layer.visible ? 'Hide' : 'Show'}>
						<button
							type="button"
							class="btn btn-ghost btn-xs btn-square"
							aria-label={layer.visible ? 'Hide' : 'Show'}
							onclick={() => editor.toggleLayerVisible(layer.id)}
						>
							{#if layer.visible}
								<Eye class="h-3.5 w-3.5" />
							{:else}
								<EyeOff class="h-3.5 w-3.5" />
							{/if}
						</button>
					</div>
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-1 text-left"
						onclick={() => editor.setActiveLayer(layer.id)}
					>
						<span class="flex-1 truncate text-xs font-medium">{layer.name}</span>
						<span class="badge badge-ghost badge-xs">{layer.kind}</span>
					</button>
				</div>
				{#if active}
					<div class="mt-1 space-y-1 pl-1">
						<label class="flex items-center gap-2 text-xs">
							<span class="w-12 shrink-0 opacity-70">Opacity</span>
							<input
								type="range"
								min="0"
								max="100"
								class="range range-xs flex-1"
								value={layer.opacity}
								oninput={(e) => setOpacity(layer.id, e)}
							/>
							<span class="w-8 text-right tabular-nums">{layer.opacity}</span>
						</label>
						<label class="flex items-center gap-2 text-xs">
							<span class="w-12 shrink-0 opacity-70">Blend</span>
							<select
								class="select select-xs flex-1"
								value={layer.blendMode}
								onchange={(e) => setBlend(layer.id, e)}
							>
								{#each BLEND_MODES as mode}
									<option value={mode.id}>{mode.label}</option>
								{/each}
							</select>
						</label>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</div>

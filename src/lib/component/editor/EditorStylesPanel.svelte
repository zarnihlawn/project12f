<script lang="ts">
	import type { EditorState } from '$lib/editor/state/EditorState.svelte';
	import type { LayerEffects } from '$lib/editor/types';
	import { getActiveLayer } from '$lib/editor/document/factory';

	let { editor }: { editor: EditorState } = $props();

	const layer = $derived.by(() => {
		void editor.dirty;
		return editor.doc ? getActiveLayer(editor.doc) : null;
	});

	const fx = $derived(layer?.effects);

	function toggle(key: keyof LayerEffects) {
		editor.ensureEffects();
		const cur = getActiveLayer(editor.doc!)?.effects?.[key] as { enabled?: boolean } | undefined;
		editor.setEffectEnabled(key, !cur?.enabled);
	}
</script>

<div class="flex flex-col gap-2 p-2 text-xs">
	<p class="font-semibold">Layer Styles</p>
	{#if !layer}
		<p class="opacity-60">No active layer</p>
	{:else}
		<button type="button" class="btn btn-ghost btn-xs" onclick={() => editor.ensureEffects()}
			>Initialize styles</button
		>
		{#if fx}
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={fx.dropShadow?.enabled}
					onchange={() => toggle('dropShadow')}
				/>
				Drop Shadow
			</label>
			{#if fx.dropShadow?.enabled}
				<label class="flex flex-col gap-0.5 opacity-80"
					>Distance
					<input
						type="range"
						min="0"
						max="40"
						class="range range-xs"
						value={fx.dropShadow.distance}
						oninput={(e) =>
							editor.updateEffect('dropShadow', {
								distance: Number(e.currentTarget.value)
							})}
					/>
				</label>
				<label class="flex flex-col gap-0.5 opacity-80"
					>Size
					<input
						type="range"
						min="0"
						max="40"
						class="range range-xs"
						value={fx.dropShadow.size}
						oninput={(e) =>
							editor.updateEffect('dropShadow', { size: Number(e.currentTarget.value) })}
					/>
				</label>
			{/if}

			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={fx.outerGlow?.enabled}
					onchange={() => toggle('outerGlow')}
				/>
				Outer Glow
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={fx.stroke?.enabled}
					onchange={() => toggle('stroke')}
				/>
				Stroke
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={fx.colorOverlay?.enabled}
					onchange={() => toggle('colorOverlay')}
				/>
				Color Overlay
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={fx.gradientOverlay?.enabled}
					onchange={() => toggle('gradientOverlay')}
				/>
				Gradient Overlay
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={fx.innerGlow?.enabled}
					onchange={() => toggle('innerGlow')}
				/>
				Inner Glow
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={fx.innerShadow?.enabled}
					onchange={() => toggle('innerShadow')}
				/>
				Inner Shadow
			</label>
		{/if}
	{/if}
</div>

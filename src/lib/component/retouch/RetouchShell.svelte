<script lang="ts">
	import { resolve } from '$app/paths';
	import RetouchCanvas from '$lib/component/retouch/RetouchCanvas.svelte';
	import RetouchPanel from '$lib/component/retouch/RetouchPanel.svelte';
	import RetouchToolbar from '$lib/component/retouch/RetouchToolbar.svelte';
	import { ACCEPT_TYPES } from '$lib/retouch/types';
	import { createRetouchState } from '$lib/retouch/RetouchState.svelte';
	import { FolderOpen, Redo2, Undo2, Download } from '@lucide/svelte';

	const retouch = createRetouchState();
	let fileInput: HTMLInputElement | undefined = $state();

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) void retouch.openFile(file);
	}

	function onKeyDown(e: KeyboardEvent) {
		const t = e.target as HTMLElement | null;
		if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;

		if (e.code === 'Space' && !e.repeat) {
			e.preventDefault();
			retouch.spaceDown = true;
			return;
		}
		const ctrl = e.ctrlKey || e.metaKey;
		if (ctrl && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			if (e.shiftKey) retouch.redo();
			else retouch.undo();
			return;
		}
		if (ctrl && e.key.toLowerCase() === 'y') {
			e.preventDefault();
			retouch.redo();
			return;
		}
		if (ctrl && e.key.toLowerCase() === 's') {
			e.preventDefault();
			void retouch.export();
			return;
		}
		if (ctrl) return;
		switch (e.key.toLowerCase()) {
			case 'h':
				retouch.tool = 'pan';
				break;
			case 'c':
				retouch.tool = 'crop';
				retouch.panel = 'crop';
				break;
			case 'o':
				fileInput?.click();
				break;
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') retouch.spaceDown = false;
	}
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />

<div class="flex h-full min-h-0 flex-col bg-base-300 text-base-content">
	<header class="flex h-10 shrink-0 items-center gap-1 border-b border-base-300 bg-base-200 px-2">
		<span class="px-2 text-sm font-semibold tracking-tight">Retouch</span>
		<div class="tooltip tooltip-bottom" data-tip="Open (O)">
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square"
				aria-label="Open"
				onclick={() => fileInput?.click()}
			>
				<FolderOpen class="h-4 w-4" />
			</button>
		</div>
		<div class="tooltip tooltip-bottom" data-tip="Undo (Ctrl+Z)">
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square"
				aria-label="Undo"
				disabled={!retouch.canUndo}
				onclick={() => retouch.undo()}
			>
				<Undo2 class="h-4 w-4" />
			</button>
		</div>
		<div class="tooltip tooltip-bottom" data-tip="Redo (Ctrl+Shift+Z)">
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square"
				aria-label="Redo"
				disabled={!retouch.canRedo}
				onclick={() => retouch.redo()}
			>
				<Redo2 class="h-4 w-4" />
			</button>
		</div>
		<div class="tooltip tooltip-bottom" data-tip="Export (Ctrl+S)">
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square"
				aria-label="Export"
				onclick={() => void retouch.export()}
			>
				<Download class="h-4 w-4" />
			</button>
		</div>
		<a
			class="btn btn-ghost btn-xs ml-1"
			href={resolve('/(public)/(service)/utilities/image/editor')}
			>Editor</a
		>
		<span class="ml-auto truncate px-2 text-[11px] opacity-70">{retouch.status}</span>
		{#if retouch.image}
			<span class="tabular-nums text-[11px] opacity-50"
				>{retouch.image.width}×{retouch.image.height}</span
			>
			<span class="tabular-nums text-[11px] opacity-50">{Math.round(retouch.zoom * 100)}%</span>
		{/if}
	</header>

	<div class="flex min-h-0 flex-1">
		<RetouchToolbar {retouch} />
		<div class="min-w-0 flex-1 bg-base-300">
			<RetouchCanvas {retouch} />
		</div>
		<RetouchPanel {retouch} />
	</div>
</div>

<input
	bind:this={fileInput}
	type="file"
	class="hidden"
	accept={ACCEPT_TYPES}
	onchange={onFileChange}
/>

<script lang="ts">
	import { LucideX } from '@lucide/svelte';

	let {
		text = '',
		tone = 'info',
		onclose
	}: {
		text?: string;
		tone?: 'error' | 'success' | 'info';
		onclose?: () => void;
	} = $props();
</script>

{#if text}
	<div
		class="fixed inset-x-0 top-0 z-[9999] flex justify-center p-3 sm:p-4"
		role="alert"
		aria-live="assertive"
		data-testid="auth-toast"
	>
		<div
			class={[
				'flex w-full max-w-lg items-start gap-3 rounded-xl border-2 px-4 py-3 shadow-2xl',
				tone === 'error' && 'border-red-300 bg-red-600 text-white',
				tone === 'success' && 'border-emerald-300 bg-emerald-600 text-white',
				tone === 'info' && 'border-sky-300 bg-sky-600 text-white'
			]}
		>
			<p class="min-w-0 flex-1 text-sm font-semibold leading-snug">{text}</p>
			{#if onclose}
				<button
					type="button"
					class="shrink-0 rounded-md p-1 text-white/90 hover:bg-white/15"
					aria-label="Dismiss"
					onclick={onclose}
				>
					<LucideX class="size-4" />
				</button>
			{/if}
		</div>
	</div>
{/if}

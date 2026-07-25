<script lang="ts">
	import { LucideEye, LucideEyeOff } from '@lucide/svelte';

	let {
		name = 'password',
		placeholder = 'Password',
		required = true,
		autocomplete = 'current-password',
		value = $bindable('')
	}: {
		name?: string;
		placeholder?: string;
		required?: boolean;
		autocomplete?: AutoFill;
		value?: string;
	} = $props();

	let visible = $state(false);
</script>

<label class="input input-bordered flex w-full items-center gap-2">
	<input
		class="grow"
		type={visible ? 'text' : 'password'}
		{name}
		{placeholder}
		{required}
		{autocomplete}
		bind:value
	/>
	<button
		type="button"
		class="btn btn-ghost btn-xs btn-square"
		aria-label={visible ? 'Hide password' : 'Show password'}
		onclick={() => (visible = !visible)}
	>
		{#if visible}
			<LucideEyeOff class="size-4 opacity-70" />
		{:else}
			<LucideEye class="size-4 opacity-70" />
		{/if}
	</button>
</label>

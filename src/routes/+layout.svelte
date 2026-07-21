<script lang="ts">
	import './layout.css';
	import favicon from '$lib/asset/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="bg-base-100">
	{@render children()}
</div>

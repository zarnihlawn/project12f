<script lang="ts">
	import { page } from '$app/state';
	import HomeFooter from '$lib/component/public/home/HomeFooter.svelte';
	import HomeNavbar from '$lib/component/public/home/HomeNavbar.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const isAuth = $derived(page.url.pathname.startsWith('/auth'));
</script>

{#if isAuth}
	{@render children()}
{:else}
	<div class="flex min-h-screen flex-col">
		<HomeNavbar />
		<main class="flex-1">
			{@render children()}
		</main>
		<HomeFooter />
	</div>
{/if}

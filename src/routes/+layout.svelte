<script lang="ts">
	import './layout.css';
	import favicon from '$lib/asset/favicon.svg';
	import { organizationJsonLd, websiteJsonLd } from '$lib/seo/jsonld';
	import { page } from '$app/state';

	let { children, data } = $props();

	const path = $derived(page.url.pathname);
	const isPrivate = $derived(
		/(^|\/)(auth|sudoer)(\/|$)/.test(path) || path.startsWith('/api')
	);

	const siteGraphs = $derived(
		isPrivate
			? []
			: [organizationJsonLd(data.siteOrigin), websiteJsonLd(data.siteOrigin)]
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href={favicon} />
	<meta name="theme-color" content="#F62440" />
	<meta name="color-scheme" content="dark" />
	{#if isPrivate}
		<meta name="robots" content="noindex,nofollow" />
		<meta name="googlebot" content="noindex,nofollow" />
	{/if}
	{#each siteGraphs as graph}
		{@html `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`}
	{/each}
</svelte:head>

<div class="bg-base-100">
	{@render children()}
</div>

<script lang="ts">
	import EditorShell from '$lib/component/editor/EditorShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';

	let { data } = $props();

	const title = 'Image editor';
	const description =
		'Browser image editor for project12f (beta). Paint, layers, selections, filters, and .p12f save — still evolving.';
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/utilities/image/editor"
	robots="noindex,follow"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/utilities/image/editor',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Image utilities', path: '/utilities/image' },
			{ name: 'Editor', path: '/utilities/image/editor' }
		])
	]}
/>

<div class="h-screen overflow-hidden">
	<EditorShell />
</div>

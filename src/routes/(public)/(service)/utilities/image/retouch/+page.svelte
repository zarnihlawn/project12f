<script lang="ts">
	import RetouchShell from '$lib/component/retouch/RetouchShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';

	let { data } = $props();

	const title = 'Retouch — quick image edit';
	const description =
		'Quick browser image retouch on project12f: resize, crop, flip, rotate, filters, and export PNG/JPEG/WebP — no layers required.';
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/utilities/image/retouch"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/utilities/image/retouch',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Image utilities', path: '/utilities/image' },
			{ name: 'Retouch', path: '/utilities/image/retouch' }
		])
	]}
/>

<div class="h-screen overflow-hidden">
	<RetouchShell />
</div>

<script lang="ts">
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';

	let { data } = $props();

	const title = 'Image editor';
	const description =
		'Browser image editor for project12f is coming soon. Crop, resize, and adjust images online — try conversion and compression today.';
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

<div class="hero min-h-[60vh] bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<span class="badge badge-ghost mb-3">Coming soon</span>
			<h1 class="text-3xl font-bold">Image editor</h1>
			<p class="py-4 text-base-content/70">
				This tool is not ready yet. Try conversion in the meantime.
			</p>
			<a class="btn btn-primary" href={resolve('/(public)/(service)/utilities/image/conversion')}
				>Open image conversion</a
			>
		</div>
	</div>
</div>

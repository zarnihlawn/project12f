<script lang="ts">
	import HomeHero from '$lib/component/public/home/HomeHero.svelte';
	import HomeStats from '$lib/component/public/home/HomeStats.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { webPageJsonLd } from '$lib/seo/jsonld';

	let { data } = $props();

	const title = 'project12f — utilities, apps & private tools';
	const description =
		'Convert and compress images, explore research utilities, and run private ops from one dark, modern toolkit. Sign in once — manage everything.';
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/home"
	jsonLd={webPageJsonLd({
		origin: data.siteOrigin,
		path: '/home',
		title,
		description
	})}
/>

<HomeHero />
<div class="divider px-10"></div>
<HomeStats />
<div class="divider px-10"></div>

<script lang="ts">
	import {
		SITE,
		absoluteUrl,
		localizedPath,
		shouldNoindex,
		titleWithBrand,
		type PageSeo,
		type SeoRobots
	} from '$lib/seo/site';

	let {
		siteOrigin,
		title = SITE.defaultTitle,
		description = SITE.defaultDescription,
		path = '/',
		ogType = 'website',
		ogImage,
		robots,
		jsonLd,
		locale = SITE.localeDefault
	}: {
		siteOrigin: string;
		title?: string;
		description?: string;
		path?: string;
		ogType?: PageSeo['ogType'];
		ogImage?: string;
		robots?: SeoRobots;
		jsonLd?: PageSeo['jsonLd'];
		locale?: string;
	} = $props();

	const pageTitle = $derived(titleWithBrand(title));
	const canonicalPath = $derived(localizedPath(path, locale));
	const canonical = $derived(absoluteUrl(siteOrigin, canonicalPath));
	const image = $derived(
		ogImage
			? ogImage.startsWith('http')
				? ogImage
				: absoluteUrl(siteOrigin, ogImage)
			: absoluteUrl(siteOrigin, '/og.png')
	);
	const robotsContent = $derived<SeoRobots>(
		robots ?? (shouldNoindex(path) ? 'noindex,nofollow' : 'index,follow')
	);
	const graphs = $derived(
		jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={robotsContent} />
	<meta name="googlebot" content={robotsContent} />
	<link rel="canonical" href={canonical} />

	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:locale" content={locale === 'en' ? 'en_US' : locale} />
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={image} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	{#if SITE.twitterHandle}
		<meta name="twitter:site" content={SITE.twitterHandle} />
	{/if}

	{#each SITE.locales as loc}
		<link
			rel="alternate"
			hreflang={loc}
			href={absoluteUrl(siteOrigin, localizedPath(path, loc))}
		/>
	{/each}
	<link
		rel="alternate"
		hreflang="x-default"
		href={absoluteUrl(siteOrigin, localizedPath(path, SITE.localeDefault))}
	/>

	{#each graphs as graph}
		{@html `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`}
	{/each}
</svelte:head>

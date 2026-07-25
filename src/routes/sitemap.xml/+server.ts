import { SITE, absoluteUrl, localizedPath } from '$lib/seo/site';
import { building } from '$app/env';
import { ORIGIN } from '$app/env/private';

const FALLBACK = 'https://project12f.zarnihlawn.com';

function escapeXml(s: string) {
	return s
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export const GET = async ({ url }: { url: URL }) => {
	const origin = (!building && ORIGIN?.replace(/\/$/, '')) || url.origin || FALLBACK;
	const lastmod = new Date().toISOString().slice(0, 10);

	const entries = SITE.sitemapPaths.map((path) => {
		const loc = absoluteUrl(origin, localizedPath(path, SITE.localeDefault));
		const alternates = SITE.locales
			.map(
				(locale) =>
					`    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(absoluteUrl(origin, localizedPath(path, locale)))}" />`
			)
			.join('\n');
		const xDefault = absoluteUrl(origin, localizedPath(path, SITE.localeDefault));
		return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '/home' ? '1.0' : '0.8'}</priority>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefault)}" />
  </url>`;
	});

	// Also include locale-prefixed locs as their own <url> rows for crawlers that ignore xhtml
	const localeExtras = SITE.sitemapPaths.flatMap((path) =>
		SITE.locales
			.filter((l) => l !== SITE.localeDefault)
			.map((locale) => {
				const loc = absoluteUrl(origin, localizedPath(path, locale));
				return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
			})
	);

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...entries, ...localeExtras].join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};

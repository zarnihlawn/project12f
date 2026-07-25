/**
 * Site-wide SEO constants for project12f.
 * Absolute URLs are built with `siteOrigin` from the server (ORIGIN env).
 */

export const SITE = {
	name: 'project12f',
	displayName: 'PROJECT 12F',
	tagline: 'Utilities, apps, and private tools — built to ship.',
	defaultTitle: 'project12f — utilities, apps & private tools',
	defaultDescription:
		'project12f is a dark, modern toolkit for image utilities, research, and private ops — convert, compress, and manage with a secure account.',
	twitterHandle: '',
	localeDefault: 'en',
	locales: ['en', 'my', 'ja'] as const,
	/** Paths that must not be indexed */
	noindexPrefixes: ['/auth', '/sudoer', '/api'] as const,
	/** Public paths included in sitemap (locale variants generated at serve time) */
	sitemapPaths: [
		'/home',
		'/about',
		'/contact',
		'/jobs',
		'/press',
		'/services',
		'/services/branding',
		'/services/design',
		'/services/marketing',
		'/services/advertisement',
		'/utilities/image',
		'/utilities/image/conversion',
		'/utilities/image/compression',
		'/utilities/image/retouch'
	] as const
} as const;

export type SeoRobots = 'index,follow' | 'noindex,nofollow' | 'noindex,follow';

export type PageSeo = {
	title: string;
	description: string;
	/** Pathname only, e.g. `/home` — used for canonical + hreflang */
	path: string;
	ogType?: 'website' | 'article';
	ogImage?: string;
	robots?: SeoRobots;
	jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export function absoluteUrl(origin: string, path: string) {
	const base = origin.replace(/\/$/, '');
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${base}${p}`;
}

export function titleWithBrand(pageTitle: string, brand = SITE.name) {
	if (!pageTitle) return SITE.defaultTitle;
	if (pageTitle.toLowerCase().includes(brand.toLowerCase())) return pageTitle;
	return `${pageTitle} · ${brand}`;
}

export function shouldNoindex(pathname: string): boolean {
	return SITE.noindexPrefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

/** Locale-prefixed path for Paraglide (`en` has no prefix). */
export function localizedPath(path: string, locale: string) {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (locale === SITE.localeDefault) return clean;
	return `/${locale}${clean === '/' ? '' : clean}`;
}

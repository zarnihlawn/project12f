import { SITE, absoluteUrl, localizedPath } from './site';

export function organizationJsonLd(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE.displayName,
		alternateName: SITE.name,
		url: origin.replace(/\/$/, ''),
		logo: absoluteUrl(origin, '/favicon.svg'),
		description: SITE.defaultDescription
	};
}

export function websiteJsonLd(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE.name,
		url: origin.replace(/\/$/, ''),
		description: SITE.defaultDescription,
		inLanguage: [...SITE.locales],
		publisher: {
			'@type': 'Organization',
			name: SITE.displayName
		},
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: absoluteUrl(origin, '/home?q={search_term_string}')
			},
			'query-input': 'required name=search_term_string'
		}
	};
}

export function webPageJsonLd(opts: {
	origin: string;
	path: string;
	title: string;
	description: string;
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: opts.title,
		description: opts.description,
		url: absoluteUrl(opts.origin, opts.path),
		isPartOf: {
			'@type': 'WebSite',
			name: SITE.name,
			url: opts.origin.replace(/\/$/, '')
		},
		inLanguage: SITE.localeDefault
	};
}

export function softwareAppJsonLd(opts: {
	origin: string;
	path: string;
	name: string;
	description: string;
	category?: string;
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: opts.name,
		applicationCategory: opts.category ?? 'UtilitiesApplication',
		operatingSystem: 'Web',
		url: absoluteUrl(opts.origin, opts.path),
		description: opts.description,
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		}
	};
}

export function breadcrumbJsonLd(
	origin: string,
	items: { name: string; path: string }[]
) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.name,
			item: absoluteUrl(origin, localizedPath(item.path, SITE.localeDefault))
		}))
	};
}

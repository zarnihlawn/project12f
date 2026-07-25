import { building } from '$app/env';
import { ORIGIN } from '$app/env/private';

const FALLBACK = 'https://project12f.zarnihlawn.com';

export const GET = async ({ url }: { url: URL }) => {
	const origin = (!building && ORIGIN?.replace(/\/$/, '')) || url.origin || FALLBACK;

	const body = `# project12f robots
User-agent: *
Allow: /
Disallow: /auth
Disallow: /sudoer
Disallow: /api/

Disallow: /my/auth
Disallow: /my/sudoer
Disallow: /ja/auth
Disallow: /ja/sudoer

Sitemap: ${origin}/sitemap.xml
`;

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};

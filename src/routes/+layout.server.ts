import { building } from '$app/env';
import { ORIGIN } from '$app/env/private';
import type { LayoutServerLoad } from './$types';

const FALLBACK_ORIGIN = 'https://project12f.zarnihlawn.com';

export const load: LayoutServerLoad = async ({ url }) => {
	const siteOrigin =
		(!building && ORIGIN?.replace(/\/$/, '')) ||
		url.origin ||
		FALLBACK_ORIGIN;

	return {
		siteOrigin,
		seo: {
			siteOrigin
		}
	};
};

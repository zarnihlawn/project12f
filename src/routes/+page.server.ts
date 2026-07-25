import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolve } from '$app/paths';

export const load: PageServerLoad = async () => {
	/** Permanent — consolidates `/` → `/home` for SEO. */
	throw redirect(301, resolve('/(public)/home'));
};

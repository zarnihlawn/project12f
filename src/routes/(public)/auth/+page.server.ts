import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const STAY_WHEN_SIGNED_IN = new Set(['two-factor', 'otp', 'setup-2fa']);

export const load: PageServerLoad = async ({ locals, url }) => {
	const view = url.searchParams.get('view') ?? 'sign-in';
	const redirectTo = url.searchParams.get('redirectTo') || '/sudoer';

	if (locals.user && !STAY_WHEN_SIGNED_IN.has(view)) {
		redirect(303, redirectTo);
	}

	if (!locals.user && view === 'setup-2fa') {
		redirect(303, `/auth?view=sign-in&redirectTo=${encodeURIComponent('/auth?view=setup-2fa')}`);
	}

	return {
		view,
		email: url.searchParams.get('email') ?? '',
		token: url.searchParams.get('token') ?? '',
		redirectTo,
		error: url.searchParams.get('error') ?? '',
		user: locals.user
			? {
					email: locals.user.email,
					twoFactorEnabled: Boolean(
						(locals.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
					)
				}
			: null
	};
};

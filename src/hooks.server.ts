import { building } from '$app/env';
import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

/**
 * Match Better Auth by pathname only.
 * svelteKitHandler's isAuthPath also compares origins — that 404s when
 * ORIGIN is localhost:5173 but the browser uses 127.0.0.1 or another port.
 */
function isBetterAuthPath(pathname: string) {
	/** App-owned route — must reach SvelteKit, not Better Auth. */
	if (pathname === '/api/auth/resend-otp') return false;
	return pathname === '/api/auth' || pathname.startsWith('/api/auth/');
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	event.locals.session = null;
	event.locals.user = null;

	if (isBetterAuthPath(event.url.pathname)) {
		return auth.handler(event.request);
	}

	try {
		const session = await auth.api.getSession({
			headers: event.request.headers
		});
		event.locals.session = session?.session ?? null;
		event.locals.user = session?.user ?? null;
	} catch (err) {
		console.error('[auth] getSession failed', err);
	}

	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleBetterAuth);

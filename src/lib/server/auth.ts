import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, twoFactor } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { building } from '$app/env';
import { BETTER_AUTH_SECRET, ORIGIN } from '$app/env/private';
import { db } from '$lib/server/db';
import {
	AuthAccountSchema,
	AuthSessionSchema,
	AuthTwoFactorSchema,
	AuthUserSchema,
	AuthVerificationSchema
} from '$lib/server/db/auth/auth.schema';
import { sendAuthEmail } from '$lib/server/email';
import {
	buildOtpEmail,
	buildPasswordResetLinkEmail
} from '$lib/server/email-templates';

/** Placeholders only used while SvelteKit analyses the app during Docker/`vite build`. */
const buildOrigin = 'http://localhost:5173';
const buildSecret = 'build-only-placeholder-not-used-at-runtime!!';

const runtimeOrigin = building ? buildOrigin : ORIGIN!;

/** Localhost / loopback variants so sign-in works on 127.0.0.1, ::1, and any Vite port. */
function localDevOrigins(origin: string): string[] {
	const out = new Set<string>([origin]);
	try {
		const u = new URL(origin);
		const ports = new Set([u.port || (u.protocol === 'https:' ? '443' : '80'), '5173', '5174', '3000']);
		for (const host of ['localhost', '127.0.0.1', '[::1]']) {
			for (const port of ports) {
				out.add(`${u.protocol}//${host}${port ? `:${port}` : ''}`);
			}
		}
	} catch {
		/* ignore */
	}
	return [...out];
}

export const auth = betterAuth({
	baseURL: runtimeOrigin,
	secret: building ? buildSecret : BETTER_AUTH_SECRET!,
	trustedOrigins: localDevOrigins(runtimeOrigin),
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: AuthUserSchema,
			session: AuthSessionSchema,
			account: AuthAccountSchema,
			verification: AuthVerificationSchema,
			twoFactor: AuthTwoFactorSchema
		}
	}),
	session: {
		/** Absolute session lifetime: 1 hour, then re-login. */
		expiresIn: 60 * 60,
		/** Do not slide the expiry on activity. */
		disableSessionRefresh: true
	},
	rateLimit: {
		/** Off on local ORIGIN so sign-in testing isn’t blocked by 429s. */
		enabled: !/localhost|127\.0\.0\.1|\[::1\]/.test(runtimeOrigin),
		window: 60,
		max: 100,
		customRules: {
			'/email-otp/send-verification-otp': { window: 60, max: 1 },
			'/email-otp/request-password-reset': { window: 60, max: 1 },
			'/forget-password/email-otp': { window: 60, max: 1 }
		}
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		async sendResetPassword({ user, url }) {
			const mail = buildPasswordResetLinkEmail({ url });
			await sendAuthEmail({
				to: user.email,
				...mail
			});
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true
	},
	plugins: [
		emailOTP({
			otpLength: 6,
			expiresIn: 300,
			sendVerificationOnSignUp: true,
			async sendVerificationOTP({ email, otp, type }) {
				const kind =
					type === 'forget-password' || type === 'sign-in' || type === 'email-verification'
						? type
						: 'email-verification';
				const mail = buildOtpEmail({ kind, otp });
				await sendAuthEmail({
					to: email,
					...mail
				});
			}
		}),
		twoFactor({
			issuer: 'project12f'
		}),
		sveltekitCookies(getRequestEvent)
	]
});

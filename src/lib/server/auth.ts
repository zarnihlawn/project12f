import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, twoFactor } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
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

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
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
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		async sendResetPassword({ user, url }) {
			await sendAuthEmail({
				to: user.email,
				subject: 'Reset your project12f password',
				text: `Reset your password using this link (expires soon):\n\n${url}\n\nIf you didn't request this, ignore this email.`
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
				const labels: Record<string, string> = {
					'sign-in': 'sign-in',
					'email-verification': 'email verification',
					'forget-password': 'password reset'
				};
				await sendAuthEmail({
					to: email,
					subject: `Your project12f ${labels[type] ?? type} code`,
					text: `Your one-time code is: ${otp}\n\nIt expires in 5 minutes.`
				});
			}
		}),
		twoFactor({
			issuer: 'project12f'
		}),
		sveltekitCookies(getRequestEvent)
	]
});

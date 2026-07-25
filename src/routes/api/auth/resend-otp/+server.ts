import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { AuthVerificationSchema } from '$lib/server/db/auth/auth.schema';

const COOLDOWN_SEC = 60;
const COOLDOWN_MS = COOLDOWN_SEC * 1000;

/** email:type → last successful send timestamp (process memory; BA rate limit is the hard stop). */
const lastSentAt = new Map<string, number>();

type OtpKind = 'email-verification' | 'forget-password';

function identifierFor(kind: OtpKind, email: string) {
	return kind === 'forget-password'
		? `forget-password-otp-${email}`
		: `email-verification-otp-${email}`;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; type?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	const email = String(body.email ?? '')
		.trim()
		.toLowerCase();
	const type = body.type === 'forget-password' ? 'forget-password' : 'email-verification';

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ error: 'A valid email is required.' }, { status: 400 });
	}

	const key = `${type}:${email}`;
	const elapsed = Date.now() - (lastSentAt.get(key) ?? 0);
	if (elapsed < COOLDOWN_MS) {
		const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
		return json(
			{
				error: `Please wait ${retryAfter}s before requesting another code.`,
				retryAfter,
				cooldown: COOLDOWN_SEC
			},
			{ status: 429 }
		);
	}

	const identifier = identifierFor(type, email);

	// Invalidate every previous OTP for this email + purpose.
	await db.delete(AuthVerificationSchema).where(eq(AuthVerificationSchema.identifier, identifier));

	try {
		if (type === 'forget-password') {
			const result = await auth.api.requestPasswordResetEmailOTP({
				body: { email },
				headers: request.headers
			});
			if (!result) {
				return json({ error: 'Could not send a new code. Try again.' }, { status: 500 });
			}
		} else {
			const result = await auth.api.sendVerificationOTP({
				body: { email, type: 'email-verification' },
				headers: request.headers
			});
			if (!result) {
				return json({ error: 'Could not send a new code. Try again.' }, { status: 500 });
			}
		}
	} catch (err) {
		const msg = String((err as { message?: string })?.message || '');
		if (msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('rate')) {
			return json(
				{
					error: 'Please wait a minute before requesting another code.',
					retryAfter: COOLDOWN_SEC,
					cooldown: COOLDOWN_SEC
				},
				{ status: 429 }
			);
		}
		console.error('[resend-otp]', err);
		return json(
			{ error: 'We couldn’t send a new code right now. Please try again shortly.' },
			{ status: 503 }
		);
	}

	lastSentAt.set(key, Date.now());
	return json({ success: true, cooldown: COOLDOWN_SEC });
};

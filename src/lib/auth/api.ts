/**
 * Thin Better Auth HTTP helpers — no client SDK magic, easy to debug.
 */

export type AuthApiResult<T = unknown> =
	| { ok: true; data: T }
	| { ok: false; message: string; status: number; code?: string };

async function authFetch<T = unknown>(
	path: string,
	init?: RequestInit
): Promise<AuthApiResult<T>> {
	try {
		const res = await fetch(`/api/auth${path}`, {
			credentials: 'include',
			...init,
			headers: {
				'content-type': 'application/json',
				...(init?.headers || {})
			}
		});

		const text = await res.text();
		let body: Record<string, unknown> = {};
		if (text) {
			try {
				body = JSON.parse(text) as Record<string, unknown>;
			} catch {
				body = { message: text.slice(0, 200) };
			}
		}

		if (!res.ok) {
			return {
				ok: false,
				status: res.status,
				code: typeof body.code === 'string' ? body.code : undefined,
				message:
					(typeof body.message === 'string' && body.message) ||
					(res.status === 404
						? 'Auth API not found. Restart the dev server.'
						: `Request failed (${res.status})`)
			};
		}

		return { ok: true, data: body as T };
	} catch (err) {
		return {
			ok: false,
			status: 0,
			message:
				err instanceof Error
					? err.message
					: 'Network error — could not reach the auth server.'
		};
	}
}

export function signInEmail(email: string, password: string, callbackURL?: string) {
	return authFetch<{ user?: { email?: string }; redirect?: boolean; twoFactorRedirect?: boolean }>(
		'/sign-in/email',
		{
			method: 'POST',
			body: JSON.stringify({ email, password, callbackURL })
		}
	);
}

export function signUpEmail(opts: {
	name: string;
	email: string;
	password: string;
	callbackURL?: string;
}) {
	return authFetch('/sign-up/email', {
		method: 'POST',
		body: JSON.stringify(opts)
	});
}

export function sendEmailOtp(email: string, type: 'email-verification' | 'forget-password' | 'sign-in') {
	return authFetch('/email-otp/send-verification-otp', {
		method: 'POST',
		body: JSON.stringify({ email, type })
	});
}

export function verifyEmailOtp(email: string, otp: string) {
	return authFetch('/email-otp/verify-email', {
		method: 'POST',
		body: JSON.stringify({ email, otp })
	});
}

export function requestPasswordResetOtp(email: string) {
	return authFetch('/email-otp/request-password-reset', {
		method: 'POST',
		body: JSON.stringify({ email })
	});
}

export function resetPasswordWithOtp(email: string, otp: string, password: string) {
	return authFetch('/email-otp/reset-password', {
		method: 'POST',
		body: JSON.stringify({ email, otp, password })
	});
}

export function verifyTotp(code: string, trustDevice = true) {
	return authFetch('/two-factor/verify-totp', {
		method: 'POST',
		body: JSON.stringify({ code, trustDevice })
	});
}

export function verifyBackupCode(code: string, trustDevice = true) {
	return authFetch('/two-factor/verify-backup-code', {
		method: 'POST',
		body: JSON.stringify({ code, trustDevice })
	});
}

export function enableTwoFactor(password: string) {
	return authFetch<{ totpURI?: string; backupCodes?: string[] }>('/two-factor/enable', {
		method: 'POST',
		body: JSON.stringify({ password })
	});
}

export function signOut() {
	return authFetch('/sign-out', { method: 'POST', body: '{}' });
}

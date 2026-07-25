import { SUDOER_EMAILS } from '$app/env/private';

/** Comma-separated emails in SUDOER_EMAILS env var. */
export function parseSudoerEmails(raw = SUDOER_EMAILS ?? ''): string[] {
	return raw
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

export function isSudoerEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return parseSudoerEmails().includes(email.trim().toLowerCase());
}

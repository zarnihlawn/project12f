/**
 * Lightweight mail helper. Logs to console when SMTP is unset (dev-friendly).
 */
export async function sendAuthEmail(opts: {
	to: string;
	subject: string;
	text: string;
}) {
	const host = process.env.SMTP_HOST;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	const from = process.env.SMTP_FROM || 'noreply@project12f.local';

	if (!host || !user || !pass) {
		console.info('\n[auth-email]', {
			from,
			to: opts.to,
			subject: opts.subject,
			text: opts.text
		});
		return;
	}

	// Optional nodemailer path — keep dependency-free: use fetch to a relay if configured later.
	console.info('[auth-email] SMTP configured but nodemailer not installed — logging instead:', {
		to: opts.to,
		subject: opts.subject,
		text: opts.text
	});
}

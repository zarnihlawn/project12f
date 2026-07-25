import {
	SMTP_FROM,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_USER
} from '$app/env/private';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (transporter) return transporter;

	if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
		throw new Error(
			'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to send mail.'
		);
	}

	const port = Number(SMTP_PORT || 465);
	const secure = port === 465;

	transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port,
		secure,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS
		}
	});

	return transporter;
}

export async function sendAuthEmail(opts: {
	to: string;
	subject: string;
	text: string;
	html?: string;
}) {
	const fromName = 'project12f';
	/** Must be a real mailbox — display names like "< PROJECT12F >" are rejected by SMTP. */
	const candidate = (SMTP_FROM || SMTP_USER || '').trim();
	const fromAddress =
		candidate.includes('@') && !candidate.includes('<')
			? candidate
			: (SMTP_USER || '').trim();
	if (!fromAddress || !fromAddress.includes('@')) {
		throw new Error(
			'SMTP_FROM / SMTP_USER must be a fully-qualified email (e.g. noreply@yourdomain.com).'
		);
	}

	await getTransporter().sendMail({
		from: `"${fromName}" <${fromAddress}>`,
		to: opts.to,
		subject: opts.subject,
		text: opts.text,
		html: opts.html
	});
}

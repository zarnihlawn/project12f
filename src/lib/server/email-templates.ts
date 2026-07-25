import { ORIGIN } from '$app/env/private';

const BRAND = 'project12f';
const PRIMARY = '#f62440';
const BASE_100 = '#1a2229';
const BASE_200 = '#151b21';
const BASE_300 = '#11161b';
const CONTENT = '#a8b4bf';
const CONTENT_STRONG = '#e8eef3';

export type AuthMailKind =
	| 'email-verification'
	| 'forget-password'
	| 'sign-in'
	| 'password-reset-link';

const copy: Record<
	AuthMailKind,
	{ eyebrow: string; title: string; lead: string; footerNote: string }
> = {
	'email-verification': {
		eyebrow: 'Email verification',
		title: 'Confirm your email',
		lead: 'Use this one-time code to finish creating your account.',
		footerNote: 'This code expires in 5 minutes. If you didn’t create an account, you can ignore this email.'
	},
	'forget-password': {
		eyebrow: 'Password reset',
		title: 'Reset your password',
		lead: 'Enter this one-time code on the reset screen to choose a new password.',
		footerNote: 'This code expires in 5 minutes. If you didn’t request a reset, you can ignore this email.'
	},
	'sign-in': {
		eyebrow: 'Sign-in code',
		title: 'Your sign-in code',
		lead: 'Use this one-time code to continue signing in.',
		footerNote: 'This code expires in 5 minutes. If you didn’t try to sign in, you can ignore this email.'
	},
	'password-reset-link': {
		eyebrow: 'Password reset',
		title: 'Reset your password',
		lead: 'Click the button below to set a new password. The link expires soon.',
		footerNote: 'If you didn’t request a reset, you can ignore this email.'
	}
};

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function otpDigits(otp: string) {
	return [...otp].map(
		(d) =>
			`<td style="width:40px;height:48px;border:1px solid rgba(246,36,64,0.35);border-radius:8px;background:${BASE_200};color:${CONTENT_STRONG};font-size:22px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-align:center;vertical-align:middle;">${escapeHtml(d)}</td>`
	).join('<td style="width:8px;"></td>');
}

function shell(opts: {
	eyebrow: string;
	title: string;
	lead: string;
	bodyHtml: string;
	footerNote: string;
}) {
	const origin = ORIGIN || 'https://project12f.zarnihlawn.com';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(opts.title)} · ${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:${BASE_300};color:${CONTENT};font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BASE_300};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${BASE_100};border:1px solid rgba(168,180,191,0.12);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, ${PRIMARY}, #ff6b7d);"></td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${PRIMARY};">${BRAND}</p>
              <p style="margin:18px 0 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(168,180,191,0.55);">${escapeHtml(opts.eyebrow)}</p>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:${CONTENT_STRONG};">${escapeHtml(opts.title)}</h1>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:${CONTENT};">${escapeHtml(opts.lead)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.55;color:rgba(168,180,191,0.65);">${escapeHtml(opts.footerNote)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid rgba(168,180,191,0.1);background:${BASE_200};">
              <p style="margin:0;font-size:11px;color:rgba(168,180,191,0.45);">
                Sent by ${BRAND} · <a href="${escapeHtml(origin)}" style="color:${PRIMARY};text-decoration:none;">${escapeHtml(origin.replace(/^https?:\/\//, ''))}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOtpEmail(opts: { kind: Exclude<AuthMailKind, 'password-reset-link'>; otp: string }) {
	const meta = copy[opts.kind];
	const text = [
		`${meta.title} — ${BRAND}`,
		'',
		meta.lead,
		'',
		`Your code: ${opts.otp}`,
		'',
		meta.footerNote
	].join('\n');

	const html = shell({
		...meta,
		bodyHtml: `
			<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
				<tr>${otpDigits(opts.otp)}</tr>
			</table>
			<p style="margin:18px 0 0;text-align:center;font-size:12px;color:rgba(168,180,191,0.55);">Or enter this code manually: <strong style="color:${CONTENT_STRONG};letter-spacing:0.18em;">${escapeHtml(opts.otp)}</strong></p>
		`
	});

	const subjects: Record<typeof opts.kind, string> = {
		'email-verification': `Your ${BRAND} verification code`,
		'forget-password': `Your ${BRAND} password reset code`,
		'sign-in': `Your ${BRAND} sign-in code`
	};

	return { subject: subjects[opts.kind], text, html };
}

export function buildPasswordResetLinkEmail(opts: { url: string }) {
	const meta = copy['password-reset-link'];
	const text = [
		`${meta.title} — ${BRAND}`,
		'',
		meta.lead,
		'',
		opts.url,
		'',
		meta.footerNote
	].join('\n');

	const html = shell({
		...meta,
		bodyHtml: `
			<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
				<tr>
					<td align="center" style="border-radius:10px;background:${PRIMARY};">
						<a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#14080a;text-decoration:none;">
							Reset password
						</a>
					</td>
				</tr>
			</table>
			<p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:rgba(168,180,191,0.55);word-break:break-all;">
				If the button doesn’t work, open this link:<br />
				<a href="${escapeHtml(opts.url)}" style="color:${PRIMARY};">${escapeHtml(opts.url)}</a>
			</p>
		`
	});

	return {
		subject: `Reset your ${BRAND} password`,
		text,
		html
	};
}

import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';
import * as z from 'zod';

/** Required at runtime; optional while SvelteKit analyses the app during `vite build`. */
const runtimeString = building
	? z.string().optional()
	: z.string().min(1, 'must be a non-empty string');

/** Always optional (empty / unset is fine). */
const optionalString = z.string().optional();

/**
 * All private vars default to `static: false` (read at process start from `process.env`).
 * Do not set `static: true` for secrets — that would bake them into the Docker image.
 */
export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'PostgreSQL connection string (e.g. Neon). Runtime secret — set via Fly secrets / docker -e.',
		schema: runtimeString
	},
	ORIGIN: {
		description:
			'Public app origin (base URL), e.g. `https://project12f.zarnihlawn.com` or `http://localhost:5173`.',
		schema: runtimeString
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign auth tokens (≥32 chars, high entropy). Runtime secret — never bake into the image.',
		schema: runtimeString
	},
	SUDOER_EMAILS: {
		description: 'Comma-separated emails allowed to access /sudoer. Empty means nobody is a sudoer.',
		schema: building ? optionalString : z.string().default('')
	},
	SMTP_HOST: {
		description: 'SMTP host (e.g. mail.privateemail.com). Required to send auth emails.',
		schema: optionalString
	},
	SMTP_PORT: {
		description: 'SMTP port (465 SSL or 587 STARTTLS). Defaults to 465.',
		schema: optionalString
	},
	SMTP_USER: {
		description: 'SMTP username (usually the full mailbox address).',
		schema: optionalString
	},
	SMTP_PASS: {
		description: 'SMTP password. Runtime secret.',
		schema: optionalString
	},
	SMTP_FROM: {
		description: 'From address for auth emails (defaults to SMTP_USER).',
		schema: optionalString
	}
});

import { createAuthClient } from 'better-auth/svelte';
import { emailOTPClient, twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	plugins: [
		emailOTPClient(),
		twoFactorClient({
			onTwoFactorRedirect() {
				if (typeof window !== 'undefined') {
					const url = new URL(window.location.href);
					url.pathname = '/auth';
					url.searchParams.set('view', 'two-factor');
					window.location.href = url.toString();
				}
			}
		})
	]
});

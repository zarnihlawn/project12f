<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		LucideArrowLeft,
		LucideCopy,
		LucideFingerprint,
		LucideKeyRound,
		LucideLock,
		LucideMail,
		LucideQrCode,
		LucideShieldCheck,
		LucideSparkles,
		LucideUserPlus
	} from '@lucide/svelte';
	import * as authApi from '$lib/auth/api';
	import AuthToast from '$lib/component/auth/AuthToast.svelte';
	import PasswordInput from '$lib/component/auth/PasswordInput.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import favicon from '$lib/asset/favicon.svg';
	import type { Component } from 'svelte';

	type View = 'sign-in' | 'sign-up' | 'forgot' | 'reset' | 'otp' | 'two-factor' | 'setup-2fa';

	let { data } = $props();

	let view = $state<View>((data.view as View) || 'sign-in');
	let name = $state('');
	let email = $state(data.email || '');
	let password = $state('');
	let confirmPassword = $state('');
	let otp = $state('');
	let totpCode = $state('');
	let backupCode = $state('');
	let useBackup = $state(false);
	let pending = $state(false);
	let message = $state(data.error || '');
	let messageTone = $state<'error' | 'success' | 'info'>(data.error ? 'error' : 'info');
	let otpType = $state<'email-verification' | 'forget-password' | 'sign-in'>('email-verification');

	let setupPassword = $state('');
	let totpURI = $state('');
	let backupCodes = $state<string[]>([]);
	let setupStep = $state<'password' | 'scan' | 'done'>('password');
	let copied = $state(false);

	const RESEND_COOLDOWN_SEC = 60;
	let resendAvailableAt = $state(0);
	let cooldownNow = $state(Date.now());

	const redirectTo = $derived(data.redirectTo || '/');
	const resendSecondsLeft = $derived(
		Math.max(0, Math.ceil((resendAvailableAt - cooldownNow) / 1000))
	);
	const canResend = $derived(resendSecondsLeft === 0 && !pending);

	const titles: Record<View, { title: string; subtitle: string; icon: Component }> = {
		'sign-in': {
			title: 'Welcome back',
			subtitle: 'Sign in to continue to project12f',
			icon: LucideLock
		},
		'sign-up': {
			title: 'Create account',
			subtitle: 'Verify with a one-time code — takes about a minute',
			icon: LucideUserPlus
		},
		forgot: {
			title: 'Forgot password',
			subtitle: 'We’ll email a one-time code to reset it',
			icon: LucideKeyRound
		},
		reset: {
			title: 'Set new password',
			subtitle: 'Choose a strong password for your account',
			icon: LucideKeyRound
		},
		otp: {
			title: 'Enter verification code',
			subtitle: 'Check your inbox for the 6-digit code',
			icon: LucideMail
		},
		'two-factor': {
			title: 'Two-factor check',
			subtitle: 'Confirm it’s you with your authenticator',
			icon: LucideFingerprint
		},
		'setup-2fa': {
			title: 'Enable two-factor',
			subtitle: 'Protect your account with an authenticator app',
			icon: LucideQrCode
		}
	};

	const meta = $derived({
		...titles[view],
		subtitle:
			view === 'reset' && !data.token
				? 'Enter the code from your email, then a new password'
				: titles[view].subtitle
	});
	const Icon = $derived(meta.icon);
	const qrSrc = $derived(
		totpURI
			? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpURI)}`
			: ''
	);

	function setView(next: View, opts?: { email?: string; clearMessage?: boolean }) {
		view = next;
		if (opts?.email != null) email = opts.email;
		if (opts?.clearMessage !== false) message = '';
		const url = new URL(page.url);
		url.searchParams.set('view', next);
		if (email) url.searchParams.set('email', email);
		else url.searchParams.delete('email');
		if (data.token) url.searchParams.set('token', data.token);
		void goto(`${url.pathname}${url.search}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
			invalidateAll: false
		});
	}

	function startResendCooldown(seconds = RESEND_COOLDOWN_SEC) {
		resendAvailableAt = Date.now() + seconds * 1000;
		cooldownNow = Date.now();
		otp = '';
	}

	function show(text: string, tone: 'error' | 'success' | 'info' = 'info') {
		message = text;
		messageTone = tone;
	}

	function fail(msg: string) {
		show(msg || 'Something went wrong. Please try again.', 'error');
	}

	async function onSignIn(e?: Event) {
		e?.preventDefault();
		if (pending) return;
		const em = email.trim();
		if (!em || !password) {
			fail('Enter your email and password to sign in.');
			return;
		}
		pending = true;
		show('Signing in…', 'info');
		try {
			const result = await authApi.signInEmail(em, password, redirectTo);
			if (!result.ok) {
				const code = (result.code || '').toUpperCase();
				const lower = result.message.toLowerCase();
				if (
					code.includes('EMAIL_NOT_VERIFIED') ||
					lower.includes('not verified') ||
					lower.includes('email verification')
				) {
					const sent = await authApi.sendEmailOtp(em, 'email-verification');
					otpType = 'email-verification';
					startResendCooldown();
					setView('otp', { email: em, clearMessage: false });
					show(
						sent.ok
							? 'Verify your email with the code we just sent.'
							: 'Email not verified. Use Resend if you need a new code.',
						'info'
					);
					return;
				}
				fail(result.message);
				return;
			}
			if (result.data?.twoFactorRedirect) {
				setView('two-factor', { email: em, clearMessage: false });
				show('Enter your authenticator code to continue.', 'info');
				return;
			}
			show('Signed in. Redirecting…', 'success');
			window.location.assign(redirectTo);
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Sign in failed.');
		} finally {
			pending = false;
		}
	}

	async function onSignUp(e?: Event) {
		e?.preventDefault();
		if (pending) return;
		if (password !== confirmPassword) {
			fail('Passwords do not match');
			return;
		}
		pending = true;
		show('Creating account…', 'info');
		try {
			const result = await authApi.signUpEmail({
				name: name.trim(),
				email: email.trim(),
				password,
				callbackURL: redirectTo
			});
			if (!result.ok) {
				fail(result.message);
				return;
			}
			otpType = 'email-verification';
			startResendCooldown();
			setView('otp', { email: email.trim(), clearMessage: false });
			show('Account created. Enter the OTP we sent you.', 'success');
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Sign up failed.');
		} finally {
			pending = false;
		}
	}

	async function onForgot(e?: Event) {
		e?.preventDefault();
		if (pending) return;
		if (!email.trim()) {
			fail('Enter your email address.');
			return;
		}
		pending = true;
		show('Sending reset code…', 'info');
		try {
			const result = await authApi.requestPasswordResetOtp(email.trim());
			if (!result.ok) {
				fail(result.message);
				return;
			}
			otpType = 'forget-password';
			otp = '';
			password = '';
			confirmPassword = '';
			startResendCooldown();
			setView('reset', { email: email.trim(), clearMessage: false });
			show('If that email exists, an OTP is on the way.', 'success');
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Could not send reset code.');
		} finally {
			pending = false;
		}
	}

	async function onVerifyOtp(e?: Event) {
		e?.preventDefault();
		if (pending || otp.length < 6) return;
		pending = true;
		show('Verifying code…', 'info');
		try {
			const result = await authApi.verifyEmailOtp(email.trim(), otp);
			if (!result.ok) {
				fail(result.message);
				return;
			}
			show('Verified. Redirecting…', 'success');
			window.location.assign(redirectTo);
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Verification failed.');
		} finally {
			pending = false;
		}
	}

	async function onResendOtp() {
		if (!canResend) return;
		pending = true;
		show('Sending a new code…', 'info');
		try {
			const res = await fetch('/api/auth/resend-otp', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					type: otpType === 'forget-password' ? 'forget-password' : 'email-verification'
				})
			});
			const payload = (await res.json().catch(() => ({}))) as {
				error?: string;
				retryAfter?: number;
				cooldown?: number;
			};
			if (res.status === 429) {
				startResendCooldown(payload.retryAfter || payload.cooldown || RESEND_COOLDOWN_SEC);
				show(payload.error || 'Please wait before requesting another code.', 'info');
				return;
			}
			if (!res.ok) {
				fail(payload.error || 'Could not resend code.');
				return;
			}
			startResendCooldown(payload.cooldown || RESEND_COOLDOWN_SEC);
			show('Previous code expired. A new code was sent.', 'success');
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Could not resend code.');
		} finally {
			pending = false;
		}
	}

	async function onResetPassword(e?: Event) {
		e?.preventDefault();
		if (pending) return;
		if (password !== confirmPassword) {
			fail('Passwords do not match');
			return;
		}
		pending = true;
		show('Updating password…', 'info');
		try {
			if (data.token) {
				const res = await fetch('/api/auth/reset-password', {
					method: 'POST',
					credentials: 'include',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ newPassword: password, token: data.token })
				});
				const body = (await res.json().catch(() => ({}))) as { message?: string };
				if (!res.ok) {
					fail(body.message || 'Could not reset password.');
					return;
				}
			} else {
				const result = await authApi.resetPasswordWithOtp(email.trim(), otp, password);
				if (!result.ok) {
					fail(result.message);
					return;
				}
			}
			password = '';
			confirmPassword = '';
			otp = '';
			setView('sign-in', { clearMessage: false });
			show('Password updated. Sign in with your new password.', 'success');
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Could not reset password.');
		} finally {
			pending = false;
		}
	}

	async function onTwoFactor(e?: Event) {
		e?.preventDefault();
		if (pending) return;
		pending = true;
		show('Verifying…', 'info');
		try {
			const result = useBackup
				? await authApi.verifyBackupCode(backupCode)
				: await authApi.verifyTotp(totpCode);
			if (!result.ok) {
				fail(result.message);
				return;
			}
			show('Verified. Redirecting…', 'success');
			window.location.assign(redirectTo);
		} catch (err) {
			fail(err instanceof Error ? err.message : '2FA verification failed.');
		} finally {
			pending = false;
		}
	}

	async function onEnable2fa(e?: Event) {
		e?.preventDefault();
		if (pending) return;
		pending = true;
		show('Generating setup…', 'info');
		try {
			const result = await authApi.enableTwoFactor(setupPassword);
			if (!result.ok) {
				fail(result.message);
				return;
			}
			totpURI = result.data?.totpURI ?? '';
			backupCodes = result.data?.backupCodes ?? [];
			setupStep = 'scan';
			show('Scan the QR code, then enter a code from your app.', 'info');
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Could not enable 2FA.');
		} finally {
			pending = false;
		}
	}

	async function onConfirm2fa(e?: Event) {
		e?.preventDefault();
		if (pending) return;
		pending = true;
		show('Confirming…', 'info');
		try {
			const result = await authApi.verifyTotp(totpCode, false);
			if (!result.ok) {
				fail(result.message);
				return;
			}
			setupStep = 'done';
			show('Two-factor authentication is on.', 'success');
		} catch (err) {
			fail(err instanceof Error ? err.message : 'Could not confirm 2FA.');
		} finally {
			pending = false;
		}
	}

	async function copyBackupCodes() {
		try {
			await navigator.clipboard.writeText(backupCodes.join('\n'));
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			fail('Could not copy — select the codes manually.');
		}
	}

	function sanitizeOtp(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const next = el.value.replace(/\D/g, '').slice(0, 6);
		otp = next;
		el.value = next;
		if (next.length === 6 && !pending) void onVerifyOtp();
	}

	$effect(() => {
		if (data.token) view = 'reset';
		else if (data.view) view = data.view as View;
	});

	$effect(() => {
		if (resendAvailableAt <= Date.now()) return;
		const id = setInterval(() => {
			cooldownNow = Date.now();
		}, 250);
		return () => clearInterval(id);
	});
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	title="Sign in"
	description="Sign in to project12f to access private tools, utilities, and your account. Secure email OTP and optional two-factor authentication."
	path="/auth"
	robots="noindex,nofollow"
/>

<AuthToast text={message} tone={messageTone} onclose={() => (message = '')} />

<div class="auth-shell relative min-h-screen overflow-hidden bg-base-100">
	<div
		class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(246,36,64,0.2),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(40,50,80,0.35),transparent_48%)]"
	></div>
	<div
		class="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="pointer-events-none absolute -right-16 bottom-0 size-96 rounded-full bg-base-300/40 blur-3xl"
	></div>

	<div class="relative mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
		<section
			class="auth-brand relative hidden flex-col justify-between overflow-hidden border-r border-base-300/50 p-10 lg:flex"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-base-200/90 via-base-100 to-base-300/30"></div>
			<div
				class="absolute inset-0 opacity-[0.07]"
				style="background-image: linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px); background-size: 48px 48px;"
			></div>

			<div class="relative z-10">
				<a href="/" class="inline-flex items-center gap-3 transition hover:opacity-90">
					<img src={favicon} alt="" class="size-9" />
					<span class="text-xl font-bold tracking-tight">project12f</span>
				</a>
			</div>

			<div class="relative z-10 max-w-md space-y-6">
				<div class="badge badge-primary badge-outline gap-1.5 py-3">
					<LucideSparkles class="size-3.5" />
					Secure access
				</div>
				<h1 class="text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">
					project12f
					<span class="mt-2 block text-primary">Sign in once. Manage everything.</span>
				</h1>
				<p class="text-base leading-relaxed text-base-content/70">
					Modern account security — email OTP, password reset, and authenticator 2FA — aligned with
					how you actually ship private tools.
				</p>
				<ul class="space-y-3 text-sm text-base-content/80">
					<li class="flex items-center gap-3">
						<span class="rounded-box bg-primary/15 p-2 text-primary"
							><LucideShieldCheck class="size-4" /></span
						>
						OTP email verification on signup
					</li>
					<li class="flex items-center gap-3">
						<span class="rounded-box bg-secondary/20 p-2 text-secondary"
							><LucideFingerprint class="size-4" /></span
						>
						TOTP / backup-code two-factor
					</li>
					<li class="flex items-center gap-3">
						<span class="rounded-box bg-accent/20 p-2 text-accent"
							><LucideKeyRound class="size-4" /></span
						>
						Password reset via email OTP
					</li>
				</ul>
			</div>

			<p class="relative z-10 text-xs text-base-content/45">
				OTP and reset codes are delivered to your email via SMTP.
			</p>
		</section>

		<section class="relative flex items-center justify-center p-6 sm:p-10">
			<div class="auth-form w-full max-w-md">
				<a href="/" class="mb-8 inline-flex items-center gap-2 lg:hidden">
					<img src={favicon} alt="" class="size-8" />
					<span class="font-bold">project12f</span>
				</a>

				{#if view !== 'sign-in' && view !== 'sign-up'}
					<button class="btn btn-ghost btn-sm mb-4 gap-1" onclick={() => setView('sign-in')}>
						<LucideArrowLeft class="size-4" />
						Back to sign in
					</button>
				{/if}

				<div
					class={[
						'rounded-2xl border bg-base-100/85 p-6 shadow-xl backdrop-blur-md sm:p-8',
						view === 'otp'
							? 'border-primary/25 ring-1 ring-primary/15'
							: 'border-base-300/70'
					]}
				>
					<div class="mb-6 flex items-start gap-3">
						<span
							class={[
								'rounded-box p-2.5',
								view === 'otp' ? 'bg-primary text-primary-content' : 'bg-primary/15 text-primary'
							]}
						>
							<Icon class="size-5" />
						</span>
						<div>
							<h2 class="text-2xl font-bold tracking-tight">{meta.title}</h2>
							<p class="mt-0.5 text-sm text-base-content/65">{meta.subtitle}</p>
						</div>
					</div>

					{#if message}
						<div
							role="alert"
							data-testid="auth-alert"
							class={[
								'mb-5 rounded-xl border px-4 py-3 text-sm font-medium',
								messageTone === 'error' && 'border-red-400/50 bg-red-600 text-white',
								messageTone === 'success' && 'border-emerald-400/50 bg-emerald-600 text-white',
								messageTone === 'info' && 'border-sky-400/50 bg-sky-600 text-white'
							]}
						>
							{message}
						</div>
					{/if}

					{#if view === 'sign-in'}
						<form class="space-y-3" novalidate onsubmit={(e) => void onSignIn(e)}>
							<label class="input input-bordered flex w-full items-center gap-2">
								<LucideMail class="size-4 shrink-0 opacity-50" />
								<input
									class="grow"
									type="email"
									name="email"
									placeholder="Email"
									required
									autocomplete="email"
									bind:value={email}
								/>
							</label>
							<PasswordInput bind:value={password} autocomplete="current-password" />
							<div class="flex justify-end">
								<button
									type="button"
									class="link link-hover text-sm"
									onclick={() => setView('forgot')}
								>
									Forgot password?
								</button>
							</div>
							<button
								type="button"
								class="btn btn-primary w-full"
								disabled={pending}
								aria-busy={pending}
								onclick={() => void onSignIn()}
							>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								{pending ? 'Signing in…' : 'Sign in'}
							</button>
						</form>
						<p class="mt-5 text-center text-sm text-base-content/70">
							New here?
							<button class="link link-primary" onclick={() => setView('sign-up')}>
								Create an account
							</button>
						</p>
					{:else if view === 'sign-up'}
						<form class="space-y-3" onsubmit={onSignUp}>
							<label class="input input-bordered flex w-full items-center gap-2">
								<LucideUserPlus class="size-4 opacity-50" />
								<input
									class="grow"
									type="text"
									placeholder="Full name"
									required
									autocomplete="name"
									bind:value={name}
								/>
							</label>
							<label class="input input-bordered flex w-full items-center gap-2">
								<LucideMail class="size-4 opacity-50" />
								<input
									class="grow"
									type="email"
									placeholder="Email"
									required
									autocomplete="email"
									bind:value={email}
								/>
							</label>
							<PasswordInput
								bind:value={password}
								autocomplete="new-password"
								placeholder="Password"
							/>
							<PasswordInput
								bind:value={confirmPassword}
								autocomplete="new-password"
								placeholder="Confirm password"
								name="confirmPassword"
							/>
							<button class="btn btn-primary w-full" disabled={pending}>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								Create account
							</button>
						</form>
						<p class="mt-5 text-center text-sm text-base-content/70">
							Already have an account?
							<button class="link link-primary" onclick={() => setView('sign-in')}>Sign in</button>
						</p>
					{:else if view === 'forgot'}
						<form class="space-y-3" onsubmit={onForgot}>
							<label class="input input-bordered flex w-full items-center gap-2">
								<LucideMail class="size-4 opacity-50" />
								<input
									class="grow"
									type="email"
									placeholder="Email"
									required
									autocomplete="email"
									bind:value={email}
								/>
							</label>
							<button class="btn btn-primary w-full" disabled={pending}>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								Send reset code
							</button>
						</form>
					{:else if view === 'otp'}
						<form class="space-y-6" onsubmit={onVerifyOtp}>
							<div
								class="rounded-box border border-base-300 bg-base-200/60 px-4 py-3 text-center"
							>
								<p class="text-[11px] font-semibold tracking-[0.14em] text-base-content/45 uppercase">
									Code sent to
								</p>
								<p class="mt-1 truncate text-sm font-medium text-base-content">{email}</p>
							</div>

							<div class="flex flex-col items-center gap-3">
								<label class="otp otp-primary otp-lg" aria-label="One-time verification code">
									<span></span>
									<span></span>
									<span></span>
									<span></span>
									<span></span>
									<span></span>
									<input
										type="text"
										autocomplete="one-time-code"
										inputmode="numeric"
										maxlength="6"
										pattern={'[0-9]{6}'}
										required
										value={otp}
										oninput={sanitizeOtp}
									/>
								</label>
								<p class="text-xs text-base-content/50">6-digit code · expires in 5 minutes</p>
							</div>

							<button class="btn btn-primary w-full" disabled={pending || otp.length < 6}>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								Verify & continue
							</button>

							<div class="divider my-0 text-xs text-base-content/40">Didn’t get a code?</div>

							<button
								type="button"
								class="btn btn-ghost btn-sm w-full gap-2"
								disabled={!canResend}
								onclick={onResendOtp}
							>
								<LucideMail class="size-3.5 opacity-70" />
								{#if resendSecondsLeft > 0}
									Resend in {resendSecondsLeft}s
								{:else}
									Resend code
								{/if}
							</button>
						</form>
					{:else if view === 'reset'}
						<form class="space-y-3" onsubmit={onResetPassword}>
							{#if !data.token}
								<p class="text-xs text-base-content/60">
									Resetting password for <strong>{email}</strong>
								</p>
								<div class="flex justify-center py-1">
									<label class="otp otp-primary otp-md" aria-label="Password reset code">
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<input
											type="text"
											autocomplete="one-time-code"
											inputmode="numeric"
											maxlength="6"
											pattern={'[0-9]{6}'}
											required
											value={otp}
											oninput={sanitizeOtp}
										/>
									</label>
								</div>
							{/if}
							<PasswordInput
								bind:value={password}
								autocomplete="new-password"
								placeholder="New password"
							/>
							<PasswordInput
								bind:value={confirmPassword}
								autocomplete="new-password"
								placeholder="Confirm new password"
								name="confirmPassword"
							/>
							<button class="btn btn-primary w-full" disabled={pending}>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								Update password
							</button>
							{#if !data.token}
								<button
									type="button"
									class="btn btn-ghost btn-sm w-full"
									disabled={!canResend}
									onclick={onResendOtp}
								>
									{#if resendSecondsLeft > 0}
										Resend in {resendSecondsLeft}s
									{:else}
										Resend code
									{/if}
								</button>
							{/if}
						</form>
					{:else if view === 'two-factor'}
						<form class="space-y-4" onsubmit={onTwoFactor}>
							<div class="tabs tabs-box w-full">
								<button
									type="button"
									class={['tab grow', !useBackup && 'tab-active']}
									onclick={() => (useBackup = false)}>Authenticator</button
								>
								<button
									type="button"
									class={['tab grow', useBackup && 'tab-active']}
									onclick={() => (useBackup = true)}>Backup code</button
								>
							</div>
							{#if useBackup}
								<input
									class="input input-bordered w-full"
									placeholder="Backup code"
									required
									bind:value={backupCode}
								/>
							{:else}
								<div class="flex justify-center py-1">
									<label class="otp otp-primary otp-lg" aria-label="Authenticator code">
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<input
											type="text"
											autocomplete="one-time-code"
											inputmode="numeric"
											maxlength="6"
											pattern={'[0-9]{6}'}
											required
											value={totpCode}
											oninput={(e) => {
												const el = e.currentTarget;
												totpCode = el.value.replace(/\D/g, '').slice(0, 6);
												el.value = totpCode;
											}}
										/>
									</label>
								</div>
							{/if}
							<button class="btn btn-primary w-full" disabled={pending}>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								Verify & continue
							</button>
						</form>
					{:else if view === 'setup-2fa'}
						{#if data.user?.twoFactorEnabled && setupStep === 'password'}
							<div class="alert alert-success text-sm">
								<span>Two-factor is already enabled for {data.user.email}.</span>
							</div>
							<a class="btn btn-primary w-full" href={redirectTo}>Continue</a>
						{:else if setupStep === 'password'}
							<form class="space-y-3" onsubmit={onEnable2fa}>
								<p class="text-sm text-base-content/70">
									Confirm your password to generate a QR code and backup codes.
								</p>
								<PasswordInput bind:value={setupPassword} autocomplete="current-password" />
								<button class="btn btn-primary w-full" disabled={pending}>
									{#if pending}<span class="loading loading-spinner"></span>{/if}
									Generate authenticator setup
								</button>
							</form>
						{:else if setupStep === 'scan'}
							<form class="space-y-4" onsubmit={onConfirm2fa}>
								{#if qrSrc}
									<div class="flex justify-center">
										<img
											src={qrSrc}
											alt="Authenticator QR code"
											class="rounded-box border border-base-300 bg-white p-2"
											width="180"
											height="180"
										/>
									</div>
								{/if}
								{#if backupCodes.length}
									<div class="rounded-box border border-base-300 bg-base-200/50 p-3">
										<div class="mb-2 flex items-center justify-between gap-2">
											<span class="text-xs font-semibold uppercase tracking-wide opacity-70"
												>Backup codes</span
											>
											<button
												type="button"
												class="btn btn-ghost btn-xs gap-1"
												onclick={copyBackupCodes}
											>
												<LucideCopy class="size-3.5" />
												{copied ? 'Copied' : 'Copy'}
											</button>
										</div>
										<pre
											class="max-h-28 overflow-auto font-mono text-xs leading-relaxed">{backupCodes.join(
												'\n'
											)}</pre>
									</div>
								{/if}
								<div class="flex justify-center py-1">
									<label class="otp otp-primary otp-lg" aria-label="Confirm authenticator code">
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<span></span>
										<input
											type="text"
											autocomplete="one-time-code"
											inputmode="numeric"
											maxlength="6"
											pattern={'[0-9]{6}'}
											required
											value={totpCode}
											oninput={(e) => {
												const el = e.currentTarget;
												totpCode = el.value.replace(/\D/g, '').slice(0, 6);
												el.value = totpCode;
											}}
										/>
									</label>
								</div>
								<button class="btn btn-primary w-full" disabled={pending || totpCode.length < 6}>
									{#if pending}<span class="loading loading-spinner"></span>{/if}
									Confirm & enable
								</button>
							</form>
						{:else}
							<div class="space-y-4 text-center">
								<span
									class="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success"
								>
									<LucideShieldCheck class="size-7" />
								</span>
								<p class="text-sm text-base-content/70">
									You’re set. Keep those backup codes somewhere safe.
								</p>
								<a class="btn btn-primary w-full" href={redirectTo}>Continue</a>
							</div>
						{/if}
					{/if}
				</div>

				{#if view === 'sign-in'}
					<p class="mt-4 text-center text-xs text-base-content/50">
						After signing in, enable 2FA at
						<a class="link link-hover" href="/auth?view=setup-2fa">/auth?view=setup-2fa</a>
					</p>
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	.auth-brand,
	.auth-form {
		animation: auth-rise 0.55s ease-out both;
	}
	.auth-form {
		animation-delay: 0.08s;
	}
	@keyframes auth-rise {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>

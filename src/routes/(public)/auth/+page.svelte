<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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
	import { authClient } from '$lib/auth-client';
	import PasswordInput from '$lib/component/auth/PasswordInput.svelte';
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

	const redirectTo = $derived(data.redirectTo || '/sudoer');

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
			subtitle: 'Check your inbox (or server console in dev)',
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
		if (opts?.clearMessage !== false) {
			message = '';
		}
		const url = new URL(page.url);
		url.searchParams.set('view', next);
		if (email) url.searchParams.set('email', email);
		else url.searchParams.delete('email');
		if (data.token) url.searchParams.set('token', data.token);
		history.replaceState({}, '', url);
	}

	function fail(err: unknown) {
		const e = err as { message?: string; error?: { message?: string }; status?: number };
		message = e?.error?.message || e?.message || 'Something went wrong';
		messageTone = 'error';
	}

	function isUnverified(err: unknown) {
		const msg = String(
			(err as { error?: { message?: string }; message?: string })?.error?.message ||
				(err as { message?: string })?.message ||
				''
		).toLowerCase();
		return msg.includes('not verified') || msg.includes('email verification');
	}

	async function onSignIn(e: Event) {
		e.preventDefault();
		pending = true;
		message = '';
		try {
			const { error } = await authClient.signIn.email({
				email,
				password,
				callbackURL: redirectTo
			});
			if (error) throw error;
			await goto(redirectTo);
		} catch (err) {
			if (isUnverified(err)) {
				try {
					await authClient.emailOtp.sendVerificationOtp({
						email,
						type: 'email-verification'
					});
					otpType = 'email-verification';
					message = 'Verify your email with the code we just sent.';
					messageTone = 'info';
					setView('otp', { email, clearMessage: false });
					return;
				} catch (sendErr) {
					fail(sendErr);
					return;
				}
			}
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onSignUp(e: Event) {
		e.preventDefault();
		if (password !== confirmPassword) {
			message = 'Passwords do not match';
			messageTone = 'error';
			return;
		}
		pending = true;
		message = '';
		try {
			const { error } = await authClient.signUp.email({
				name,
				email,
				password,
				callbackURL: redirectTo
			});
			if (error) throw error;
			otpType = 'email-verification';
			message = 'Account created. Enter the OTP we sent you.';
			messageTone = 'success';
			setView('otp', { email, clearMessage: false });
		} catch (err) {
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onForgot(e: Event) {
		e.preventDefault();
		pending = true;
		message = '';
		try {
			const { error } = await authClient.emailOtp.requestPasswordReset({ email });
			if (error) throw error;
			otpType = 'forget-password';
			otp = '';
			password = '';
			confirmPassword = '';
			message = 'If that email exists, an OTP is on the way.';
			messageTone = 'success';
			setView('reset', { email, clearMessage: false });
		} catch (err) {
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onVerifyOtp(e: Event) {
		e.preventDefault();
		pending = true;
		message = '';
		try {
			const { error } = await authClient.emailOtp.verifyEmail({
				email,
				otp
			});
			if (error) throw error;
			await goto(redirectTo);
		} catch (err) {
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onResendOtp() {
		pending = true;
		message = '';
		try {
			if (otpType === 'forget-password') {
				const { error } = await authClient.emailOtp.requestPasswordReset({ email });
				if (error) throw error;
			} else {
				const { error } = await authClient.emailOtp.sendVerificationOtp({
					email,
					type: 'email-verification'
				});
				if (error) throw error;
			}
			message = 'A new code was sent.';
			messageTone = 'success';
		} catch (err) {
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onResetPassword(e: Event) {
		e.preventDefault();
		if (password !== confirmPassword) {
			message = 'Passwords do not match';
			messageTone = 'error';
			return;
		}
		pending = true;
		message = '';
		try {
			if (data.token) {
				const { error } = await authClient.resetPassword({
					newPassword: password,
					token: data.token
				});
				if (error) throw error;
			} else {
				const { error } = await authClient.emailOtp.resetPassword({
					email,
					otp,
					password
				});
				if (error) throw error;
			}
			message = 'Password updated. Sign in with your new password.';
			messageTone = 'success';
			password = '';
			confirmPassword = '';
			otp = '';
			setView('sign-in', { clearMessage: false });
		} catch (err) {
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onTwoFactor(e: Event) {
		e.preventDefault();
		pending = true;
		message = '';
		try {
			if (useBackup) {
				const { error } = await authClient.twoFactor.verifyBackupCode({
					code: backupCode,
					trustDevice: true
				});
				if (error) throw error;
			} else {
				const { error } = await authClient.twoFactor.verifyTotp({
					code: totpCode,
					trustDevice: true
				});
				if (error) throw error;
			}
			await goto(redirectTo);
		} catch (err) {
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onEnable2fa(e: Event) {
		e.preventDefault();
		pending = true;
		message = '';
		try {
			const { data: result, error } = await authClient.twoFactor.enable({
				password: setupPassword
			});
			if (error) throw error;
			totpURI = result?.totpURI ?? '';
			backupCodes = result?.backupCodes ?? [];
			setupStep = 'scan';
			message = 'Scan the QR code, then enter a code from your app.';
			messageTone = 'info';
		} catch (err) {
			fail(err);
		} finally {
			pending = false;
		}
	}

	async function onConfirm2fa(e: Event) {
		e.preventDefault();
		pending = true;
		message = '';
		try {
			const { error } = await authClient.twoFactor.verifyTotp({
				code: totpCode
			});
			if (error) throw error;
			setupStep = 'done';
			message = 'Two-factor authentication is on.';
			messageTone = 'success';
		} catch (err) {
			fail(err);
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
			message = 'Could not copy — select the codes manually.';
			messageTone = 'error';
		}
	}

	$effect(() => {
		if (data.token) view = 'reset';
		else if (data.view) view = data.view as View;
	});
</script>

<svelte:head>
	<title>Auth · project12f</title>
</svelte:head>

<div class="auth-shell relative min-h-full overflow-hidden bg-base-100">
	<div
		class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(246,36,64,0.2),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(40,50,80,0.35),transparent_48%)]"
	></div>
	<div
		class="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="pointer-events-none absolute -right-16 bottom-0 size-96 rounded-full bg-base-300/40 blur-3xl"
	></div>

	<div class="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl lg:grid-cols-2">
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
				Dev tip: without SMTP, codes print in the server console.
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

				<div class="rounded-2xl border border-base-300/70 bg-base-100/85 p-6 shadow-xl backdrop-blur-md sm:p-8">
					<div class="mb-6 flex items-start gap-3">
						<span class="rounded-box bg-primary/15 p-2.5 text-primary">
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
							class={[
								'alert mb-5 text-sm',
								messageTone === 'error' && 'alert-error',
								messageTone === 'success' && 'alert-success',
								messageTone === 'info' && 'alert-info'
							]}
						>
							<span>{message}</span>
						</div>
					{/if}

					{#if view === 'sign-in'}
						<form class="space-y-3" onsubmit={onSignIn}>
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
							<button class="btn btn-primary w-full" disabled={pending}>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								Sign in
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
						<form class="space-y-4" onsubmit={onVerifyOtp}>
							<p class="text-sm text-base-content/70">
								Code sent to <span class="font-medium text-base-content">{email}</span>
							</p>
							<input
								class="input input-bordered input-lg w-full text-center tracking-[0.4em]"
								inputmode="numeric"
								autocomplete="one-time-code"
								maxlength="6"
								placeholder="••••••"
								required
								bind:value={otp}
							/>
							<button class="btn btn-primary w-full" disabled={pending || otp.length < 6}>
								{#if pending}<span class="loading loading-spinner"></span>{/if}
								Verify code
							</button>
							<button
								type="button"
								class="btn btn-ghost btn-sm w-full"
								disabled={pending}
								onclick={onResendOtp}
							>
								Resend code
							</button>
						</form>
					{:else if view === 'reset'}
						<form class="space-y-3" onsubmit={onResetPassword}>
							{#if !data.token}
								<p class="text-xs text-base-content/60">
									Resetting password for <strong>{email}</strong>
								</p>
								<input
									class="input input-bordered input-lg w-full text-center tracking-[0.4em]"
									inputmode="numeric"
									autocomplete="one-time-code"
									maxlength="6"
									placeholder="OTP code"
									required
									bind:value={otp}
								/>
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
									disabled={pending}
									onclick={onResendOtp}
								>
									Resend code
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
								<input
									class="input input-bordered input-lg w-full text-center tracking-[0.35em]"
									inputmode="numeric"
									autocomplete="one-time-code"
									maxlength="6"
									placeholder="000000"
									required
									bind:value={totpCode}
								/>
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
								<input
									class="input input-bordered input-lg w-full text-center tracking-[0.35em]"
									inputmode="numeric"
									autocomplete="one-time-code"
									maxlength="6"
									placeholder="000000"
									required
									bind:value={totpCode}
								/>
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

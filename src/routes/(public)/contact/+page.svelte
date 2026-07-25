<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideBug,
		LucideHandshake,
		LucideMail,
		LucideMessageSquare,
		LucideNewspaper
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'Contact';
	const description =
		'Contact project12f for support, partnerships, press, and product feedback. We read every message.';

	let name = $state('');
	let email = $state('');
	let topic = $state<'general' | 'support' | 'press' | 'partnership' | 'careers'>('general');
	let message = $state('');
	let submitted = $state(false);

	const topics = [
		{ id: 'general' as const, label: 'General' },
		{ id: 'support' as const, label: 'Product support' },
		{ id: 'press' as const, label: 'Press & media' },
		{ id: 'partnership' as const, label: 'Partnership' },
		{ id: 'careers' as const, label: 'Careers' }
	];

	const channels = [
		{
			Icon: LucideMail,
			title: 'Email',
			body: 'hello@project12f.zarnihlawn.com',
			hint: 'Best for most requests. We aim to reply within 2 business days.'
		},
		{
			Icon: LucideNewspaper,
			title: 'Press',
			body: 'press@project12f.zarnihlawn.com',
			hint: 'Interviews, logos, and product facts — also see the Press kit.'
		},
		{
			Icon: LucideBug,
			title: 'Bugs & tools',
			body: 'Describe the utility, browser, and steps to reproduce.',
			hint: 'Screenshots help. Image tools run in-browser — include format and file size if relevant.'
		}
	];

	function onSubmit(e: Event) {
		e.preventDefault();
		const subject = encodeURIComponent(`[project12f] ${topic} — ${name || 'Inquiry'}`);
		const body = encodeURIComponent(
			`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`
		);
		window.location.href = `mailto:hello@project12f.zarnihlawn.com?subject=${subject}&body=${body}`;
		submitted = true;
	}
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/contact"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/contact',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Contact', path: '/contact' }
		])
	]}
/>

<CompanyPageShell
	{title}
	lead="Whether you need help with an image utility, want to partner, or are writing about project12f — reach out. We keep the channel human."
>
	<section class="grid gap-4 md:grid-cols-3">
		{#each channels as ch}
			{@const Icon = ch.Icon}
			<article class="rounded-box border border-base-300 bg-base-100 p-5">
				<div class="mb-3 inline-flex rounded-box bg-primary/10 p-2 text-primary">
					<Icon class="size-4" />
				</div>
				<h2 class="font-semibold">{ch.title}</h2>
				<p class="mt-1 break-all text-sm font-medium text-primary">{ch.body}</p>
				<p class="mt-2 text-xs leading-relaxed text-base-content/65">{ch.hint}</p>
			</article>
		{/each}
	</section>

	<section class="grid gap-8 lg:grid-cols-5">
		<div class="space-y-4 lg:col-span-2">
			<h2 class="flex items-center gap-2 text-xl font-semibold">
				<LucideMessageSquare class="size-5 text-primary" />
				Send a message
			</h2>
			<p class="text-sm leading-relaxed text-base-content/70">
				The form opens your email client with a pre-filled draft. Nothing is stored on our servers
				from this page. Prefer not to use mailto? Copy the address above and write from your inbox.
			</p>
			<div class="rounded-box border border-base-300 bg-base-100 p-4 text-sm">
				<p class="font-medium">Response times</p>
				<ul class="mt-2 list-inside list-disc space-y-1 text-base-content/70">
					<li>Support: typically within 2 business days</li>
					<li>Press: same day when possible on weekdays</li>
					<li>Partnerships: up to one week for a thoughtful reply</li>
				</ul>
			</div>
			<a class="link link-primary text-sm" href={resolve('/(public)/press')}>Need logos? Press kit →</a>
		</div>

		<form
			class="card border border-base-300 bg-base-100 shadow-sm lg:col-span-3"
			onsubmit={onSubmit}
		>
			<div class="card-body gap-4">
				<label class="form-control w-full">
					<span class="label-text text-xs">Your name</span>
					<input
						class="input input-bordered w-full"
						bind:value={name}
						required
						autocomplete="name"
						placeholder="Alex Rivera"
					/>
				</label>
				<label class="form-control w-full">
					<span class="label-text text-xs">Email</span>
					<input
						type="email"
						class="input input-bordered w-full"
						bind:value={email}
						required
						autocomplete="email"
						placeholder="you@company.com"
					/>
				</label>
				<label class="form-control w-full">
					<span class="label-text text-xs">Topic</span>
					<select class="select select-bordered w-full" bind:value={topic}>
						{#each topics as t}
							<option value={t.id}>{t.label}</option>
						{/each}
					</select>
				</label>
				<label class="form-control w-full">
					<span class="label-text text-xs">Message</span>
					<textarea
						class="textarea textarea-bordered min-h-36 w-full"
						bind:value={message}
						required
						placeholder="What should we know?"
					></textarea>
				</label>
				{#if submitted}
					<div class="alert alert-success text-sm">
						Opening your mail app… If nothing happened, email hello@project12f.zarnihlawn.com
						directly.
					</div>
				{/if}
				<div class="card-actions justify-end">
					<button type="submit" class="btn btn-primary">
						<LucideHandshake class="size-4" />
						Compose email
					</button>
				</div>
			</div>
		</form>
	</section>

	<section class="rounded-box border border-base-300 bg-base-100 p-6">
		<h2 class="text-lg font-semibold">Before you write</h2>
		<ul class="mt-3 space-y-2 text-sm text-base-content/75">
			<li>
				<span class="font-medium text-base-content">Account / OTP issues:</span> include the email you
				used to sign in (never send passwords or one-time codes in chat elsewhere).
			</li>
			<li>
				<span class="font-medium text-base-content">Tool bugs:</span> browser + OS, which utility, and
				whether it fails on a specific format.
			</li>
			<li>
				<span class="font-medium text-base-content">Feature ideas:</span> welcome — tell us the
				workflow you are trying to finish, not only the button you wish existed.
			</li>
		</ul>
	</section>
</CompanyPageShell>

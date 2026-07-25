<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/asset/favicon.svg';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { SITE } from '$lib/seo/site';
	import { breadcrumbJsonLd, organizationJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import { LucideCopy, LucideDownload, LucidePalette, LucideQuote } from '@lucide/svelte';

	let { data } = $props();

	const title = 'Press kit';
	const description =
		'Official project12f press kit — brand story, logos, colors, boilerplate, and media contact.';

	const colors = [
		{ name: 'Signal red', hex: '#F62440', usage: 'Brand accent, CTAs, key highlights' },
		{ name: 'Ink', hex: '#0B0B0C', usage: 'Dark surfaces / immersive tools' },
		{ name: 'Fog', hex: '#A1A1AA', usage: 'Secondary text on dark UI' },
		{ name: 'Paper', hex: '#FAFAFA', usage: 'Light surfaces / documents' }
	];

	const boilerplate = `project12f (PROJECT 12F) builds browser-first utilities and private tools. Its public image suite includes conversion, compression, Retouch (quick edits), and a layered Editor — designed for speed, clarity, and workflows that stay on the user’s device when possible.`;

	const facts = [
		{ label: 'Brand', value: SITE.displayName },
		{ label: 'Product name', value: SITE.name },
		{ label: 'Site', value: 'project12f.zarnihlawn.com' },
		{ label: 'Focus', value: 'Image utilities, accounts, private ops tools' },
		{ label: 'Media email', value: 'press@project12f.zarnihlawn.com' }
	];

	let copied = $state(false);

	async function copyBoilerplate() {
		try {
			await navigator.clipboard.writeText(boilerplate);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	function downloadSvg() {
		const a = document.createElement('a');
		a.href = favicon;
		a.download = 'project12f-mark.svg';
		a.click();
	}
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/press"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/press',
			title,
			description
		}),
		organizationJsonLd(data.siteOrigin),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Press kit', path: '/press' }
		])
	]}
/>

<CompanyPageShell
	{title}
	lead="Everything journalists, partners, and creators need to mention project12f accurately — story, assets, colors, and contacts."
>
	<section class="rounded-box border border-base-300 bg-base-100 p-6 md:p-8">
		<div class="flex items-start gap-3">
			<span class="rounded-box bg-primary/10 p-2 text-primary">
				<LucideQuote class="size-5" />
			</span>
			<div class="space-y-3">
				<h2 class="text-xl font-semibold">Brand story</h2>
				<p class="leading-relaxed text-base-content/75">
					{boilerplate}
				</p>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => void copyBoilerplate()}>
					<LucideCopy class="size-4" />
					{copied ? 'Copied' : 'Copy boilerplate'}
				</button>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Quick facts</h2>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
			<table class="table">
				<tbody>
					{#each facts as f}
						<tr>
							<th class="w-40 whitespace-nowrap text-base-content/60">{f.label}</th>
							<td class="font-medium">{f.value}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Logo & mark</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<article class="rounded-box border border-base-300 bg-base-100 p-6">
				<p class="mb-4 text-xs font-semibold uppercase tracking-wide text-base-content/50"
					>On light</p
				>
				<div class="flex min-h-36 items-center justify-center rounded-box bg-base-200 p-8">
					<div class="flex items-center gap-3">
						<img src={favicon} alt="project12f mark" class="size-14" />
						<span class="text-2xl font-black tracking-tight text-[#F62440]">PROJECT 12F</span>
					</div>
				</div>
			</article>
			<article class="rounded-box border border-base-300 bg-neutral p-6 text-neutral-content">
				<p class="mb-4 text-xs font-semibold uppercase tracking-wide opacity-60">On dark</p>
				<div class="flex min-h-36 items-center justify-center rounded-box bg-black/40 p-8">
					<div class="flex items-center gap-3">
						<img src={favicon} alt="" class="size-14" />
						<span class="text-2xl font-black tracking-tight text-[#F62440]">PROJECT 12F</span>
					</div>
				</div>
			</article>
		</div>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn btn-primary btn-sm" onclick={downloadSvg}>
				<LucideDownload class="size-4" />
				Download SVG mark
			</button>
			<a class="btn btn-ghost btn-sm" href={resolve('/(public)/contact')}>Request PNG / higher-res</a>
		</div>
		<ul class="list-inside list-disc space-y-1 text-sm text-base-content/70">
			<li>Do not stretch, recolor the wordmark away from brand red without approval, or add effects.</li>
			<li>Keep clear space around the mark roughly equal to the height of the “12”.</li>
			<li>Prefer the full <strong>PROJECT 12F</strong> lockup in editorial; <strong>project12f</strong> in product UI.</li>
		</ul>
	</section>

	<section class="space-y-4">
		<h2 class="flex items-center gap-2 text-xl font-semibold">
			<LucidePalette class="size-5 text-primary" />
			Colors
		</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each colors as c}
				<article class="flex overflow-hidden rounded-box border border-base-300 bg-base-100">
					<div class="w-20 shrink-0" style="background:{c.hex}"></div>
					<div class="p-4">
						<p class="font-semibold">{c.name}</p>
						<p class="font-mono text-sm text-primary">{c.hex}</p>
						<p class="mt-1 text-xs text-base-content/65">{c.usage}</p>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Product naming</h2>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Use</th>
						<th>Preferred</th>
						<th>Avoid</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Company / brand</td>
						<td>PROJECT 12F or project12f</td>
						<td>Project Twelve F, P12F alone in headlines</td>
					</tr>
					<tr>
						<td>Quick editor</td>
						<td>Retouch</td>
						<td>“Photoshop lite”, “mini editor” as the proper name</td>
					</tr>
					<tr>
						<td>Full editor</td>
						<td>Image Editor / Editor</td>
						<td>Claiming Adobe parity in headlines</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="rounded-box border border-primary/30 bg-primary/5 p-6 md:p-8">
		<h2 class="text-xl font-semibold">Media contact</h2>
		<p class="mt-2 text-sm leading-relaxed text-base-content/75">
			For interviews, screenshots, or embargoed notes:
			<a class="link link-primary" href="mailto:press@project12f.zarnihlawn.com"
				>press@project12f.zarnihlawn.com</a
			>
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<a class="btn btn-primary btn-sm" href={resolve('/(public)/contact')}>Contact form</a>
			<a class="btn btn-ghost btn-sm" href={resolve('/(public)/about')}>About us</a>
		</div>
	</section>
</CompanyPageShell>

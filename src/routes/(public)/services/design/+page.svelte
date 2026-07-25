<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideArrowRight,
		LucideComponent,
		LucideLayoutTemplate,
		LucideMousePointer2,
		LucideSmartphone,
		LucideSparkles
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'Design';
	const description =
		'project12f product and visual design — UI systems, tool interfaces, landing pages, and design-to-code collaboration.';

	const offerings = [
		{
			Icon: LucideLayoutTemplate,
			title: 'Product UI',
			body: 'Dense tool surfaces: panels, toolbars, empty states, and keyboard-first flows that stay calm under load.'
		},
		{
			Icon: LucideComponent,
			title: 'Design systems',
			body: 'Tokens, components, and DaisyUI-aligned patterns so marketing and app UI share one language.'
		},
		{
			Icon: LucideSmartphone,
			title: 'Responsive & motion',
			body: 'Layouts that work on phone and ultrawide; intentional motion for hierarchy — not decoration noise.'
		},
		{
			Icon: LucideMousePointer2,
			title: 'Prototypes',
			body: 'Clickable flows for conversion, retouch, or onboarding before engineering commits.'
		}
	];

	const principles = [
		{
			title: 'One job per screen',
			body: 'Especially for utilities: open → act → export. Secondary chrome stays secondary.'
		},
		{
			title: 'Dark-first craft',
			body: 'Contrast, focus rings, and accent color that reads as brand — not generic purple glow.'
		},
		{
			title: 'Ship with engineering',
			body: 'Specs include states (hover, disabled, error) and edge cases (huge images, empty history).'
		}
	];

	const stack = [
		'Svelte / SvelteKit product surfaces',
		'DaisyUI + custom tokens',
		'Figma libraries & redlines',
		'Iconography (Lucide-compatible sets)',
		'Marketing pages that match the app'
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/services/design"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/services/design',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Services', path: '/services' },
			{ name: 'Design', path: '/services/design' }
		])
	]}
/>

<CompanyPageShell
	eyebrow="Services"
	sectionLabel="Services"
	sectionHref="/(public)/services"
	{title}
	lead="Interface design for tools people trust with their files — clear hierarchy, fast paths, and systems that scale from a landing hero to a crop overlay."
>
	<section class="rounded-box border border-base-300 bg-base-100 p-6 md:p-8">
		<div class="flex items-start gap-3">
			<span class="rounded-box bg-primary/10 p-2 text-primary">
				<LucideSparkles class="size-5" />
			</span>
			<div class="space-y-3">
				<h2 class="text-xl font-semibold">Design for makers & operators</h2>
				<p class="leading-relaxed text-base-content/75">
					We design the kind of software project12f ships: conversion wizards, retouch canvases, auth
					gates, and marketing that does not feel like a different company. Expect collaboration in
					PRs and Figma — not throwaway mockups that ignore implementation cost.
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">What we design</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#each offerings as o}
				{@const Icon = o.Icon}
				<article class="rounded-box border border-base-300 bg-base-100 p-5">
					<div class="mb-3 inline-flex rounded-box bg-primary/10 p-2 text-primary">
						<Icon class="size-4" />
					</div>
					<h3 class="font-semibold">{o.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-base-content/70">{o.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Principles</h2>
		<div class="grid gap-4 md:grid-cols-3">
			{#each principles as p}
				<article class="rounded-box border border-base-300 bg-base-100 p-5">
					<h3 class="font-semibold">{p.title}</h3>
					<p class="mt-2 text-sm text-base-content/70">{p.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="grid gap-6 md:grid-cols-2">
		<div class="rounded-box border border-base-300 bg-base-100 p-6">
			<h2 class="text-lg font-semibold">Comfortable stack</h2>
			<ul class="mt-3 list-inside list-disc space-y-2 text-sm text-base-content/75">
				{#each stack as s}
					<li>{s}</li>
				{/each}
			</ul>
		</div>
		<div class="rounded-box border border-primary/30 bg-primary/5 p-6">
			<h2 class="text-lg font-semibold">Start a design engagement</h2>
			<p class="mt-2 text-sm text-base-content/75">
				Share links to your product, competitors you admire, and whether you need a sprint or an
				ongoing retainer.
			</p>
			<a class="btn btn-primary btn-sm mt-4" href={resolve('/(public)/contact')}>
				Contact
				<LucideArrowRight class="size-4" />
			</a>
		</div>
	</section>
</CompanyPageShell>

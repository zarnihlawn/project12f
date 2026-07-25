<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideClapperboard,
		LucideMegaphone,
		LucidePalette,
		LucidePenLine
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'Services';
	const description =
		'project12f services — branding, design, marketing, and advertisement for product teams that ship.';

	const services = [
		{
			href: '/(public)/services/branding' as const,
			Icon: LucideMegaphone,
			title: 'Branding',
			body: 'Strategy, identity systems, naming, and brand kits that survive real product UI.'
		},
		{
			href: '/(public)/services/design' as const,
			Icon: LucidePalette,
			title: 'Design',
			body: 'Product UI, design systems, prototypes, and dark-first craft for tools people use for hours.'
		},
		{
			href: '/(public)/services/marketing' as const,
			Icon: LucidePenLine,
			title: 'Marketing',
			body: 'Positioning, SEO content, launches, and growth loops aimed at technical audiences.'
		},
		{
			href: '/(public)/services/advertisement' as const,
			Icon: LucideClapperboard,
			title: 'Advertisement',
			body: 'Campaign concepts, demos, and media-ready creatives with honest product claims.'
		}
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/services"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/services',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Services', path: '/services' }
		])
	]}
/>

<CompanyPageShell
	eyebrow="Services"
	sectionLabel="Home"
	sectionHref="/(public)/home"
	{title}
	lead="Beyond the free image utilities, project12f partners with teams on brand, product design, marketing, and advertisement — always oriented toward shipping."
>
	<div class="grid gap-4 md:grid-cols-2">
		{#each services as s}
			{@const Icon = s.Icon}
			<a
				href={resolve(s.href)}
				class="card border border-base-300 bg-base-100 shadow-sm transition hover:border-primary/40 hover:shadow-md"
			>
				<div class="card-body">
					<div class="rounded-box bg-primary/10 p-2 text-primary w-fit">
						<Icon class="size-5" />
					</div>
					<h2 class="card-title text-lg">{s.title}</h2>
					<p class="text-sm text-base-content/70">{s.body}</p>
					<div class="card-actions justify-end">
						<span class="btn btn-ghost btn-sm">View details</span>
					</div>
				</div>
			</a>
		{/each}
	</div>

	<section class="rounded-box border border-primary/30 bg-primary/5 p-6">
		<p class="text-sm text-base-content/75">
			Not sure which engagement fits? Start on
			<a class="link link-primary" href={resolve('/(public)/contact')}>Contact</a>
			with your timeline and goals — we will recommend a path.
		</p>
	</section>
</CompanyPageShell>

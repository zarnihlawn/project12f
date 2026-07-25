<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideArrowRight,
		LucideBarChart3,
		LucideMail,
		LucideRadar,
		LucideSearch,
		LucideShare2
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'Marketing';
	const description =
		'project12f marketing services — positioning, content, SEO, launches, and growth loops for product-led tools.';

	const pillars = [
		{
			Icon: LucideRadar,
			title: 'Positioning & messaging',
			body: 'Who it is for, why now, and the one sentence that survives a homepage fold.'
		},
		{
			Icon: LucideSearch,
			title: 'SEO & content',
			body: 'Utility pages that rank and convert: technical clarity, structured data, honest comparisons.'
		},
		{
			Icon: LucideShare2,
			title: 'Launches & social',
			body: 'Ship notes, demos, and channel plans that match how builders actually discover tools.'
		},
		{
			Icon: LucideBarChart3,
			title: 'Funnel & analytics',
			body: 'Instrument what matters: activation into Retouch/Editor, return visits, and drop-offs — without vanity spam.'
		}
	];

	const packages = [
		{
			name: 'Launch kit',
			items: ['Homepage narrative', 'Launch post + thread', 'OG/social assets', 'Changelog template']
		},
		{
			name: 'Growth content',
			items: ['SEO outlines', '2–4 long-form pieces / month', 'Internal linking plan', 'Update cadence']
		},
		{
			name: 'Lifecycle',
			items: ['Onboarding email map', 'In-app nudge copy', 'Re-engagement concepts', 'A/B hypotheses']
		}
	];

	const channels = [
		{ Icon: LucideMail, label: 'Email & lifecycle' },
		{ Icon: LucideSearch, label: 'Organic search' },
		{ Icon: LucideShare2, label: 'Social & community' },
		{ Icon: LucideBarChart3, label: 'Product-led loops' }
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/services/marketing"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/services/marketing',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Services', path: '/services' },
			{ name: 'Marketing', path: '/services/marketing' }
		])
	]}
/>

<CompanyPageShell
	eyebrow="Services"
	sectionLabel="Services"
	sectionHref="/(public)/services"
	{title}
	lead="Marketing that respects technical audiences — clear claims, useful content, and launches that point to working software, not vapor."
>
	<section class="space-y-4">
		<h2 class="text-xl font-semibold">How we help</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#each pillars as p}
				{@const Icon = p.Icon}
				<article class="rounded-box border border-base-300 bg-base-100 p-5">
					<div class="mb-3 inline-flex rounded-box bg-primary/10 p-2 text-primary">
						<Icon class="size-4" />
					</div>
					<h3 class="font-semibold">{p.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-base-content/70">{p.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Engagement shapes</h2>
		<div class="grid gap-4 md:grid-cols-3">
			{#each packages as pkg}
				<article class="rounded-box border border-base-300 bg-base-100 p-5">
					<h3 class="font-semibold">{pkg.name}</h3>
					<ul class="mt-3 list-inside list-disc space-y-1 text-sm text-base-content/70">
						{#each pkg.items as item}
							<li>{item}</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</section>

	<section class="rounded-box border border-base-300 bg-base-100 p-6">
		<h2 class="text-lg font-semibold">Channels we typically touch</h2>
		<div class="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
			{#each channels as c}
				{@const Icon = c.Icon}
				<div class="flex items-center gap-2 rounded-box bg-base-200 px-3 py-2 text-sm">
					<Icon class="size-4 text-primary" />
					{c.label}
				</div>
			{/each}
		</div>
	</section>

	<section class="rounded-box border border-primary/30 bg-primary/5 p-6 md:p-8">
		<h2 class="text-xl font-semibold">Talk marketing</h2>
		<p class="mt-2 max-w-xl text-sm text-base-content/75">
			Bring your current funnel numbers (even rough ones) and the next feature you want the world to
			notice. We will propose a focused plan — not a 40-slide strategy theater.
		</p>
		<a class="btn btn-primary btn-sm mt-4" href={resolve('/(public)/contact')}>
			Contact
			<LucideArrowRight class="size-4" />
		</a>
	</section>
</CompanyPageShell>

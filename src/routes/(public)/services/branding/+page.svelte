<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideArrowRight,
		LucideBookOpen,
		LucideFingerprint,
		LucideMegaphone,
		LucidePalette,
		LucideType
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'Branding';
	const description =
		'project12f branding services — strategy, identity systems, naming, and brand kits built for products that ship.';

	const deliverables = [
		{
			Icon: LucideFingerprint,
			title: 'Brand strategy',
			body: 'Positioning, audience, voice, and the few promises your product should never break.'
		},
		{
			Icon: LucideType,
			title: 'Naming & verbal ID',
			body: 'Product names, taglines, microcopy patterns, and a glossary so teams stop inventing synonyms.'
		},
		{
			Icon: LucidePalette,
			title: 'Visual identity',
			body: 'Mark, lockups, color, type, and rules for dark/light UI — not just a logo PNG.'
		},
		{
			Icon: LucideBookOpen,
			title: 'Brand kit',
			body: 'Guidelines, templates, and export-ready assets your designers and engineers can reuse.'
		}
	];

	const process = [
		{ step: '01', title: 'Discovery', body: 'Workshops or async briefs: market, competitors, constraints, non-negotiables.' },
		{ step: '02', title: 'Direction', body: '2–3 strategic territories with mood and verbal samples before pixels get expensive.' },
		{ step: '03', title: 'System', body: 'Lock the identity: logo constructions, color roles, type scales, do/don’t examples.' },
		{ step: '04', title: 'Handoff', body: 'Figma/files, SVG/PNG packs, and a living guide — plus a press-ready boilerplate if you need it.' }
	];

	const fit = [
		'Startups launching a first public face',
		'Teams rebranding after a pivot',
		'Product suites that need one coherent family (like utilities + editor)',
		'Founders who want identity that survives dark-mode tooling UIs'
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/services/branding"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/services/branding',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Services', path: '/services' },
			{ name: 'Branding', path: '/services/branding' }
		])
	]}
/>

<CompanyPageShell
	eyebrow="Services"
	sectionLabel="Services"
	sectionHref="/(public)/services"
	{title}
	lead="Identity that holds up in a browser chrome, a favicon, and a press quote — not only a slide deck. We build brands for products people actually open every day."
>
	<section class="rounded-box border border-base-300 bg-base-100 p-6 md:p-8">
		<div class="flex items-start gap-3">
			<span class="rounded-box bg-primary/10 p-2 text-primary">
				<LucideMegaphone class="size-5" />
			</span>
			<div class="space-y-3">
				<h2 class="text-xl font-semibold">What branding means here</h2>
				<p class="leading-relaxed text-base-content/75">
					project12f approaches branding as a <strong class="text-base-content">system</strong>: how you
					sound, look, and behave across marketing pages, in-app empty states, and export filenames. We
					tie creative choices to product reality — especially for tools with dense UI and a strong
					accent (like our signal red).
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Deliverables</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#each deliverables as d}
				{@const Icon = d.Icon}
				<article class="rounded-box border border-base-300 bg-base-100 p-5">
					<div class="mb-3 inline-flex rounded-box bg-primary/10 p-2 text-primary">
						<Icon class="size-4" />
					</div>
					<h3 class="font-semibold">{d.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-base-content/70">{d.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Process</h2>
		<ol class="grid gap-3 md:grid-cols-2">
			{#each process as p}
				<li class="rounded-box border border-base-300 bg-base-100 p-5">
					<p class="font-mono text-xs text-primary">{p.step}</p>
					<h3 class="mt-1 font-semibold">{p.title}</h3>
					<p class="mt-2 text-sm text-base-content/70">{p.body}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="grid gap-6 md:grid-cols-2">
		<div class="rounded-box border border-base-300 bg-base-100 p-6">
			<h2 class="text-lg font-semibold">Good fit if you are</h2>
			<ul class="mt-3 list-inside list-disc space-y-2 text-sm text-base-content/75">
				{#each fit as f}
					<li>{f}</li>
				{/each}
			</ul>
		</div>
		<div class="rounded-box border border-primary/30 bg-primary/5 p-6">
			<h2 class="text-lg font-semibold">Start a branding project</h2>
			<p class="mt-2 text-sm text-base-content/75">
				Tell us about your product, timeline, and whether you need a full system or a focused refresh.
			</p>
			<div class="mt-4 flex flex-wrap gap-2">
				<a class="btn btn-primary btn-sm" href={resolve('/(public)/contact')}>
					Contact
					<LucideArrowRight class="size-4" />
				</a>
				<a class="btn btn-ghost btn-sm" href={resolve('/(public)/press')}>See our press kit</a>
			</div>
		</div>
	</section>
</CompanyPageShell>

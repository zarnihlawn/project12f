<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideArrowRight,
		LucideClapperboard,
		LucideImage,
		LucideMonitorPlay,
		LucideTarget,
		LucideWand2
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'Advertisement';
	const description =
		'project12f advertisement services — creative production, campaign concepts, and media-ready assets for product launches.';

	const work = [
		{
			Icon: LucideClapperboard,
			title: 'Campaign concepts',
			body: 'Narrative hooks for launches: problem → demo → CTA, tuned for paid and organic placement.'
		},
		{
			Icon: LucideImage,
			title: 'Static & motion ads',
			body: 'Still frames, short loops, and cutdowns sized for common placements — with brand-safe space.'
		},
		{
			Icon: LucideMonitorPlay,
			title: 'Product demos',
			body: 'Screen captures and storyboards that show Retouch/Editor/utility flows without fake UI.'
		},
		{
			Icon: LucideWand2,
			title: 'Creative systems',
			body: 'Templates so your team can ship weekly variants without reinventing the layout each time.'
		}
	];

	const formats = [
		{ name: 'Social', detail: '1:1, 4:5, 9:16 — feed & stories' },
		{ name: 'Display', detail: 'Standard IAB sizes + lightweight HTML5 briefs' },
		{ name: 'Video', detail: '6s / 15s / 30s cutdowns, captions burned in' },
		{ name: 'Landing', detail: 'Ad → page message match and proof blocks' }
	];

	const guardrails = [
		'No dark patterns or fake scarcity for tool marketing',
		'Claims stay within what the product actually does',
		'Accessibility: contrast, captions, readable type at small sizes',
		'Asset handoff with naming conventions and source files'
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/services/advertisement"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/services/advertisement',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Services', path: '/services' },
			{ name: 'Advertisement', path: '/services/advertisement' }
		])
	]}
/>

<CompanyPageShell
	eyebrow="Services"
	sectionLabel="Services"
	sectionHref="/(public)/services"
	{title}
	lead="Advertisement creative that demonstrates the product — sharp demos, honest headlines, and assets ready for the channels you actually buy."
>
	<section class="rounded-box border border-base-300 bg-base-100 p-6 md:p-8">
		<div class="flex items-start gap-3">
			<span class="rounded-box bg-primary/10 p-2 text-primary">
				<LucideTarget class="size-5" />
			</span>
			<div class="space-y-3">
				<h2 class="text-xl font-semibold">Performance meets craft</h2>
				<p class="leading-relaxed text-base-content/75">
					We produce ads for software people can try in a minute: convert a file, retouch a photo,
					open an editor. Creative focuses on the outcome (smaller file, cleaner crop, shipped
					export) — not empty lifestyle filler.
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">What we make</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#each work as w}
				{@const Icon = w.Icon}
				<article class="rounded-box border border-base-300 bg-base-100 p-5">
					<div class="mb-3 inline-flex rounded-box bg-primary/10 p-2 text-primary">
						<Icon class="size-4" />
					</div>
					<h3 class="font-semibold">{w.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-base-content/70">{w.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Formats</h2>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
			<table class="table">
				<thead>
					<tr>
						<th>Channel</th>
						<th>Deliverables</th>
					</tr>
				</thead>
				<tbody>
					{#each formats as f}
						<tr>
							<td class="font-medium">{f.name}</td>
							<td class="text-sm text-base-content/70">{f.detail}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="grid gap-6 md:grid-cols-2">
		<div class="rounded-box border border-base-300 bg-base-100 p-6">
			<h2 class="text-lg font-semibold">Guardrails</h2>
			<ul class="mt-3 list-inside list-disc space-y-2 text-sm text-base-content/75">
				{#each guardrails as g}
					<li>{g}</li>
				{/each}
			</ul>
		</div>
		<div class="rounded-box border border-primary/30 bg-primary/5 p-6">
			<h2 class="text-lg font-semibold">Brief an ad project</h2>
			<p class="mt-2 text-sm text-base-content/75">
				Include audience, budget band, must-show product moments, and any brand do-nots. We return a
				concept slate before full production.
			</p>
			<a class="btn btn-primary btn-sm mt-4" href={resolve('/(public)/contact')}>
				Contact
				<LucideArrowRight class="size-4" />
			</a>
		</div>
	</section>
</CompanyPageShell>

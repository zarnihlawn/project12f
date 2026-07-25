<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideGlobe2,
		LucideHeartHandshake,
		LucideLaptop,
		LucideMapPin,
		LucideRocket
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'Jobs';
	const description =
		'Careers at project12f — how we work, what we look for, and how to apply even when roles are not listed.';

	const values = [
		{
			Icon: LucideLaptop,
			title: 'Craft over ceremony',
			body: 'We prefer working software, readable diffs, and honest status over slide decks that age badly.'
		},
		{
			Icon: LucideGlobe2,
			title: 'Remote-friendly',
			body: 'Async writing, clear owners, and timezones that respect deep work. Meetings earn their slot.'
		},
		{
			Icon: LucideHeartHandshake,
			title: 'Kind intensity',
			body: 'High bar for quality without treating people as disposable. Feedback is direct and specific.'
		}
	];

	const openings: {
		id: string;
		role: string;
		type: string;
		location: string;
		summary: string;
		needs: string[];
		status: 'open' | 'pipeline';
	}[] = [
		{
			id: 'fullstack',
			role: 'Full-stack engineer',
			type: 'Contract or full-time',
			location: 'Remote (overlap with Asia / EU preferred)',
			summary:
				'Ship SvelteKit utilities, harden auth, and keep the image suite fast — Retouch, Editor, conversion, compression.',
			needs: [
				'TypeScript fluency',
				'Svelte or React experience',
				'Comfort with canvas / image pipelines is a plus',
				'Product taste: you notice broken empty states'
			],
			status: 'pipeline'
		},
		{
			id: 'design',
			role: 'Product designer',
			type: 'Contract',
			location: 'Remote',
			summary:
				'Own dark-theme UI systems for tools people use for hours — dense panels that stay calm, not cluttered.',
			needs: [
				'Systems thinking (tokens, components)',
				'Portfolio with real shipped UI',
				'Comfort collaborating in PRs / Figma-to-code',
				'Writing short UX copy'
			],
			status: 'pipeline'
		},
		{
			id: 'community',
			role: 'Developer advocate / content',
			type: 'Part-time',
			location: 'Remote',
			summary:
				'Turn utilities into stories: tutorials, launch notes, and feedback loops from people who convert and edit images daily.',
			needs: [
				'Clear technical writing',
				'Comfort on camera or Loom optional',
				'Curiosity about creative + ops workflows'
			],
			status: 'pipeline'
		}
	];

	const perks = [
		'Real ownership of features users touch',
		'Modern stack: SvelteKit, TypeScript, careful performance work',
		'Flexible hours with documented handoffs',
		'Budget for tools that remove friction',
		'Credit on public work when you want it'
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/jobs"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/jobs',
			title,
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Jobs', path: '/jobs' }
		])
	]}
/>

<CompanyPageShell
	{title}
	lead="We hire slowly and carefully. Even when a role is “pipeline” (not yet funded or opened), strong applications help us decide what to open next."
>
	<section class="rounded-box border border-base-300 bg-base-100 p-6 md:p-8">
		<div class="flex items-start gap-3">
			<span class="rounded-box bg-primary/10 p-2 text-primary">
				<LucideRocket class="size-5" />
			</span>
			<div class="space-y-2">
				<h2 class="text-xl font-semibold">Working at project12f</h2>
				<p class="leading-relaxed text-base-content/75">
					You will work close to the product: image utilities people use today, and private tools
					behind auth. Expect end-to-end ownership — design discussions, implementation, and the
					awkward edge cases that appear only after someone drops a 40MB TIFF on Conversion.
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">How we work</h2>
		<div class="grid gap-4 md:grid-cols-3">
			{#each values as v}
				{@const Icon = v.Icon}
				<article class="rounded-box border border-base-300 bg-base-100 p-5">
					<div class="mb-3 inline-flex rounded-box bg-primary/10 p-2 text-primary">
						<Icon class="size-4" />
					</div>
					<h3 class="font-semibold">{v.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-base-content/70">{v.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<div class="flex flex-wrap items-end justify-between gap-2">
			<h2 class="text-xl font-semibold">Roles we are building toward</h2>
			<span class="badge badge-ghost">Pipeline = interested, not yet open</span>
		</div>
		<div class="space-y-4">
			{#each openings as job}
				<article class="rounded-box border border-base-300 bg-base-100 p-5 md:p-6">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h3 class="text-lg font-semibold">{job.role}</h3>
							<p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/65">
								<span>{job.type}</span>
								<span class="inline-flex items-center gap-1">
									<LucideMapPin class="size-3.5" />
									{job.location}
								</span>
							</p>
						</div>
						<span
							class="badge {job.status === 'open' ? 'badge-success' : 'badge-outline'}"
						>
							{job.status === 'open' ? 'Open' : 'Pipeline'}
						</span>
					</div>
					<p class="mt-3 text-sm leading-relaxed text-base-content/75">{job.summary}</p>
					<p class="mt-4 text-xs font-semibold uppercase tracking-wide text-base-content/50"
						>What we look for</p
					>
					<ul class="mt-2 list-inside list-disc space-y-1 text-sm text-base-content/70">
						{#each job.needs as n}
							<li>{n}</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</section>

	<section class="grid gap-6 md:grid-cols-2">
		<div class="rounded-box border border-base-300 bg-base-100 p-6">
			<h2 class="text-lg font-semibold">What you get</h2>
			<ul class="mt-3 list-inside list-disc space-y-2 text-sm text-base-content/75">
				{#each perks as p}
					<li>{p}</li>
				{/each}
			</ul>
		</div>
		<div class="rounded-box border border-primary/30 bg-primary/5 p-6">
			<h2 class="text-lg font-semibold">How to apply</h2>
			<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-base-content/75">
				<li>Send a short note to careers via Contact (topic: Careers).</li>
				<li>Include links: portfolio, GitHub, or writing — not a novel CV.</li>
				<li>Say which role interests you and one product idea for project12f.</li>
				<li>We reply to every serious application, even if the timing is wrong.</li>
			</ol>
			<a class="btn btn-primary btn-sm mt-4" href={resolve('/(public)/contact')}>Apply via Contact</a>
		</div>
	</section>

	<section class="text-sm text-base-content/60">
		<p>
			project12f is an equal-opportunity team. We do not discriminate on protected characteristics.
			If you need interview accommodations, mention it when you write — we will make it work.
		</p>
	</section>
</CompanyPageShell>

<script lang="ts">
	import { resolve } from '$app/paths';
	import CompanyPageShell from '$lib/component/public/company/CompanyPageShell.svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, organizationJsonLd, webPageJsonLd } from '$lib/seo/jsonld';
	import {
		LucideCode2,
		LucideLayers,
		LucideShield,
		LucideSparkles,
		LucideZap
	} from '@lucide/svelte';

	let { data } = $props();

	const title = 'About us';
	const description =
		'Learn about project12f — a focused toolkit for browser image utilities, private tools, and shipping-ready software.';

	const pillars = [
		{
			Icon: LucideZap,
			title: 'Fast by default',
			body: 'Image conversion, compression, Retouch, and the Editor run in your browser when possible — less waiting, fewer uploads, clearer results.'
		},
		{
			Icon: LucideShield,
			title: 'Private where it matters',
			body: 'Account access protects internal tools. Client-side pipelines keep everyday media work on your machine unless you choose otherwise.'
		},
		{
			Icon: LucideLayers,
			title: 'Depth when you need it',
			body: 'Quick Retouch for everyday edits. A full Editor when you need layers, masks, and a longer creative session.'
		},
		{
			Icon: LucideCode2,
			title: 'Built to ship',
			body: 'We care about polish that survives real use: keyboards, undo, export formats, and UI that does not get in the way.'
		}
	];

	const timeline = [
		{
			when: 'Foundation',
			what: 'project12f started as a home for utilities and private ops — one dark, modern surface instead of a pile of one-off scripts.'
		},
		{
			when: 'Image suite',
			what: 'Conversion and compression landed first, then Retouch for quick edits and a browser Editor for deeper work.'
		},
		{
			when: 'Today',
			what: 'We keep shipping utilities people actually open: clearer flows, better performance, and room for research and internal tools under one brand.'
		}
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/about"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/about',
			title,
			description
		}),
		organizationJsonLd(data.siteOrigin),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'About us', path: '/about' }
		])
	]}
/>

<CompanyPageShell
	{title}
	lead="project12f is a product studio and toolkit for practical software — especially image utilities that feel native in the browser, plus the private tools behind the sign-in wall."
>
	<section class="rounded-box border border-base-300 bg-base-100 p-6 md:p-8">
		<div class="flex items-start gap-3">
			<span class="rounded-box bg-primary/10 p-2 text-primary">
				<LucideSparkles class="size-5" />
			</span>
			<div class="space-y-3">
				<h2 class="text-xl font-semibold">Who we are</h2>
				<p class="leading-relaxed text-base-content/75">
					<strong class="text-base-content">PROJECT 12F</strong> builds focused software for makers,
					operators, and anyone who needs reliable media tools without installing heavyweight desktop
					suites. The public face of the product is a growing image utilities suite. Behind the
					account gate lives the private ops surface for teams that need more than a marketing site.
				</p>
				<p class="leading-relaxed text-base-content/75">
					We are small on purpose. That means fewer half-finished experiments in the nav, and more
					attention on flows that convert, compress, retouch, and edit images end to end.
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">What we believe</h2>
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
		<h2 class="text-xl font-semibold">How we got here</h2>
		<ul class="space-y-0">
			{#each timeline as item, i}
				<li class="relative border-l border-base-300 py-4 pl-6">
					<span
						class="absolute -left-1.5 top-5 size-3 rounded-full bg-primary ring-4 ring-base-200"
					></span>
					<p class="text-xs font-semibold uppercase tracking-wide text-primary">{item.when}</p>
					<p class="mt-1 text-sm leading-relaxed text-base-content/75">{item.what}</p>
					{#if i === timeline.length - 1}
						<!-- last -->
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">What we ship</h2>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
			<table class="table">
				<thead>
					<tr>
						<th>Product</th>
						<th>For</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="font-medium">Image Conversion</td>
						<td class="text-sm text-base-content/70">JPEG, PNG, WebP, AVIF, GIF, TIFF swaps</td>
						<td
							><a
								class="link link-primary text-sm"
								href={resolve('/(public)/(service)/utilities/image/conversion')}>Open</a
							></td
						>
					</tr>
					<tr>
						<td class="font-medium">Compression</td>
						<td class="text-sm text-base-content/70">Smaller files with quality dials</td>
						<td
							><a
								class="link link-primary text-sm"
								href={resolve('/(public)/(service)/utilities/image/compression')}>Open</a
							></td
						>
					</tr>
					<tr>
						<td class="font-medium">Retouch</td>
						<td class="text-sm text-base-content/70">Resize, crop shapes, flip, filters, export</td>
						<td
							><a
								class="link link-primary text-sm"
								href={resolve('/(public)/(service)/utilities/image/retouch')}>Open</a
							></td
						>
					</tr>
					<tr>
						<td class="font-medium">Editor</td>
						<td class="text-sm text-base-content/70">Layers, paint, masks — pro browser canvas</td>
						<td
							><a
								class="link link-primary text-sm"
								href={resolve('/(public)/(service)/utilities/image/editor')}>Open</a
							></td
						>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="rounded-box border border-primary/30 bg-primary/5 p-6 md:p-8">
		<h2 class="text-xl font-semibold">Talk to us</h2>
		<p class="mt-2 max-w-xl text-sm leading-relaxed text-base-content/75">
			Press, partnerships, careers, or product feedback — start on Contact. For brand assets and
			boilerplate, see the Press kit.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<a class="btn btn-primary btn-sm" href={resolve('/(public)/contact')}>Contact</a>
			<a class="btn btn-ghost btn-sm" href={resolve('/(public)/press')}>Press kit</a>
			<a class="btn btn-ghost btn-sm" href={resolve('/(public)/jobs')}>Jobs</a>
		</div>
	</section>
</CompanyPageShell>

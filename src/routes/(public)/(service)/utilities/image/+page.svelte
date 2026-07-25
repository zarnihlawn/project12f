<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		LucideArrowRightLeft,
		LucideImage,
		LucideMinimize2,
		LucidePencil
	} from '@lucide/svelte';
	import SeoHead from '$lib/component/seo/SeoHead.svelte';
	import { breadcrumbJsonLd, softwareAppJsonLd, webPageJsonLd } from '$lib/seo/jsonld';

	let { data } = $props();

	const title = 'Image utilities';
	const description =
		'Free browser-friendly image tools on project12f — convert formats, compress file size, and edit images without installing desktop software.';

	const tools = [
		{
			title: 'Conversion',
			description: 'Convert between JPEG, PNG, WebP, AVIF, GIF, and TIFF.',
			href: '/(public)/(service)/utilities/image/conversion' as const,
			icon: LucideArrowRightLeft,
			badge: 'Ready'
		},
		{
			title: 'Compression',
			description: 'Shrink image file size while keeping visual quality.',
			href: '/(public)/(service)/utilities/image/compression' as const,
			icon: LucideMinimize2,
			badge: 'Ready'
		},
		{
			title: 'Editor',
			description: 'Crop, resize, and adjust images in the browser.',
			href: '/(public)/(service)/utilities/image/editor' as const,
			icon: LucidePencil,
			badge: 'Soon'
		}
	];
</script>

<SeoHead
	siteOrigin={data.siteOrigin}
	{title}
	{description}
	path="/utilities/image"
	jsonLd={[
		webPageJsonLd({
			origin: data.siteOrigin,
			path: '/utilities/image',
			title,
			description
		}),
		softwareAppJsonLd({
			origin: data.siteOrigin,
			path: '/utilities/image',
			name: 'project12f Image Utilities',
			description
		}),
		breadcrumbJsonLd(data.siteOrigin, [
			{ name: 'Home', path: '/home' },
			{ name: 'Image utilities', path: '/utilities/image' }
		])
	]}
/>

<div class="bg-base-200/40">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
		<div class="breadcrumbs text-sm">
			<ul>
				<li><a href={resolve('/')}>Home</a></li>
				<li>Images</li>
			</ul>
		</div>

		<section class="hero rounded-box bg-base-100 shadow-sm">
			<div class="hero-content w-full flex-col items-start py-8">
				<span class="badge badge-primary badge-outline mb-2">
					<LucideImage class="mr-1 size-3.5" />
					Utilities
				</span>
				<h1 class="text-3xl font-bold md:text-4xl">Image tools</h1>
				<p class="max-w-2xl text-base-content/70">
					Convert, compress, and edit images. Start with conversion — any supported format to
					any other.
				</p>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-3">
			{#each tools as tool}
				{@const Icon = tool.icon}
				<a
					href={resolve(tool.href)}
					class="card bg-base-100 shadow-sm transition hover:border-primary/40 hover:shadow-md"
				>
					<div class="card-body">
						<div class="flex items-start justify-between gap-2">
							<div class="rounded-box bg-primary/10 p-2 text-primary">
								<Icon class="size-5" />
							</div>
							<span
								class={[
									'badge badge-sm',
									tool.badge === 'Ready' ? 'badge-success' : 'badge-ghost'
								]}
							>
								{tool.badge}
							</span>
						</div>
						<h2 class="card-title text-lg">{tool.title}</h2>
						<p class="text-sm text-base-content/70">{tool.description}</p>
						<div class="card-actions justify-end">
							<span class="btn btn-ghost btn-sm">Open</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

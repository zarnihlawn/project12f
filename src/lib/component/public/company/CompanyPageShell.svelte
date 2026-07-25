<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	let {
		eyebrow = 'Company',
		sectionLabel = 'Company',
		sectionHref = '/(public)/about',
		title,
		lead,
		children
	}: {
		eyebrow?: string;
		sectionLabel?: string;
		/** SvelteKit route id, e.g. `/(public)/services` */
		sectionHref?: string;
		title: string;
		lead: string;
		children: Snippet;
	} = $props();

	// Dynamic section crumb — cast after routes are registered
	const sectionUrl = $derived(resolve(sectionHref as '/(public)/about'));
</script>

<div class="bg-base-200/40">
	<div class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-14">
		<div class="breadcrumbs text-sm">
			<ul>
				<li><a href={resolve('/(public)/home')}>Home</a></li>
				<li><a href={sectionUrl}>{sectionLabel}</a></li>
				<li>{title}</li>
			</ul>
		</div>

		<header class="space-y-4">
			<span class="badge badge-primary badge-outline">{eyebrow}</span>
			<h1 class="text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
			<p class="max-w-2xl text-base leading-relaxed text-base-content/70 md:text-lg">{lead}</p>
		</header>

		{@render children()}
	</div>
</div>

<script lang="ts">
	import { resolve } from '$app/paths';
	import HomeNavbar from '$lib/component/public/home/HomeNavbar.svelte';
</script>

<svelte:head>
	<title>Image editor · project12f</title>
</svelte:head>

<HomeNavbar />

<div class="hero min-h-[60vh] bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<span class="badge badge-ghost mb-3">Coming soon</span>
			<h1 class="text-3xl font-bold">Image editor</h1>
			<p class="py-4 text-base-content/70">
				This tool is not ready yet. Try conversion in the meantime.
			</p>
			<a
				href={resolve('/(public)/(service)/utilities/image/conversion')}
				class="btn btn-primary"
			>
				Open conversion
			</a>
		</div>
	</div>
</div>

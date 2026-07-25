<script>
	import { LucideSearch } from '@lucide/svelte';
</script>

<section class="hero min-h-200 bg-base-200" aria-labelledby="home-hero-heading">
	<div class="hero-content text-center">
		<div class="max-w-lg">
			<p class="mb-3 text-sm font-semibold tracking-[0.14em] text-primary uppercase">
				project12f
			</p>
			<h1 id="home-hero-heading" class="text-5xl font-bold tracking-tight">
				Utilities, apps &amp; private tools
			</h1>
			<p class="py-6 text-base-content/75">
				Image conversion and compression, research utilities, and secure private ops —
				in one place. Built for people who ship.
			</p>
			<label class="input mt-5 w-full input-lg input-primary">
				<LucideSearch class="h-[1em] opacity-50" aria-hidden="true" />
				<input
					type="search"
					class="grow"
					placeholder="Search services…"
					aria-label="Search services"
				/>
				<kbd class="kbd kbd-md">⌘</kbd>
				<kbd class="kbd kbd-md">K</kbd>
			</label>
		</div>
	</div>
</section>

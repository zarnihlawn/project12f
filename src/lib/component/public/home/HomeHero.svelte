<script>
	import { LucideSearch } from '@lucide/svelte';
</script>

<div class="hero min-h-200 bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<h1 class="text-5xl font-bold">Hello there</h1>
			<p class="py-6">
				Provident cupiditate voluptatem et in. Quaerat fugiat ut
				assumenda excepturi exercitationem quasi. In deleniti eaque
				aut repudiandae et a id nisi.
			</p>
			<label class="input mt-5 w-full input-lg input-primary">
				<LucideSearch class="h-[1em] opacity-50" />
				<input
					type="search"
					class="grow"
					placeholder="Search Services ..."
				/>
				<kbd class="kbd kbd-md">⌘</kbd>
				<kbd class="kbd kbd-md">K</kbd>
			</label>
		</div>
	</div>
</div>

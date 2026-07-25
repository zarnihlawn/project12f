<script lang="ts">
	import { LucideMenu, LucideLayoutDashboard, LucideBookOpen, LucideDatabase, LucideLayers, LucideShield } from '@lucide/svelte';

	let { data, children } = $props();

	const iconMap = {
		database: LucideDatabase,
		shield: LucideShield,
		'book-open': LucideBookOpen,
		layers: LucideLayers
	} as const;
</script>

<div class="drawer lg:drawer-open">
	<input id="sudoer-drawer" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content flex min-h-screen flex-col bg-base-200/40">
		<div class="navbar border-b border-base-300 bg-base-100 px-4 lg:hidden">
			<div class="flex-none">
				<label for="sudoer-drawer" class="btn btn-square btn-ghost" aria-label="Open menu">
					<LucideMenu class="size-5" />
				</label>
			</div>
			<div class="flex-1 font-semibold">Sudoer</div>
		</div>
		<div class="flex-1 p-4 md:p-6">
			{@render children()}
		</div>
	</div>

	<div class="drawer-side z-40">
		<label for="sudoer-drawer" class="drawer-overlay" aria-label="Close menu"></label>
		<aside class="flex min-h-full w-80 flex-col bg-base-100">
			<div class="border-b border-base-300 px-4 py-5">
				<a href="/sudoer" class="flex items-center gap-2 text-lg font-bold">
					<span class="rounded-box bg-primary/15 p-2 text-primary">
						<LucideLayoutDashboard class="size-5" />
					</span>
					Sudoer
				</a>
				<p class="mt-1 text-xs text-base-content/60">{data.user?.email}</p>
			</div>

			<ul class="menu w-full flex-1 gap-1 px-2 py-3">
				<li>
					<a href="/sudoer"><LucideLayoutDashboard class="size-4" /> Dashboard</a>
				</li>
				{#each data.modules as mod}
					{@const Icon = iconMap[mod.icon]}
					<li class="menu-title mt-3 px-3">
						<span class="inline-flex items-center gap-2">
							<Icon class="size-3.5 opacity-70" />
							{mod.label}
							<span class="badge badge-ghost badge-xs">{mod.prefix}*</span>
						</span>
					</li>
					{#each mod.entities as entity}
						<li>
							<a href={`/sudoer/${mod.id}/${entity.id}`}>
								{entity.labelPlural}
								<span class="badge badge-outline badge-xs opacity-50">{entity.table}</span>
							</a>
						</li>
					{/each}
				{/each}
			</ul>
		</aside>
	</div>
</div>

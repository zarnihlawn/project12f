<script lang="ts">
	import {
		LucideBookOpen,
		LucideDatabase,
		LucideLayoutDashboard,
		LucideLayers,
		LucideLogOut,
		LucideMenu,
		LucideShield
	} from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';

	let { data, children } = $props();

	const iconMap = {
		database: LucideDatabase,
		shield: LucideShield,
		'book-open': LucideBookOpen,
		layers: LucideLayers
	} as const;

	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		try {
			await authClient.signOut();
		} finally {
			window.location.href = '/auth';
		}
	}

	/** When the 1h session ends, send the user back to login without waiting for navigation. */
	$effect(() => {
		const expiresAt = data.sessionExpiresAt ? new Date(data.sessionExpiresAt).getTime() : 0;
		if (!expiresAt) return;

		const ms = expiresAt - Date.now();
		const redirectToLogin = () => {
			const path = window.location.pathname;
			window.location.href = `/auth?redirectTo=${encodeURIComponent(path)}`;
		};

		if (ms <= 0) {
			redirectToLogin();
			return;
		}

		const id = setTimeout(redirectToLogin, ms);
		return () => clearTimeout(id);
	});
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
			<button class="btn btn-ghost btn-sm gap-1" disabled={signingOut} onclick={signOut}>
				{#if signingOut}<span class="loading loading-spinner loading-xs"></span>{/if}
				<LucideLogOut class="size-4" />
				Sign out
			</button>
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

			<div class="border-t border-base-300 p-3">
				<button
					class="btn btn-ghost btn-block justify-start gap-2"
					disabled={signingOut}
					onclick={signOut}
				>
					{#if signingOut}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<LucideLogOut class="size-4" />
					{/if}
					Sign out
				</button>
			</div>
		</aside>
	</div>
</div>

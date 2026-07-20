<script>
	import { resolve } from '$app/paths';
	import { LucideMenu } from '@lucide/svelte';
</script>

<div class="navbar bg-base-100 shadow-md">
	<div class="navbar-start gap-3">
		<div class="dropdown">
			<div
				tabindex="0"
				role="button"
				class="btn btn-outline btn-ghost lg:hidden"
			>
				<LucideMenu />
			</div>
			<ul
				tabindex="-1"
				class="dropdown-content p2 menu z-1 mt-3 w-52 menu-sm rounded-box bg-base-200 shadow-sm"
			>
				<li>
					<a href={resolve('/')}>Hello</a>
				</li>
			</ul>
		</div>
		<a href={resolve('/')} class="text-2xl font-black">
			Project 12f
		</a>
	</div>
	<div class="navbar-center hidden lg:flex">
		<ul class="menu menu-horizontal px-1">
			<li>
				<a href={resolve('/')}> Home</a>
			</li>
		</ul>
	</div>
	<div class="navbar-end">
		<button class="btn btn-primary"> Sign In </button>
	</div>
</div>

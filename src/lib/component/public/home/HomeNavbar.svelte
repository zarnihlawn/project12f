<script>
	import { resolve } from '$app/paths';
	import { LucideMenu } from '@lucide/svelte';
	import favicon from '$lib/asset/favicon.svg';
</script>

<div class="navbar bg-base-100 shadow-md">
	<div class="navbar-start">
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
				class="dropdown-content p2 menu z-1 mt-3 w-52 menu-sm rounded-box bg-primary/30 shadow-sm"
			>
				<li>
					<a href={resolve('/')}>Hello</a>
				</li>
			</ul>
		</div>
		<a
			href={resolve('/')}
			class="btn flex content-center gap-2 btn-ghost text-2xl font-black text-[#F62440]"
		>
			<img src={favicon} alt="Logo" class="size-8" />
			PROJECT 12F
		</a>
	</div>
	<div class="navbar-center hidden lg:flex">
		<div
			class="megamenu megamenu-full max-sm:megamenu-vertical"
			id="my-megamenu-4"
			popover
		>
			<span class="megamenu-active"></span>
			<button popovertarget="d1">Utilities</button>
			<div id="d1" popover>
				<div class="flex items-start max-sm:flex-col">
					<ul class="menu w-full md:menu-horizontal">
						<li>
							<a>Enterprise</a>
							<ul>
								<li><a>CRM software</a></li>
								<li><a>Marketing management</a></li>
								<li><a>Security</a></li>
								<li><a>Consulting</a></li>
							</ul>
						</li>
						<li>
							<a>Company</a>
							<ul>
								<li><a>About us</a></li>
								<li><a>Contact us</a></li>
								<li><a>Privacy policy</a></li>
								<li><a>Press kit</a></li>
							</ul>
						</li>
					</ul>
					<img
						src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
						class="max-md:hidden md:max-w-sm"
						alt="Tailwind CSS megamenu"
					/>
				</div>
			</div>
		</div>
	</div>
	<div class="navbar-end">
		<button class="btn btn-primary"> Sign In </button>
	</div>
</div>

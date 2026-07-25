<script>
	import { resolve } from '$app/paths';
	import { LucideMenu } from '@lucide/svelte';
	import favicon from '$lib/asset/favicon.svg';
	import utilitiesIcon from '$lib/asset/image/utilities-icon.svg';
	import appsIcon from '$lib/asset/image/apps-icon.svg';
	import researchIcon from '$lib/asset/image/research-icon.svg';
	import freedomIcon from '$lib/asset/image/freedom-icon.svg';
	import aboutIcon from '$lib/asset/image/about-icon.svg';
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
				class="dropdown-content p2 menu z-1 mt-3 w-52 menu-sm rounded-box bg-accent/10 shadow-sm"
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
			<button popovertarget="aboutMenu">About</button>
			<div id="aboutMenu" popover>
				<div class="flex items-start max-sm:flex-col">
					<ul
						class="menu w-full items-baseline gap-3 md:menu-horizontal"
					>
						<li>
							<a href={resolve('/')}>Documentation</a>
							<ul>
								<li>
									<a href={resolve('/')}>User manual</a>
								</li>
								<li>
									<a href={resolve('/')}>Collaboration</a>
								</li>
							</ul>
						</li>
						<li>
							<a href={resolve('/')}>Services</a>
							<ul>
								<li>
									<a href={resolve('/')}>Branding</a>
								</li>
								<li>
									<a href={resolve('/')}>Design</a>
								</li>
								<li>
									<a href={resolve('/')}>Marketing</a>
								</li>
								<li>
									<a href={resolve('/')}>Advertisement</a>
								</li>
							</ul>
						</li>
						<li>
							<a href={resolve('/')}>Company</a>
							<ul>
								<li>
									<a href={resolve('/')}>About us</a>
								</li>
								<li>
									<a href={resolve('/')}>Contact</a>
								</li>
								<li>
									<a href={resolve('/')}>Jobs</a>
								</li>
								<li>
									<a href={resolve('/')}>Press kit</a>
								</li>
							</ul>
						</li>
						<li>
							<a href={resolve('/')}>Legal</a>
							<ul>
								<li>
									<a href={resolve('/')}>Terms of use</a>
								</li>
								<li>
									<a href={resolve('/')}>Privacy policy</a>
								</li>
								<li>
									<a href={resolve('/')}>Cookie policy</a>
								</li>
							</ul>
						</li>
					</ul>
					<img
						src={aboutIcon}
						class="size-52 bg-accent/30 max-md:hidden md:max-w-sm"
						alt="About"
					/>
				</div>
			</div>

			<span class="megamenu-active"></span>
			<button popovertarget="utilitiesMenu">Utilities</button>
			<div id="utilitiesMenu" popover>
				<div class="flex items-start max-sm:flex-col">
					<ul class="menu w-full md:menu-horizontal">
						<li>
							<a href={resolve('/(public)/(service)/utilities/image')}
								>Images</a
							>
							<ul>
								<li>
									<a
										href={resolve(
											'/(public)/(service)/utilities/image/conversion',
										)}>Conversion</a
									>
								</li>
								<li>
									<a
										href={resolve(
											'/(public)/(service)/utilities/image/compression',
										)}>Compression</a
									>
								</li>
								<li>
									<a
										href={resolve(
											'/(public)/(service)/utilities/image/editor',
										)}>Editor</a
									>
								</li>
							</ul>
						</li>
					</ul>
					<img
						src={utilitiesIcon}
						class="size-52 bg-accent/30 max-md:hidden md:max-w-sm"
						alt="Utilities"
					/>
				</div>
			</div>

			<button popovertarget="appsMenu">Apps</button>
			<div id="appsMenu" popover>
				<div class="flex items-start max-sm:flex-col">
					<ul
						class="menu w-full items-baseline gap-3 md:menu-horizontal"
					>
						<li>
							<a>Mobile</a>
							<ul>
								<li>
									<a>Music Player</a>
								</li>
							</ul>
						</li>
						<li>
							<a>Desktop</a>
							<ul>
								<li>
									<a>DBMS</a>
								</li>
							</ul>
						</li>
					</ul>
					<img
						src={appsIcon}
						class="size-52 bg-accent/10 max-md:hidden md:max-w-sm"
						alt="Apps"
					/>
				</div>
			</div>

			<button popovertarget="researchMenu">Research</button>
			<div id="researchMenu" popover>
				<div class="flex items-start max-sm:flex-col">
					<ul class="menu w-full md:menu-horizontal">
						<li>
							<a>Images</a>
							<ul>
								<li>
									<a>Conversion</a>
									<ul class="menu w-full md:menu-horizontal">
										<li><a>PNG</a></li>
									</ul>
								</li>
								<li><a>Compression</a></li>
							</ul>
						</li>
					</ul>
					<img
						src={researchIcon}
						class="size-52 bg-accent/10 max-md:hidden md:max-w-sm"
						alt="Apps"
					/>
				</div>
			</div>
		</div>
	</div>
	<div class="navbar-end">
		<a href={resolve('/auth')} class="btn btn-primary">Sign In</a>
	</div>
</div>

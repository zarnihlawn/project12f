<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/asset/favicon.svg';
</script>

<footer
	class="footer bg-base-200 p-10 text-base-content sm:footer-horizontal"
>
	<aside class="flex flex-col items-center">
		<img src={favicon} alt="logo" class="size-14" />

		<p>
			<span class="text-xl font-black text-[#F62440]">
				PROJECT 12F
			</span>
		</p>
	</aside>
	<nav>
		<h6 class="footer-title">Services</h6>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/services/branding')}
			>Branding</a
		>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/services/design')}>Design</a>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/services/marketing')}
			>Marketing</a
		>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/services/advertisement')}
			>Advertisement</a
		>
	</nav>
	<nav>
		<h6 class="footer-title">Company</h6>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/about')}>About us</a>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/contact')}>Contact</a>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/jobs')}>Jobs</a>
		<a class="link link-hover hover:link-primary" href={resolve('/(public)/press')}>Press kit</a>
	</nav>
</footer>

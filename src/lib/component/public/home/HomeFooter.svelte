<script lang="ts">
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
		<a class="link link-hover hover:link-primary">Branding</a>
		<a class="link link-hover hover:link-primary">Design</a>
		<a class="link link-hover hover:link-primary">Marketing</a>
		<a class="link link-hover hover:link-primary">Advertisement</a>
	</nav>
	<nav>
		<h6 class="footer-title">Company</h6>
		<a class="link link-hover hover:link-primary">About us</a>
		<a class="link link-hover hover:link-primary">Contact</a>
		<a class="link link-hover hover:link-primary">Jobs</a>
		<a class="link link-hover hover:link-primary">Press kit</a>
	</nav>
	<nav>
		<h6 class="footer-title">Legal</h6>
		<a class="link link-hover hover:link-primary">Terms of use</a>
		<a class="link link-hover hover:link-primary">Privacy policy</a>
		<a class="link link-hover hover:link-primary">Cookie policy</a>
	</nav>
</footer>

<script lang="ts">
	import HomeFooter from '$lib/component/public/home/HomeFooter.svelte';
	import HomeHero from '$lib/component/public/home/HomeHero.svelte';
	import HomeNavbar from '$lib/component/public/home/HomeNavbar.svelte';
	import HomeStats from '$lib/component/public/home/HomeStats.svelte';
</script>

<HomeNavbar />
<HomeHero />
<div class="divider px-10"></div>
<HomeStats />
<div class="divider px-10"></div>

<HomeFooter />

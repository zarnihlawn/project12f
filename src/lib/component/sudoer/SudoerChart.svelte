<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';

	let {
		options,
		height = '280px'
	}: {
		options: ApexOptions;
		height?: string;
	} = $props();

	let el = $state<HTMLDivElement | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let chart: any = null;

	onMount(async () => {
		if (!el) return;
		const ApexCharts = (await import('apexcharts')).default;
		chart = new ApexCharts(el, {
			...options,
			chart: {
				background: 'transparent',
				toolbar: { show: false },
				fontFamily: 'inherit',
				...options.chart
			}
		});
		await chart.render();
	});

	onDestroy(() => {
		chart?.destroy();
		chart = null;
	});

	$effect(() => {
		if (chart && options) {
			void chart.updateOptions(options, false, true);
		}
	});
</script>

<div bind:this={el} style:height={height} class="w-full"></div>

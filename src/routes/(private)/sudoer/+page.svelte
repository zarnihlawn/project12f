<script lang="ts">
	import type { ApexOptions } from 'apexcharts';
	import {
		LucideBookOpen,
		LucideDatabase,
		LucideLayers,
		LucideShield
	} from '@lucide/svelte';
	import SudoerChart from '$lib/component/sudoer/SudoerChart.svelte';

	let { data } = $props();

	const iconMap = {
		master: LucideLayers,
		auth: LucideShield,
		'information-docs': LucideBookOpen
	} as const;

	const barOptions = $derived<ApexOptions>({
		chart: { type: 'bar', height: 280 },
		plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
		dataLabels: { enabled: false },
		xaxis: {
			categories: data.counts.map((c) => c.label)
		},
		series: [
			{
				name: 'Rows',
				data: data.counts.map((c) => c.count)
			}
		],
		colors: ['#f62440'],
		grid: { borderColor: 'rgba(127,127,127,0.2)' },
		theme: { mode: 'dark' }
	});

	const donutOptions = $derived<ApexOptions>({
		chart: { type: 'donut', height: 280 },
		labels: data.byModule.map((m) => m.label),
		series: data.byModule.map((m) => m.total),
		colors: ['#f62440', '#b8a0ff', '#7dd3c0'],
		legend: { position: 'bottom' },
		theme: { mode: 'dark' }
	});
</script>

<svelte:head>
	<title>Sudoer dashboard</title>
</svelte:head>

<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="text-sm text-base-content/60">Control plane</p>
		<h1 class="text-3xl font-bold">Sudoer home</h1>
		<p class="mt-1 max-w-2xl text-base-content/70">
			Manage every schema module from one place. Prefixes map to folders under
			<code class="text-primary">src/lib/server/db</code>.
		</p>
	</div>
	<div class="badge badge-primary badge-outline gap-1">
		<LucideDatabase class="size-3.5" />
		CRUD enabled
	</div>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-3">
	<div class="stat rounded-box bg-base-100 shadow-sm">
		<div class="stat-title">Modules</div>
		<div class="stat-value text-primary">{data.totalModules}</div>
		<div class="stat-desc">Schema folders</div>
	</div>
	<div class="stat rounded-box bg-base-100 shadow-sm">
		<div class="stat-title">Entities</div>
		<div class="stat-value text-secondary">{data.totalEntities}</div>
		<div class="stat-desc">Tables with CRUD</div>
	</div>
	<div class="stat rounded-box bg-base-100 shadow-sm">
		<div class="stat-title">Records</div>
		<div class="stat-value">{data.totalRecords}</div>
		<div class="stat-desc">Across all tables</div>
	</div>
</div>

<div class="mb-6 grid gap-4 lg:grid-cols-2">
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-base">Rows by entity</h2>
			<SudoerChart options={barOptions} />
		</div>
	</div>
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-base">Share by module</h2>
			<SudoerChart options={donutOptions} />
		</div>
	</div>
</div>

<div class="grid gap-4 md:grid-cols-3">
	{#each data.byModule as mod}
		{@const Icon = iconMap[mod.id as keyof typeof iconMap] ?? LucideDatabase}
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body gap-3">
				<div class="flex items-start justify-between gap-2">
					<div class="rounded-box bg-primary/10 p-2 text-primary">
						<Icon class="size-5" />
					</div>
					<span class="badge badge-ghost badge-sm">{mod.prefix}*</span>
				</div>
				<h2 class="card-title text-lg">{mod.label}</h2>
				<p class="text-sm text-base-content/60">{mod.total} total rows</p>
				<ul class="space-y-1">
					{#each mod.entities as entity}
						<li>
							<a
								class="link link-hover flex items-center justify-between text-sm"
								href={`/sudoer/${mod.id}/${entity.entityId}`}
							>
								<span>{entity.label}</span>
								<span class="badge badge-outline badge-xs">{entity.count}</span>
							</a>
						</li>
					{/each}
				</ul>
				<div class="card-actions justify-end">
					<a class="btn btn-ghost btn-sm" href={`/sudoer/${mod.id}`}>Open module</a>
				</div>
			</div>
		</div>
	{/each}
</div>

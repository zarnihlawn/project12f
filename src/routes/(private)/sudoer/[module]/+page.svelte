<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.module.label} · Sudoer</title>
</svelte:head>

<div class="breadcrumbs mb-4 text-sm">
	<ul>
		<li><a href="/sudoer">Sudoer</a></li>
		<li>{data.module.label}</li>
	</ul>
</div>

<div class="mb-6">
	<div class="mb-2 flex flex-wrap gap-2">
		<span class="badge badge-primary badge-outline">{data.module.prefix}*</span>
		<span class="badge badge-ghost">{data.module.folder}</span>
	</div>
	<h1 class="text-3xl font-bold">{data.module.label}</h1>
	<p class="mt-1 text-base-content/70">{data.module.description}</p>
</div>

<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
	<table class="table">
		<thead>
			<tr>
				<th>Entity</th>
				<th>Table</th>
				<th>Rows</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.module.entities as entity}
				<tr class="hover">
					<td>
						<div class="font-medium">{entity.labelPlural}</div>
						<div class="text-xs text-base-content/60">{entity.description}</div>
					</td>
					<td><code class="text-xs">{entity.table}</code></td>
					<td><span class="badge badge-outline">{entity.count}</span></td>
					<td class="text-right">
						<a class="btn btn-primary btn-sm" href={`/sudoer/${data.module.id}/${entity.id}`}>
							Manage
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

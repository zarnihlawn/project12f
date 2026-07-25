<script lang="ts">
	import { LucidePlus, LucidePencil, LucideTrash2 } from '@lucide/svelte';

	let { data, form } = $props();

	const listFields = $derived(
		data.entity.fields.filter((f) => f.list && !f.hidden).slice(0, 6)
	);

	function cell(row: Record<string, unknown>, key: string) {
		const v = row[key];
		if (v == null) return '—';
		if (typeof v === 'boolean') return v ? 'Yes' : 'No';
		const s = String(v);
		return s.length > 48 ? `${s.slice(0, 48)}…` : s;
	}
</script>

<svelte:head>
	<title>{data.entity.labelPlural} · Sudoer</title>
</svelte:head>

<div class="breadcrumbs mb-4 text-sm">
	<ul>
		<li><a href="/sudoer">Sudoer</a></li>
		<li><a href={`/sudoer/${data.moduleId}`}>{data.moduleId}</a></li>
		<li>{data.entity.labelPlural}</li>
	</ul>
</div>

<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<div class="mb-2 flex flex-wrap gap-2">
			<span class="badge badge-outline">{data.entity.table}</span>
			<span class="badge badge-ghost">{data.rows.length} rows</span>
		</div>
		<h1 class="text-3xl font-bold">{data.entity.labelPlural}</h1>
		<p class="mt-1 text-base-content/70">{data.entity.description}</p>
	</div>
	<a class="btn btn-primary" href={`/sudoer/${data.moduleId}/${data.entity.id}/new`}>
		<LucidePlus class="size-4" />
		New {data.entity.label.toLowerCase()}
	</a>
</div>

{#if form?.message}
	<div class="alert alert-error mb-4"><span>{form.message}</span></div>
{/if}

<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100 shadow-sm">
	<table class="table table-zebra">
		<thead>
			<tr>
				{#each listFields as field}
					<th>{field.label}</th>
				{/each}
				<th class="text-right">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row}
				<tr>
					{#each listFields as field}
						<td class="max-w-56 truncate text-sm">{cell(row, field.key)}</td>
					{/each}
					<td class="text-right">
						<div class="join">
							<a
								class="btn btn-ghost join-item btn-sm"
								href={`/sudoer/${data.moduleId}/${data.entity.id}/${row[data.entity.primaryKey]}`}
							>
								<LucidePencil class="size-3.5" />
							</a>
							<form method="POST" action="?/delete" class="join-item">
								<input type="hidden" name="id" value={String(row[data.entity.primaryKey] ?? '')} />
								<button
									class="btn btn-ghost btn-sm text-error"
									onclick={(e) => {
										if (!confirm('Delete this record?')) e.preventDefault();
									}}
								>
									<LucideTrash2 class="size-3.5" />
								</button>
							</form>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan={listFields.length + 1} class="py-10 text-center text-base-content/60">
						No records yet.
						<a class="link link-primary" href={`/sudoer/${data.moduleId}/${data.entity.id}/new`}>
							Create one
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

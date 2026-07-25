<script lang="ts">
	import EntityFormFields from '$lib/component/sudoer/EntityFormFields.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Edit {data.entity.label} · Sudoer</title>
</svelte:head>

<div class="breadcrumbs mb-4 text-sm">
	<ul>
		<li><a href="/sudoer">Sudoer</a></li>
		<li><a href={`/sudoer/${data.moduleId}`}>{data.moduleId}</a></li>
		<li>
			<a href={`/sudoer/${data.moduleId}/${data.entity.id}`}>{data.entity.label}</a>
		</li>
		<li>Edit</li>
	</ul>
</div>

<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-3xl font-bold">Edit {data.entity.label.toLowerCase()}</h1>
		<p class="text-sm text-base-content/60">
			<code>{data.entity.table}</code> ·
			{String(data.row[data.entity.primaryKey] ?? '')}
		</p>
	</div>
	<form method="POST" action="?/delete">
		<button
			class="btn btn-outline btn-error btn-sm"
			onclick={(e) => {
				if (!confirm('Delete this record permanently?')) e.preventDefault();
			}}
		>
			Delete
		</button>
	</form>
</div>

{#if form?.message}
	<div class="alert alert-error mb-4"><span>{form.message}</span></div>
{/if}

<div class="card max-w-3xl bg-base-100 shadow-sm">
	<div class="card-body">
		<form method="POST" action="?/update" class="space-y-2">
			<EntityFormFields fields={data.entity.fields} values={data.row} mode="update" />
			<div class="card-actions mt-6 justify-end gap-2">
				<a class="btn btn-ghost" href={`/sudoer/${data.moduleId}/${data.entity.id}`}>Back</a>
				<button class="btn btn-primary" type="submit">Save changes</button>
			</div>
		</form>
	</div>
</div>

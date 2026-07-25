<script lang="ts">
	import EntityFormFields from '$lib/component/sudoer/EntityFormFields.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>New {data.entity.label} · Sudoer</title>
</svelte:head>

<div class="breadcrumbs mb-4 text-sm">
	<ul>
		<li><a href="/sudoer">Sudoer</a></li>
		<li><a href={`/sudoer/${data.moduleId}`}>{data.moduleId}</a></li>
		<li>
			<a href={`/sudoer/${data.moduleId}/${data.entity.id}`}>{data.entity.label}</a>
		</li>
		<li>New</li>
	</ul>
</div>

<h1 class="mb-6 text-3xl font-bold">New {data.entity.label.toLowerCase()}</h1>

{#if form?.message}
	<div class="alert alert-error mb-4"><span>{form.message}</span></div>
{/if}

<div class="card max-w-3xl bg-base-100 shadow-sm">
	<div class="card-body">
		<form method="POST" class="space-y-2">
			<EntityFormFields fields={data.entity.fields} mode="create" />
			<div class="card-actions mt-6 justify-end gap-2">
				<a class="btn btn-ghost" href={`/sudoer/${data.moduleId}/${data.entity.id}`}>Cancel</a>
				<button class="btn btn-primary" type="submit">Create</button>
			</div>
		</form>
	</div>
</div>

<p class="mt-3 text-xs text-base-content/50">
	Table <code>{data.entity.table}</code>. Audit fields auto-fill from master + your user when left empty.
</p>

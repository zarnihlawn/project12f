<script lang="ts">
	import type { EntityField } from '$lib/sudoer/registry';

	let {
		fields,
		values = {},
		mode = 'create'
	}: {
		fields: EntityField[];
		values?: Record<string, unknown>;
		mode?: 'create' | 'update';
	} = $props();

	function visible(field: EntityField) {
		if (field.hidden) return false;
		if (field.readonly && mode === 'create' && field.key === 'id') return false;
		if (mode === 'create' && field.readonly && (field.type === 'datetime' || field.key === 'id'))
			return false;
		if (mode === 'update' && field.createOnly) return false;
		return true;
	}

	function displayValue(field: EntityField): string {
		const v = values[field.key];
		if (v == null) return '';
		if (field.type === 'datetime') {
			const d = new Date(String(v));
			if (Number.isNaN(d.getTime())) return String(v);
			return d.toISOString().slice(0, 16);
		}
		if (field.type === 'boolean') return v ? 'true' : 'false';
		return String(v);
	}
</script>

<table class="w-full">
	<tbody>
		{#each fields.filter(visible) as field}
			<tr class="border-b border-base-200">
				<td class="w-48 py-3 pr-4 align-top text-sm font-medium text-base-content/70">
					{field.label}
					{#if field.required}<span class="text-error">*</span>{/if}
				</td>
				<td class="py-3">
					{#if field.readonly}
						<input
							class="input input-bordered w-full max-w-xl bg-base-200"
							value={displayValue(field)}
							readonly
							disabled
						/>
					{:else if field.type === 'textarea'}
						<textarea
							name={field.key}
							class="textarea textarea-bordered w-full max-w-xl"
							rows="4"
							required={field.required}
							placeholder={field.placeholder ?? ''}
						>{displayValue(field)}</textarea>
					{:else if field.type === 'boolean'}
						<input
							type="checkbox"
							name={field.key}
							value="true"
							class="toggle toggle-primary"
							checked={Boolean(values[field.key])}
						/>
					{:else if field.type === 'number'}
						<input
							type="number"
							name={field.key}
							class="input input-bordered w-full max-w-xl"
							value={displayValue(field)}
							required={field.required}
							placeholder={field.placeholder ?? ''}
						/>
					{:else if field.type === 'datetime'}
						<input
							type="datetime-local"
							name={field.key}
							class="input input-bordered w-full max-w-xl"
							value={displayValue(field)}
							required={field.required}
						/>
					{:else}
						<input
							type="text"
							name={field.key}
							class="input input-bordered w-full max-w-xl"
							value={displayValue(field)}
							required={field.required}
							placeholder={field.placeholder ?? ''}
							readonly={field.createOnly && mode === 'update'}
						/>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

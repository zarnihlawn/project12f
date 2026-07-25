import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	deleteEntityRow,
	listEntityRows
} from '$lib/server/sudoer/crud';
import { getEntity } from '$lib/sudoer/registry';

export const load: PageServerLoad = async ({ params }) => {
	const entity = getEntity(params.module, params.entity);
	if (!entity) error(404, 'Entity not found');

	const rows = await listEntityRows(entity.id);

	return {
		moduleId: params.module,
		entity: {
			id: entity.id,
			table: entity.table,
			label: entity.label,
			labelPlural: entity.labelPlural,
			description: entity.description,
			primaryKey: entity.primaryKey,
			fields: entity.fields
		},
		rows
	};
};

export const actions: Actions = {
	delete: async ({ request, params }) => {
		const entity = getEntity(params.module, params.entity);
		if (!entity) error(404, 'Entity not found');

		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Missing id' });

		await deleteEntityRow(entity.id, id);
		redirect(303, `/sudoer/${params.module}/${params.entity}`);
	}
};

import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	deleteEntityRow,
	getEntityRow,
	parseEntityForm,
	updateEntityRow
} from '$lib/server/sudoer/crud';
import { getEntity } from '$lib/sudoer/registry';

export const load: PageServerLoad = async ({ params }) => {
	const entity = getEntity(params.module, params.entity);
	if (!entity) error(404, 'Entity not found');

	const row = await getEntityRow(entity.id, params.id);

	return {
		moduleId: params.module,
		entity: {
			id: entity.id,
			label: entity.label,
			table: entity.table,
			primaryKey: entity.primaryKey,
			fields: entity.fields
		},
		row
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const entity = getEntity(params.module, params.entity);
		if (!entity) error(404, 'Entity not found');

		try {
			const formData = await request.formData();
			const data = parseEntityForm(entity, formData, 'update');
			await updateEntityRow(entity.id, params.id, data);
			redirect(303, `/sudoer/${params.module}/${params.entity}/${params.id}`);
		} catch (err) {
			if (isRedirect(err)) throw err;
			const message = err instanceof Error ? err.message : 'Update failed';
			return fail(400, { message });
		}
	},

	delete: async ({ params }) => {
		const entity = getEntity(params.module, params.entity);
		if (!entity) error(404, 'Entity not found');
		await deleteEntityRow(entity.id, params.id);
		redirect(303, `/sudoer/${params.module}/${params.entity}`);
	}
};

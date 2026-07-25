import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createEntityRow,
	ensureAuditDefaults,
	parseEntityForm
} from '$lib/server/sudoer/crud';
import { getEntity } from '$lib/sudoer/registry';

export const load: PageServerLoad = async ({ params }) => {
	const entity = getEntity(params.module, params.entity);
	if (!entity) error(404, 'Entity not found');

	return {
		moduleId: params.module,
		entity: {
			id: entity.id,
			label: entity.label,
			table: entity.table,
			fields: entity.fields
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const entity = getEntity(params.module, params.entity);
		if (!entity) error(404, 'Entity not found');

		try {
			const formData = await request.formData();
			let data = parseEntityForm(entity, formData, 'create');
			data = await ensureAuditDefaults(data, locals.user?.id);
			const row = await createEntityRow(entity.id, data);
			const id = row[entity.primaryKey];
			redirect(303, `/sudoer/${params.module}/${params.entity}/${id}`);
		} catch (err) {
			if (isRedirect(err)) throw err;
			const message =
				err && typeof err === 'object' && 'body' in err
					? String((err as { body?: { message?: string } }).body?.message ?? 'Create failed')
					: err instanceof Error
						? err.message
						: 'Create failed';
			return fail(400, { message });
		}
	}
};

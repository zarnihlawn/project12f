import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { countAllEntities } from '$lib/server/sudoer/crud';
import { getModule } from '$lib/sudoer/registry';

export const load: PageServerLoad = async ({ params }) => {
	const mod = getModule(params.module);
	if (!mod) error(404, 'Module not found');

	const counts = await countAllEntities();
	const entities = mod.entities.map((e) => ({
		...e,
		count: counts.find((c) => c.entityId === e.id)?.count ?? 0
	}));

	return {
		module: {
			id: mod.id,
			label: mod.label,
			description: mod.description,
			prefix: mod.prefix,
			folder: mod.folder,
			icon: mod.icon,
			entities
		}
	};
};

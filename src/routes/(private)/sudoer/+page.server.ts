import type { PageServerLoad } from './$types';
import { countAllEntities } from '$lib/server/sudoer/crud';
import { SUDOER_MODULES } from '$lib/sudoer/registry';

export const load: PageServerLoad = async () => {
	const counts = await countAllEntities();
	const byModule = SUDOER_MODULES.map((m) => ({
		id: m.id,
		label: m.label,
		prefix: m.prefix,
		total: counts.filter((c) => c.moduleId === m.id).reduce((sum, c) => sum + c.count, 0),
		entities: counts.filter((c) => c.moduleId === m.id)
	}));

	return {
		counts,
		byModule,
		totalRecords: counts.reduce((sum, c) => sum + c.count, 0),
		totalEntities: counts.length,
		totalModules: SUDOER_MODULES.length
	};
};

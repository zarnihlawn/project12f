import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isSudoerEmail } from '$lib/server/sudoer/guard';
import { SUDOER_MODULES } from '$lib/sudoer/registry';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!isSudoerEmail(user?.email)) {
		error(403, 'Sudoer access required. Add your email to SUDOER_EMAILS.');
	}

	return {
		modules: SUDOER_MODULES.map((m) => ({
			id: m.id,
			label: m.label,
			description: m.description,
			prefix: m.prefix,
			folder: m.folder,
			icon: m.icon,
			entities: m.entities.map((e) => ({
				id: e.id,
				table: e.table,
				label: e.label,
				labelPlural: e.labelPlural,
				description: e.description
			}))
		}))
	};
};

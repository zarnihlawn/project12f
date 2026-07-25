import { asc, count, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	AuthAccountSchema,
	AuthSessionSchema,
	AuthUserSchema,
	AuthVerificationSchema,
	InfoDocsCategory,
	InfoDocsContentType,
	InfoDocsDocument,
	InfoDocsTag,
	InfoDocumentTag,
	MasterActionSchema,
	MasterStatusSchema
} from '$lib/server/db/schema';
import { getEntityById, type EntityField, type SudoerEntity } from '$lib/sudoer/registry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABLES: Record<string, any> = {
	'master-status': MasterStatusSchema,
	'master-action': MasterActionSchema,
	'auth-user': AuthUserSchema,
	'auth-session': AuthSessionSchema,
	'auth-account': AuthAccountSchema,
	'auth-verification': AuthVerificationSchema,
	'info-docs-category': InfoDocsCategory,
	'info-docs-content-type': InfoDocsContentType,
	'info-docs-document': InfoDocsDocument,
	'info-docs-tag': InfoDocsTag,
	'info-docs-document-tag': InfoDocumentTag
};

function tableFor(entityId: string) {
	const table = TABLES[entityId];
	if (!table) throw error(404, `Unknown entity: ${entityId}`);
	return table;
}

function serializeRow(row: Record<string, unknown>) {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		if (value instanceof Date) out[key] = value.toISOString();
		else out[key] = value;
	}
	return out;
}

function coerceValue(field: EntityField, raw: FormDataEntryValue | null): unknown {
	if (raw == null) return undefined;
	const str = typeof raw === 'string' ? raw : String(raw);

	if (field.type === 'boolean') {
		return str === 'true' || str === 'on' || str === '1';
	}

	if (str.trim() === '') {
		return field.required ? undefined : null;
	}

	switch (field.type) {
		case 'number': {
			const n = Number(str);
			return Number.isFinite(n) ? n : undefined;
		}
		case 'datetime': {
			const d = new Date(str);
			return Number.isNaN(d.getTime()) ? undefined : d;
		}
		default:
			return str;
	}
}

export function parseEntityForm(
	entity: SudoerEntity,
	formData: FormData,
	mode: 'create' | 'update'
) {
	const data: Record<string, unknown> = {};

	for (const field of entity.fields) {
		if (field.readonly) continue;
		if (field.hidden && mode === 'update' && !formData.has(field.key)) continue;
		if (mode === 'update' && field.createOnly) continue;
		if (
			mode === 'create' &&
			field.key === entity.primaryKey &&
			(entity.pkType === 'serial' || entity.pkType === 'uuid')
		) {
			continue;
		}

		if (!formData.has(field.key)) {
			if (field.type === 'boolean') data[field.key] = false;
			continue;
		}

		const value = coerceValue(field, formData.get(field.key));
		if (value === undefined) {
			if (field.required) throw error(400, `${field.label} is required`);
			continue;
		}
		data[field.key] = value;
	}

	return data;
}

export async function listEntityRows(entityId: string, limit = 200) {
	const table = tableFor(entityId);
	const rows = await db.select().from(table).limit(limit);
	return rows.map(serializeRow);
}

export async function getEntityRow(entityId: string, id: string) {
	const table = tableFor(entityId);
	const meta = getEntityById(entityId)?.entity;
	if (!meta) throw error(404, 'Entity not found');

	const pk = table[meta.primaryKey];
	const value = meta.pkType === 'serial' ? Number(id) : id;
	const [row] = await db.select().from(table).where(eq(pk, value)).limit(1);
	if (!row) throw error(404, 'Record not found');
	return serializeRow(row);
}

export async function createEntityRow(entityId: string, data: Record<string, unknown>) {
	const table = tableFor(entityId);
	const rows = (await db.insert(table).values(data).returning()) as Record<string, unknown>[];
	const row = rows[0];
	if (!row) throw error(500, 'Insert returned no row');
	return serializeRow(row);
}

export async function updateEntityRow(
	entityId: string,
	id: string,
	data: Record<string, unknown>
) {
	const table = tableFor(entityId);
	const meta = getEntityById(entityId)?.entity;
	if (!meta) throw error(404, 'Entity not found');
	const pk = table[meta.primaryKey];
	const value = meta.pkType === 'serial' ? Number(id) : id;
	const rows = (await db
		.update(table)
		.set(data)
		.where(eq(pk, value))
		.returning()) as Record<string, unknown>[];
	const row = rows[0];
	if (!row) throw error(404, 'Record not found');
	return serializeRow(row);
}

export async function deleteEntityRow(entityId: string, id: string) {
	const table = tableFor(entityId);
	const meta = getEntityById(entityId)?.entity;
	if (!meta) throw error(404, 'Entity not found');
	const pk = table[meta.primaryKey];
	const value = meta.pkType === 'serial' ? Number(id) : id;
	await db.delete(table).where(eq(pk, value));
}

export async function countAllEntities() {
	const results: { entityId: string; moduleId: string; label: string; count: number }[] = [];

	for (const [entityId, table] of Object.entries(TABLES)) {
		const found = getEntityById(entityId);
		if (!found) continue;
		try {
			const [row] = await db.select({ value: count() }).from(table);
			results.push({
				entityId,
				moduleId: found.module.id,
				label: found.entity.labelPlural,
				count: Number(row?.value ?? 0)
			});
		} catch {
			results.push({
				entityId,
				moduleId: found.module.id,
				label: found.entity.labelPlural,
				count: 0
			});
		}
	}

	return results;
}

export async function ensureAuditDefaults(data: Record<string, unknown>, userId?: string) {
	const next = { ...data };

	if (next.masterStatusId == null) {
		const [status] = await db.select().from(MasterStatusSchema).limit(1);
		if (status) next.masterStatusId = status.id;
	}
	if (next.action == null) {
		const [action] = await db
			.select()
			.from(MasterActionSchema)
			.orderBy(asc(MasterActionSchema.id))
			.limit(1);
		if (action) next.action = action.id;
	}
	if (next.actionUserId == null && userId) {
		next.actionUserId = userId;
	}

	return next;
}

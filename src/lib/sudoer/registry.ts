export type FieldType =
	| 'text'
	| 'textarea'
	| 'number'
	| 'boolean'
	| 'datetime'
	| 'uuid'
	| 'select';

export type EntityField = {
	key: string;
	label: string;
	type: FieldType;
	required?: boolean;
	readonly?: boolean;
	createOnly?: boolean;
	hidden?: boolean;
	/** Hide from list table */
	list?: boolean;
	placeholder?: string;
	options?: { value: string; label: string }[];
};

export type SudoerEntity = {
	id: string;
	table: string;
	label: string;
	labelPlural: string;
	description: string;
	primaryKey: string;
	pkType: 'serial' | 'uuid' | 'text';
	fields: EntityField[];
};

export type SudoerModule = {
	id: string;
	label: string;
	description: string;
	prefix: string;
	folder: string;
	icon: 'database' | 'shield' | 'book-open' | 'layers';
	entities: SudoerEntity[];
};

const wrapperAuditFields: EntityField[] = [
	{ key: 'masterStatusId', label: 'Master status ID', type: 'number', required: true, list: true },
	{ key: 'action', label: 'Action ID', type: 'number', required: true },
	{ key: 'actionUserId', label: 'Action user ID', type: 'text', required: true },
	{ key: 'actionDescription', label: 'Action description', type: 'text' },
	{ key: 'createdAt', label: 'Created', type: 'datetime', readonly: true, list: true },
	{ key: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true }
];

export const SUDOER_MODULES: SudoerModule[] = [
	{
		id: 'master',
		label: 'Master',
		description: 'Core lookup values used across the platform.',
		prefix: 'master_',
		folder: 'db/master',
		icon: 'layers',
		entities: [
			{
				id: 'master-status',
				table: 'master_status',
				label: 'Status',
				labelPlural: 'Statuses',
				description: 'Shared status codes (active, draft, archived, …).',
				primaryKey: 'id',
				pkType: 'serial',
				fields: [
					{ key: 'id', label: 'ID', type: 'number', readonly: true, list: true },
					{ key: 'name', label: 'Name', type: 'text', required: true, list: true },
					{ key: 'createdAt', label: 'Created', type: 'datetime', readonly: true, list: true },
					{ key: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true }
				]
			},
			{
				id: 'master-action',
				table: 'master_action',
				label: 'Action',
				labelPlural: 'Actions',
				description: 'Audit action types (create, update, delete, …).',
				primaryKey: 'id',
				pkType: 'serial',
				fields: [
					{ key: 'id', label: 'ID', type: 'number', readonly: true, list: true },
					{ key: 'name', label: 'Name', type: 'text', required: true, list: true },
					{ key: 'createdAt', label: 'Created', type: 'datetime', readonly: true, list: true },
					{ key: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true }
				]
			}
		]
	},
	{
		id: 'auth',
		label: 'Auth',
		description: 'Better Auth users, sessions, accounts, and verifications.',
		prefix: 'auth_',
		folder: 'db/auth',
		icon: 'shield',
		entities: [
			{
				id: 'auth-user',
				table: 'auth_user',
				label: 'User',
				labelPlural: 'Users',
				description: 'Application users.',
				primaryKey: 'id',
				pkType: 'text',
				fields: [
					{ key: 'id', label: 'ID', type: 'text', required: true, createOnly: true, list: true },
					{ key: 'name', label: 'Name', type: 'text', required: true, list: true },
					{ key: 'email', label: 'Email', type: 'text', required: true, list: true },
					{ key: 'emailVerified', label: 'Email verified', type: 'boolean', list: true },
					{ key: 'twoFactorEnabled', label: '2FA enabled', type: 'boolean', list: true },
					{ key: 'image', label: 'Image URL', type: 'text' },
					{ key: 'createdAt', label: 'Created', type: 'datetime', readonly: true, list: true },
					{ key: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true }
				]
			},
			{
				id: 'auth-two-factor',
				table: 'auth_two_factor',
				label: 'Two-factor',
				labelPlural: 'Two-factor secrets',
				description: 'TOTP secrets and backup codes.',
				primaryKey: 'id',
				pkType: 'text',
				fields: [
					{ key: 'id', label: 'ID', type: 'text', required: true, createOnly: true, list: true },
					{ key: 'userId', label: 'User ID', type: 'text', required: true, list: true },
					{ key: 'secret', label: 'Secret', type: 'text', hidden: true },
					{ key: 'backupCodes', label: 'Backup codes', type: 'textarea', hidden: true }
				]
			},
			{
				id: 'auth-session',
				table: 'auth_session',
				label: 'Session',
				labelPlural: 'Sessions',
				description: 'Active and historical sessions.',
				primaryKey: 'id',
				pkType: 'text',
				fields: [
					{ key: 'id', label: 'ID', type: 'text', required: true, createOnly: true, list: true },
					{ key: 'userId', label: 'User ID', type: 'text', required: true, list: true },
					{ key: 'token', label: 'Token', type: 'text', required: true },
					{ key: 'expiresAt', label: 'Expires', type: 'datetime', required: true, list: true },
					{ key: 'ipAddress', label: 'IP address', type: 'text', list: true },
					{ key: 'userAgent', label: 'User agent', type: 'textarea' },
					{ key: 'createdAt', label: 'Created', type: 'datetime', readonly: true },
					{ key: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true }
				]
			},
			{
				id: 'auth-account',
				table: 'auth_account',
				label: 'Account',
				labelPlural: 'Accounts',
				description: 'OAuth / credential accounts linked to users.',
				primaryKey: 'id',
				pkType: 'text',
				fields: [
					{ key: 'id', label: 'ID', type: 'text', required: true, createOnly: true, list: true },
					{ key: 'userId', label: 'User ID', type: 'text', required: true, list: true },
					{ key: 'accountId', label: 'Account ID', type: 'text', required: true, list: true },
					{ key: 'providerId', label: 'Provider', type: 'text', required: true, list: true },
					{ key: 'password', label: 'Password hash', type: 'text', hidden: true },
					{ key: 'accessToken', label: 'Access token', type: 'textarea' },
					{ key: 'refreshToken', label: 'Refresh token', type: 'textarea' },
					{ key: 'idToken', label: 'ID token', type: 'textarea' },
					{ key: 'scope', label: 'Scope', type: 'text' },
					{ key: 'accessTokenExpiresAt', label: 'Access token expires', type: 'datetime' },
					{ key: 'refreshTokenExpiresAt', label: 'Refresh token expires', type: 'datetime' },
					{ key: 'createdAt', label: 'Created', type: 'datetime', readonly: true, list: true },
					{ key: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true }
				]
			},
			{
				id: 'auth-verification',
				table: 'auth_verification',
				label: 'Verification',
				labelPlural: 'Verifications',
				description: 'Email / OTP verification tokens.',
				primaryKey: 'id',
				pkType: 'text',
				fields: [
					{ key: 'id', label: 'ID', type: 'text', required: true, createOnly: true, list: true },
					{ key: 'identifier', label: 'Identifier', type: 'text', required: true, list: true },
					{ key: 'value', label: 'Value', type: 'text', required: true },
					{ key: 'expiresAt', label: 'Expires', type: 'datetime', required: true, list: true },
					{ key: 'createdAt', label: 'Created', type: 'datetime', readonly: true, list: true },
					{ key: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true }
				]
			}
		]
	},
	{
		id: 'information-docs',
		label: 'Information · Docs',
		description: 'Documentation module under information schema (info_docs_*).',
		prefix: 'info_docs_',
		folder: 'db/information/docs',
		icon: 'book-open',
		entities: [
			{
				id: 'info-docs-category',
				table: 'info_docs_category',
				label: 'Category',
				labelPlural: 'Categories',
				description: 'Doc categories / sections.',
				primaryKey: 'id',
				pkType: 'serial',
				fields: [
					{ key: 'id', label: 'ID', type: 'number', readonly: true, list: true },
					{ key: 'name', label: 'Name', type: 'text', required: true, list: true },
					{ key: 'sortOrder', label: 'Sort order', type: 'number', list: true },
					...wrapperAuditFields
				]
			},
			{
				id: 'info-docs-content-type',
				table: 'info_docs_content_type',
				label: 'Content type',
				labelPlural: 'Content types',
				description: 'Markdown, HTML, media, …',
				primaryKey: 'id',
				pkType: 'serial',
				fields: [
					{ key: 'id', label: 'ID', type: 'number', readonly: true, list: true },
					{ key: 'name', label: 'Name', type: 'text', required: true, list: true },
					...wrapperAuditFields
				]
			},
			{
				id: 'info-docs-document',
				table: 'info_docs_document',
				label: 'Document',
				labelPlural: 'Documents',
				description: 'Documentation pages and nested docs.',
				primaryKey: 'id',
				pkType: 'uuid',
				fields: [
					{ key: 'id', label: 'ID', type: 'uuid', readonly: true, list: true },
					{ key: 'title', label: 'Title', type: 'text', required: true, list: true },
					{ key: 'content', label: 'Content', type: 'textarea', required: true },
					{ key: 'contentType', label: 'Content type ID', type: 'number', required: true, list: true },
					{ key: 'category', label: 'Category ID', type: 'number', required: true, list: true },
					{ key: 'parentDocument', label: 'Parent document ID', type: 'uuid' },
					{ key: 'mediaUrl', label: 'Media URL', type: 'text' },
					{ key: 'published', label: 'Published', type: 'boolean', list: true },
					{ key: 'sortOrder', label: 'Sort order', type: 'number', list: true },
					...wrapperAuditFields
				]
			},
			{
				id: 'info-docs-tag',
				table: 'info_docs_tag',
				label: 'Tag',
				labelPlural: 'Tags',
				description: 'Tags for documents.',
				primaryKey: 'id',
				pkType: 'serial',
				fields: [
					{ key: 'id', label: 'ID', type: 'number', readonly: true, list: true },
					{ key: 'name', label: 'Name', type: 'text', required: true, list: true },
					...wrapperAuditFields
				]
			},
			{
				id: 'info-docs-document-tag',
				table: 'info_docs_document_tag',
				label: 'Document tag',
				labelPlural: 'Document tags',
				description: 'Join table linking documents to tags.',
				primaryKey: 'id',
				pkType: 'serial',
				fields: [
					{ key: 'id', label: 'ID', type: 'number', readonly: true, list: true },
					{ key: 'documentId', label: 'Document ID', type: 'uuid', required: true, list: true },
					{ key: 'tagId', label: 'Tag ID', type: 'number', required: true, list: true },
					...wrapperAuditFields
				]
			}
		]
	}
];

export function getModule(moduleId: string) {
	return SUDOER_MODULES.find((m) => m.id === moduleId) ?? null;
}

export function getEntity(moduleId: string, entityId: string) {
	const mod = getModule(moduleId);
	return mod?.entities.find((e) => e.id === entityId) ?? null;
}

export function getEntityById(entityId: string) {
	for (const mod of SUDOER_MODULES) {
		const entity = mod.entities.find((e) => e.id === entityId);
		if (entity) return { module: mod, entity };
	}
	return null;
}

export function allEntities() {
	return SUDOER_MODULES.flatMap((m) =>
		m.entities.map((e) => ({
			module: m,
			entity: e
		}))
	);
}

import { relations } from 'drizzle-orm';
import { boolean, foreignKey, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { AuthUserSchema } from '../../auth/auth.schema';
import { MasterActionSchema, MasterStatusSchema } from '../../master/master.schema';
import {
	WrapperActionUserSchema,
	WrapperCreateUpdateSchema,
	WrapperIdSerialSchema,
	WrapperIdUuidSchema,
	WrapperMasterStatusSchema
} from '../../wrapper/wrapper.schema';

export const InfoDocsCategory = pgTable('info_docs_category', {
	...WrapperIdSerialSchema(),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	...WrapperMasterStatusSchema(),
	...WrapperActionUserSchema(),
	...WrapperCreateUpdateSchema()
});

export const InfoDocsContentType = pgTable('info_docs_content_type', {
	...WrapperIdSerialSchema(),
	name: text('name').notNull(),
	...WrapperMasterStatusSchema(),
	...WrapperActionUserSchema(),
	...WrapperCreateUpdateSchema()
});

export const InfoDocsDocument = pgTable(
	'info_docs_document',
	{
		...WrapperIdUuidSchema(),
		title: text('title').notNull(),
		content: text('content').notNull(),
		contentType: integer('content_type')
			.notNull()
			.references(() => InfoDocsContentType.id, {
				onDelete: 'cascade'
			}),
		mediaUrl: text('media_url'),
		published: boolean('published').notNull().default(false),
		category: integer('category')
			.notNull()
			.references(() => InfoDocsCategory.id, { onDelete: 'cascade' }),
		parentDocument: uuid('parent_document'),
		sortOrder: integer('sort_order').notNull().default(0),
		...WrapperActionUserSchema(),
		...WrapperMasterStatusSchema(),
		...WrapperCreateUpdateSchema()
	},
	(table) => [
		foreignKey({
			columns: [table.parentDocument],
			foreignColumns: [table.id],
			name: 'fk_parent_document'
		}).onDelete('cascade')
	]
);

export const InfoDocsTag = pgTable('info_docs_tag', {
	...WrapperIdSerialSchema(),
	name: text('name').notNull(),
	...WrapperMasterStatusSchema(),
	...WrapperActionUserSchema(),
	...WrapperCreateUpdateSchema()
});

export const InfoDocumentTag = pgTable('info_docs_document_tag', {
	...WrapperIdSerialSchema(),
	documentId: uuid('document_id')
		.notNull()
		.references(() => InfoDocsDocument.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id')
		.notNull()
		.references(() => InfoDocsTag.id, { onDelete: 'cascade' }),
	...WrapperMasterStatusSchema(),
	...WrapperActionUserSchema(),
	...WrapperCreateUpdateSchema()
});

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const InfoDocsCategoryRelation = relations(InfoDocsCategory, ({ one, many }) => ({
	documents: many(InfoDocsDocument),
	masterStatus: one(MasterStatusSchema, {
		fields: [InfoDocsCategory.masterStatusId],
		references: [MasterStatusSchema.id]
	}),
	action: one(MasterActionSchema, {
		fields: [InfoDocsCategory.action],
		references: [MasterActionSchema.id]
	}),
	actionUser: one(AuthUserSchema, {
		fields: [InfoDocsCategory.actionUserId],
		references: [AuthUserSchema.id]
	})
}));

export const InfoDocsContentTypeRelation = relations(InfoDocsContentType, ({ one, many }) => ({
	documents: many(InfoDocsDocument),
	masterStatus: one(MasterStatusSchema, {
		fields: [InfoDocsContentType.masterStatusId],
		references: [MasterStatusSchema.id]
	}),
	action: one(MasterActionSchema, {
		fields: [InfoDocsContentType.action],
		references: [MasterActionSchema.id]
	}),
	actionUser: one(AuthUserSchema, {
		fields: [InfoDocsContentType.actionUserId],
		references: [AuthUserSchema.id]
	})
}));

export const InfoDocsDocumentRelation = relations(InfoDocsDocument, ({ one, many }) => ({
	category: one(InfoDocsCategory, {
		fields: [InfoDocsDocument.category],
		references: [InfoDocsCategory.id]
	}),
	contentType: one(InfoDocsContentType, {
		fields: [InfoDocsDocument.contentType],
		references: [InfoDocsContentType.id]
	}),
	parent: one(InfoDocsDocument, {
		fields: [InfoDocsDocument.parentDocument],
		references: [InfoDocsDocument.id],
		relationName: 'document_hierarchy'
	}),
	children: many(InfoDocsDocument, {
		relationName: 'document_hierarchy'
	}),
	documentTags: many(InfoDocumentTag),
	masterStatus: one(MasterStatusSchema, {
		fields: [InfoDocsDocument.masterStatusId],
		references: [MasterStatusSchema.id]
	}),
	action: one(MasterActionSchema, {
		fields: [InfoDocsDocument.action],
		references: [MasterActionSchema.id]
	}),
	actionUser: one(AuthUserSchema, {
		fields: [InfoDocsDocument.actionUserId],
		references: [AuthUserSchema.id]
	})
}));

export const InfoDocsTagRelation = relations(InfoDocsTag, ({ one, many }) => ({
	documentTags: many(InfoDocumentTag),
	masterStatus: one(MasterStatusSchema, {
		fields: [InfoDocsTag.masterStatusId],
		references: [MasterStatusSchema.id]
	}),
	action: one(MasterActionSchema, {
		fields: [InfoDocsTag.action],
		references: [MasterActionSchema.id]
	}),
	actionUser: one(AuthUserSchema, {
		fields: [InfoDocsTag.actionUserId],
		references: [AuthUserSchema.id]
	})
}));

export const InfoDocumentTagRelation = relations(InfoDocumentTag, ({ one }) => ({
	document: one(InfoDocsDocument, {
		fields: [InfoDocumentTag.documentId],
		references: [InfoDocsDocument.id]
	}),
	tag: one(InfoDocsTag, {
		fields: [InfoDocumentTag.tagId],
		references: [InfoDocsTag.id]
	}),
	masterStatus: one(MasterStatusSchema, {
		fields: [InfoDocumentTag.masterStatusId],
		references: [MasterStatusSchema.id]
	}),
	action: one(MasterActionSchema, {
		fields: [InfoDocumentTag.action],
		references: [MasterActionSchema.id]
	}),
	actionUser: one(AuthUserSchema, {
		fields: [InfoDocumentTag.actionUserId],
		references: [AuthUserSchema.id]
	})
}));

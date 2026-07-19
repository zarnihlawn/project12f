import { sql } from 'drizzle-orm';
import { integer, serial, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { MasterActionSchema, MasterStatusSchema } from '../master/master.schema';
import { AuthUserSchema } from '../schema';

export const WrapperIdUuidSchema = {
	id: uuid('id').defaultRandom().unique().notNull()
};

export const WrapperIdSerialSchema = {
	id: serial('id').unique().notNull()
};

export const WrapperCreateUpdateSchema = {
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdateFn(() => sql`now()`)
		.notNull()
};

export const WrapperMasterStatusSchema = {
	masterStatusId: integer('master_status_id')
		.notNull()
		.references(() => MasterStatusSchema.id, { onDelete: 'cascade' })
};

export const WrapperActionUserSchema = {
	actionDescription: varchar('action_description', { length: 255 }),
	action: varchar('action')
		.notNull()
		.references(() => MasterActionSchema.id, { onDelete: 'cascade' }),
	actionUserId: uuid('action_user_id')
		.notNull()
		.references(() => AuthUserSchema.id, { onDelete: 'cascade' })
};

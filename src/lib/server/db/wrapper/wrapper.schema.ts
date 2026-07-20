import { sql } from 'drizzle-orm';
import { integer, serial, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { AuthUserSchema } from '../auth/auth.schema';
import { MasterActionSchema, MasterStatusSchema } from '../master/master.schema';

/** Factory — never reuse the same column builder across tables (constraint name collisions). */
export const WrapperIdUuidSchema = () => ({
	id: uuid('id').defaultRandom().primaryKey()
});

export const WrapperIdSerialSchema = () => ({
	id: serial('id').primaryKey()
});

export const WrapperCreateUpdateSchema = () => ({
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdateFn(() => sql`now()`)
		.notNull()
});

export const WrapperMasterStatusSchema = () => ({
	masterStatusId: integer('master_status_id')
		.notNull()
		.references(() => MasterStatusSchema.id, { onDelete: 'cascade' })
});

export const WrapperActionUserSchema = () => ({
	actionDescription: varchar('action_description', { length: 255 }),
	action: integer('action')
		.notNull()
		.references(() => MasterActionSchema.id, { onDelete: 'cascade' }),
	actionUserId: text('action_user_id')
		.notNull()
		.references(() => AuthUserSchema.id, { onDelete: 'cascade' })
});

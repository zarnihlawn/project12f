import { pgTable, varchar } from 'drizzle-orm/pg-core';
import { WrapperCreateUpdateSchema, WrapperIdSerialSchema } from '../wrapper/wrapper.schema';

export const MasterStatusSchema = pgTable('master_status', {
	...WrapperIdSerialSchema,
	name: varchar('name', { length: 100 }).unique().notNull(),
	...WrapperCreateUpdateSchema
});

export const MasterActionSchema = pgTable('master_action', {
	...WrapperIdSerialSchema,
	name: varchar('name', { length: 100 }).unique().notNull(),
	...WrapperCreateUpdateSchema
});

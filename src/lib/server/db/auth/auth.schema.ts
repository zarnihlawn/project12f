import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const AuthUserSchema = pgTable('auth_user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	twoFactorEnabled: boolean('two_factor_enabled').default(false),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const AuthSessionSchema = pgTable(
	'auth_session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => AuthUserSchema.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const AuthAccountSchema = pgTable(
	'auth_account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => AuthUserSchema.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const AuthVerificationSchema = pgTable(
	'auth_verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const AuthTwoFactorSchema = pgTable('auth_two_factor', {
	id: text('id').primaryKey(),
	secret: text('secret').notNull(),
	backupCodes: text('backup_codes').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => AuthUserSchema.id, { onDelete: 'cascade' })
});

export const AuthUserSchemaRelation = relations(AuthUserSchema, ({ many }) => ({
	sessions: many(AuthSessionSchema),
	accounts: many(AuthAccountSchema),
	twoFactors: many(AuthTwoFactorSchema)
}));

export const AuthSessionSchemaRelation = relations(AuthSessionSchema, ({ one }) => ({
	user: one(AuthUserSchema, {
		fields: [AuthSessionSchema.userId],
		references: [AuthUserSchema.id]
	})
}));

export const AuthAccountSchemaRelation = relations(AuthAccountSchema, ({ one }) => ({
	user: one(AuthUserSchema, {
		fields: [AuthAccountSchema.userId],
		references: [AuthUserSchema.id]
	})
}));

export const AuthTwoFactorSchemaRelation = relations(AuthTwoFactorSchema, ({ one }) => ({
	user: one(AuthUserSchema, {
		fields: [AuthTwoFactorSchema.userId],
		references: [AuthUserSchema.id]
	})
}));

import { boolean, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['consumer', 'admin']);

export const usersTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: text('name').notNull(),

  email: text('email').notNull().unique(),
  password: text('password').notNull(),

  isVerifiedEmail: boolean('is_verified_email').default(false),

  role: userRoleEnum('role').notNull().default('consumer'),

  otp: text('otp'),
  otp_expires_at: text('otp_expires_at'),
  access_token: text('access_token'),
  refresh_token: text('refresh_token'),

  created_at: text('created_at').notNull(),
});

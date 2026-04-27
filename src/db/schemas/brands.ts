// Product brands
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const brandsTable = pgTable('brands', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  createdBy: uuid('created_by').references(() => usersTable.id),
});

import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';

export const categoriesTable = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),

    description: text('description'),
    imageUrl: text('image_url'),

    parentId: uuid('parent_id'), // 👈 self reference

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      parentIdx: index('parent_idx').on(table.parentId),
    };
  }
);

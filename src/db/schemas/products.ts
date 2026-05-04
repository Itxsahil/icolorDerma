import {
  pgTable,
  text,
  uuid,
  numeric,
  timestamp,
  index,
  integer,
  primaryKey,
  json,
} from 'drizzle-orm/pg-core';

//!  PRODUCTS

export const productsTable = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    sku: text('sku').notNull().unique(),

    description: text('description').notNull(),
    shortDescription: text('short_description'),

    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: numeric('compare_at_price', { precision: 10, scale: 2 }),
    currency: text('currency').notNull().default('INR'),

    brandId: uuid('brand_id'),

    ingredients: text('ingredients'),
    howToUse: text('how_to_use'),
    skinType: text('skin_type'),

    rating: numeric('rating', { precision: 3, scale: 2 }).default('0'),
    reviewCount: integer('review_count').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: index('product_slug_idx').on(table.slug),
    brandIdx: index('product_brand_idx').on(table.brandId),
  })
);

//!  PRODUCT ↔ CATEGORY

export const productCategoriesTable = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => productsTable.id),

    categoryId: uuid('category_id').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.categoryId] }),
    categoryIdx: index('product_category_idx').on(t.categoryId),
  })
);

export const productImagesTable = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),

  productId: uuid('product_id')
    .notNull()
    .references(() => productsTable.id),

  urls: json('urls').$type<{ image: string; position: number }[]>().notNull().default([]),
  position: integer('position').default(0),
});

//! INVENTORY

export const inventoryTable = pgTable('inventory', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => productsTable.id),

  stock: integer('stock').notNull().default(0),
});

//! TAGS
export const tagsTable = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
});

//!  PRODUCT ↔ TAGS
export const productTagsTable = pgTable(
  'product_tags',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => productsTable.id),

    tagId: uuid('tag_id')
      .notNull()
      .references(() => tagsTable.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.tagId] }),
    tagIdx: index('product_tag_idx').on(t.tagId),
  })
);

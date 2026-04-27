import { pgTable, uuid, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { productsTable } from './products';

export const cartsTable = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),

  userId: uuid('user_id').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cartItemsTable = pgTable(
  'cart_items',
  {
    cartId: uuid('cart_id')
      .notNull()
      .references(() => cartsTable.id),

    productId: uuid('product_id')
      .notNull()
      .references(() => productsTable.id),

    quantity: integer('quantity').notNull().default(1),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cartId, t.productId] }),
  })
);

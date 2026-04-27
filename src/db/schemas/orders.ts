import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  primaryKey,
  integer,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// !   ENUMS
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'failed',
  'shipped',
  'delivered',
  'cancelled',
]);

export const paymentStatusEnum = pgEnum('payment_status', ['created', 'success', 'failed']);

// !   ADDRESSES
export const addressesTable = pgTable(
  'addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id').notNull(),

    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),

    line1: text('line1').notNull(),
    line2: text('line2'),

    city: text('city').notNull(),
    state: text('state').notNull(),
    postalCode: text('postal_code').notNull(),
    country: text('country').notNull().default('India'),

    isDefault: boolean('is_default').default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('addresses_user_idx').on(table.userId),
  })
);

// !   ORDERS
export const ordersTable = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id').notNull(),
    addressId: uuid('address_id').notNull(),

    status: orderStatusEnum('status').notNull().default('pending'),

    totalAmount: numeric('total_amount', {
      precision: 10,
      scale: 2,
    }).notNull(),

    currency: text('currency').default('INR'),

    // snapshot (important)
    email: text('email').notNull(),
    phone: text('phone'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index('orders_user_idx').on(table.userId),
  })
);

// !   ORDER ITEMS
export const orderItemsTable = pgTable(
  'order_items',
  {
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersTable.id),

    productId: uuid('product_id').notNull(),

    name: text('name').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),

    quantity: integer('quantity').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orderId, t.productId] }),
  })
);

//!    PAYMENTS (RAZORPAY READY)
export const paymentsTable = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersTable.id),

    provider: text('provider').notNull().default('razorpay'),

    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),

    status: paymentStatusEnum('status').notNull(),

    razorpayOrderId: text('razorpay_order_id'),
    razorpayPaymentId: text('razorpay_payment_id'),
    razorpaySignature: text('razorpay_signature'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index('payments_order_idx').on(table.orderId),
  })
);

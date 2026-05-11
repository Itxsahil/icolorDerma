import db from '@/db';
import {
  cartItemsTable,
  cartsTable,
  inventoryTable,
  ordersTable,
  paymentsTable,
  productsTable,
  addressesTable,
  orderItemsTable,
} from '@/db/schemas';
import asyncHandler from '@/utils/asyncHandler';
import { createRazorpayOrder, verifyWebhookSignature } from '@/utils/razorpay';
import { eq } from 'drizzle-orm';
import { sendOrderConfirmationEmail, formatOrderForEmail } from '@/services/email.service';
import { ApiResponse } from '@/utils/ApiResponse';

export const createOrders = asyncHandler(async (req, res) => {
  const userId = req.user?.id as string;

  const { cartId, addressId } = req.body;

  const cartWithProducts = await db
    .select({
      cartId: cartsTable.id,
      userId: cartsTable.userId,
      quantity: cartItemsTable.quantity,
      product: {
        id: productsTable.id,
        name: productsTable.name,
        price: productsTable.price,
        currency: productsTable.currency,
      },
      stock: inventoryTable.stock,
    })
    .from(cartsTable)
    .leftJoin(cartItemsTable, eq(cartItemsTable.cartId, cartsTable.id))
    .leftJoin(productsTable, eq(productsTable.id, cartItemsTable.productId))
    .innerJoin(inventoryTable, eq(inventoryTable.productId, productsTable.id))
    .where(eq(cartsTable.id, cartId));

  const amount = cartWithProducts.reduce((total, item) => {
    if (item?.product?.price && item.quantity) {
      return total + Number(item?.product?.price) * item.quantity;
    }
    return total;
  }, 0);

  const rpOrder = await createRazorpayOrder(amount, cartId, {
    userId,
    addressId,
    cartId,
  });

  // Create order in database
  const [order] = await db
    .insert(ordersTable)
    .values({
      userId,
      addressId,
      totalAmount: amount.toFixed(2),
      email: req.user?.email || '',
      phone: '', // You might want to get this from address
      status: 'pending',
    })
    .returning();

  // Create order items from cart
  const orderItems = cartWithProducts
    .filter((item) => item.product && item.quantity && item.quantity > 0)
    .map((item) => ({
      orderId: order.id,
      productId: item.product!.id,
      name: item.product!.name,
      price: item.product!.price,
      quantity: item.quantity!,
    }));

  if (orderItems.length > 0) {
    await db.insert(orderItemsTable).values(orderItems);
  }

  // Create payment record
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      orderId: order.id, // Database order ID
      amount: amount.toFixed(2), // Convert to string with 2 decimals
      status: 'created',
      razorpayOrderId: rpOrder.id, // Store Razorpay order ID
    })
    .returning();

  // Send response to frontend
  res.status(201).json({
    success: true,
    data: {
      order,
      payment,
      razorpayOrder: {
        id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
      },
    },
    message: 'Order created successfully',
  });
});

export const razorpayWebHookHandler = asyncHandler(async (req, res) => {
  const body = req.body;
  const signature = req.headers?.['x-razorpay-signature'] as string;

  if (!signature) {
    res.status(400).json({
      success: false,
      message: 'Missing webhook signature',
    });
    return;
  }

  // Verify webhook signature using the utility function
  const isValid = verifyWebhookSignature(JSON.stringify(body), signature);

  if (!isValid) {
    res.status(400).json({
      success: false,
      message: 'Invalid webhook signature',
    });
    return;
  }

  // Process webhook event
  const event = body.event;
  const payload = body.payload;

  try {
    switch (event) {
      case 'payment.captured':
        // Payment successful
        const paymentEntity = payload.payment.entity;
        const razorpayOrderId = paymentEntity.order_id;

        // Update payment status
        await db
          .update(paymentsTable)
          .set({
            status: 'success',
            razorpayPaymentId: paymentEntity.id,
          })
          .where(eq(paymentsTable.razorpayOrderId, razorpayOrderId));

        // Get payment record to find order
        const [payment] = await db
          .select()
          .from(paymentsTable)
          .where(eq(paymentsTable.razorpayOrderId, razorpayOrderId));

        if (payment) {
          // Update order status
          await db
            .update(ordersTable)
            .set({ status: 'paid' })
            .where(eq(ordersTable.id, payment.orderId));

          // Fetch complete order details for email
          const [order] = await db
            .select({
              id: ordersTable.id,
              userId: ordersTable.userId,
              totalAmount: ordersTable.totalAmount,
              email: ordersTable.email,
              createdAt: ordersTable.createdAt,
              address: {
                fullName: addressesTable.fullName,
                phone: addressesTable.phone,
                line1: addressesTable.line1,
                line2: addressesTable.line2,
                city: addressesTable.city,
                state: addressesTable.state,
                postalCode: addressesTable.postalCode,
                country: addressesTable.country,
              },
            })
            .from(ordersTable)
            .innerJoin(addressesTable, eq(ordersTable.addressId, addressesTable.id))
            .where(eq(ordersTable.id, payment.orderId));

          // Fetch order items
          const items = await db
            .select()
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, payment.orderId));

          if (order && items.length > 0) {
            // Format order data for email
            const emailData = formatOrderForEmail(order, items, order.address);

            // Send order confirmation email
            try {
              await sendOrderConfirmationEmail({
                to: order.email,
                customerName: order.address.fullName,
                transactionId: paymentEntity.id,
                ...emailData,
              });
              console.log(`Order confirmation email sent to ${order.email}`);
            } catch (emailError) {
              console.error('Failed to send order confirmation email:', emailError);
              // Don't fail the webhook if email fails
            }
          }
        }
        break;

      case 'payment.failed':
        // Payment failed
        const failedPayment = payload.payment.entity;
        await db
          .update(paymentsTable)
          .set({ status: 'failed' })
          .where(eq(paymentsTable.razorpayOrderId, failedPayment.order_id));

        // Update order status to failed
        const [failedPaymentRecord] = await db
          .select()
          .from(paymentsTable)
          .where(eq(paymentsTable.razorpayOrderId, failedPayment.order_id));

        if (failedPaymentRecord) {
          await db
            .update(ordersTable)
            .set({ status: 'failed' })
            .where(eq(ordersTable.id, failedPaymentRecord.orderId));
        }
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

export const getAllOrdersClient = asyncHandler(async (req, res) => {
  const userId = req.user?.id as string;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  try {
    // Fetch all orders for the user with address details
    const orders = await db
      .select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        totalAmount: ordersTable.totalAmount,
        status: ordersTable.status,
        email: ordersTable.email,
        phone: ordersTable.phone,
        createdAt: ordersTable.createdAt,
        address: {
          fullName: addressesTable.fullName,
          phone: addressesTable.phone,
          line1: addressesTable.line1,
          line2: addressesTable.line2,
          city: addressesTable.city,
          state: addressesTable.state,
          postalCode: addressesTable.postalCode,
          country: addressesTable.country,
        },
      })
      .from(ordersTable)
      .innerJoin(addressesTable, eq(ordersTable.addressId, addressesTable.id))
      .where(eq(ordersTable.userId, userId))
      .orderBy(ordersTable.createdAt);

    // Fetch order items for all orders
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, order.id));

        return {
          ...order,
          items,
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        };
      })
    );

    res.status(200).json({
      success: true,
      data: ordersWithItems,
      message: 'Orders retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
});

export const getOrderById = asyncHandler(async (req, res) => {
  const userId = req.user?.id as string;
  const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;

  if (!orderId) {
    res.status(400).json({
      success: false,
      message: 'Order ID is required',
    });
    return;
  }

  try {
    // Fetch order with address and items
    const [order] = await db
      .select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        totalAmount: ordersTable.totalAmount,
        status: ordersTable.status,
        email: ordersTable.email,
        phone: ordersTable.phone,
        createdAt: ordersTable.createdAt,
        address: {
          fullName: addressesTable.fullName,
          phone: addressesTable.phone,
          line1: addressesTable.line1,
          line2: addressesTable.line2,
          city: addressesTable.city,
          state: addressesTable.state,
          postalCode: addressesTable.postalCode,
          country: addressesTable.country,
        },
      })
      .from(ordersTable)
      .innerJoin(addressesTable, eq(ordersTable.addressId, addressesTable.id))
      .where(eq(ordersTable.id, orderId));

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check if order belongs to user (security check)
    if (order.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized to view this order',
      });
      return;
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));

    // Fetch payment information
    const [payment] = await db
      .select({
        id: paymentsTable.id,
        status: paymentsTable.status,
        amount: paymentsTable.amount,
        razorpayPaymentId: paymentsTable.razorpayPaymentId,
        razorpayOrderId: paymentsTable.razorpayOrderId,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.orderId, orderId));

    res.status(200).json({
      success: true,
      data: {
        ...order,
        items,
        payment: payment || null,
      },
      message: 'Order retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
    });
  }
});

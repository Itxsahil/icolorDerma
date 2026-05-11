import { Resend } from 'resend';
import 'dotenv/config';
import { orderConfirmationTemplate, orderStatusTemplate } from '@/utils/Templates/order.template';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
}

interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface SendOrderConfirmationParams {
  to: string;
  customerName: string;
  orderId: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: string;
  shipping: string;
  total: string;
  address: Address;
  paymentMethod: string;
  transactionId?: string;
}

interface SendOrderStatusParams {
  to: string;
  customerName: string;
  orderId: string;
  status: string;
  statusMessage: string;
  trackingUrl?: string;
}

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (params: SendOrderConfirmationParams) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Order Confirmation - ${params.orderId}`,
      html: orderConfirmationTemplate.html(params),
      text: orderConfirmationTemplate.text(params),
    });

    if (error) {
      console.error('Error sending order confirmation email:', error);
      throw error;
    }

    console.log('Order confirmation email sent:', data);
    return data;
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    throw error;
  }
};

/**
 * Send order status update email
 */
export const sendOrderStatusEmail = async (params: SendOrderStatusParams) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Order Update - ${params.orderId}`,
      html: orderStatusTemplate.html(params),
      text: orderStatusTemplate.text(params),
    });

    if (error) {
      console.error('Error sending order status email:', error);
      throw error;
    }

    console.log('Order status email sent:', data);
    return data;
  } catch (error) {
    console.error('Failed to send order status email:', error);
    throw error;
  }
};

/**
 * Helper function to format order data for email
 */
export const formatOrderForEmail = (order: any, items: any[], address: any) => {
  return {
    orderId: order.id.slice(0, 8).toUpperCase(),
    orderDate: new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: (parseFloat(item.price) * item.quantity).toFixed(2),
    })),
    subtotal: order.totalAmount,
    shipping: '0', // Free shipping
    total: order.totalAmount,
    address: {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    },
    paymentMethod: 'Razorpay',
  };
};

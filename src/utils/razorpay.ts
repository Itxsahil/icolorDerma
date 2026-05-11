import Razorpay from 'razorpay';
import crypto from 'crypto';
import 'dotenv/config';
// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Validate Razorpay configuration
const validateRazorpayConfig = (): void => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️  Razorpay credentials not configured. Payment features will not work.');
  }
};

// Call validation on module load
validateRazorpayConfig();

// Type definitions for better type safety
interface RazorpayOrderOptions {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  captured: boolean;
  email?: string;
  contact?: string;
  created_at: number;
}

interface RazorpayRefund {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  created_at: number;
}

export const createRazorpayOrder = async (
  amount: number,
  orderId: string,
  notes?: Record<string, string>
): Promise<RazorpayOrder> => {
  try {
    const options: RazorpayOrderOptions = {
      amount: Math.round(amount * 100), // Convert rupees to paise
      currency: 'INR',
      receipt: `orderId-${Date.now()}`,
      notes: {
        orderId: orderId,
        ...notes,
      },
    };

    const order = await razorpayInstance.orders.create(options);
    return order as RazorpayOrder;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
  }
};

export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || '';

    const generatedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    return generatedSignature === razorpaySignature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

export const verifyWebhookSignature = (webhookBody: string, webhookSignature: string): boolean => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    const expectedSignature = crypto.createHmac('sha256', secret).update(webhookBody).digest('hex');

    return expectedSignature === webhookSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

export const fetchPaymentDetails = async (paymentId: string): Promise<RazorpayPayment> => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment as RazorpayPayment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
};

export const fetchOrderDetails = async (razorpayOrderId: string): Promise<RazorpayOrder> => {
  try {
    const order = await razorpayInstance.orders.fetch(razorpayOrderId);
    return order as RazorpayOrder;
  } catch (error) {
    console.error('Error fetching order details:', error);
    throw new Error('Failed to fetch order details');
  }
};

export const fetchOrderPayments = async (
  razorpayOrderId: string
): Promise<{ items: RazorpayPayment[] }> => {
  try {
    const payments = await razorpayInstance.orders.fetchPayments(razorpayOrderId);
    return payments as { items: RazorpayPayment[] };
  } catch (error) {
    console.error('Error fetching order payments:', error);
    throw new Error('Failed to fetch order payments');
  }
};

export const createRefund = async (
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>
): Promise<RazorpayRefund> => {
  try {
    const options: Record<string, any> = {
      ...(amount && { amount: Math.round(amount * 100) }), // Convert to paise if provided
      notes,
    };

    const refund = await razorpayInstance.payments.refund(paymentId, options);
    return refund as RazorpayRefund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error('Failed to create refund');
  }
};

export const fetchRefundDetails = async (
  paymentId: string,
  refundId: string
): Promise<RazorpayRefund> => {
  try {
    const refund = await razorpayInstance.payments.fetchRefund(paymentId, refundId);
    return refund as RazorpayRefund;
  } catch (error) {
    console.error('Error fetching refund details:', error);
    throw new Error('Failed to fetch refund details');
  }
};

export const capturePayment = async (
  paymentId: string,
  amount: number,
  currency: string = 'INR'
): Promise<RazorpayPayment> => {
  try {
    const payment = await razorpayInstance.payments.capture(
      paymentId,
      Math.round(amount * 100), // Convert to paise
      currency
    );
    return payment as RazorpayPayment;
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new Error('Failed to capture payment');
  }
};

export const getRazorpayKeyId = (): string => {
  return process.env.RAZORPAY_KEY_ID || '';
};

export const paiseToRupees = (paise: number): number => {
  return paise / 100;
};

export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

// Export the Razorpay instance for advanced use cases
export default razorpayInstance;

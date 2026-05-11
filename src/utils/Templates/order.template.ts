const APP_NAME = process.env.APP_NAME || 'Beauty Shop';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@beautyshop.com';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || 'Your Company Address';

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

interface OrderConfirmationData {
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

interface OrderStatusData {
  customerName: string;
  orderId: string;
  status: string;
  statusMessage: string;
  trackingUrl?: string;
}

// Order Confirmation Email Template
export const orderConfirmationTemplate = {
  html: (data: OrderConfirmationData) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Order Confirmation - ${APP_NAME}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

        body {
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .wrapper {
            width: 100%;
            background-color: #f4f6f8;
            padding: 40px 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            margin: 0 0 8px 0;
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
        }

        .header p {
            margin: 0;
            color: #b8b8d1;
            font-size: 14px;
        }

        .success-badge {
            background-color: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            display: inline-block;
            font-size: 14px;
            font-weight: 600;
            margin: 20px 0 0 0;
        }

        .body {
            padding: 40px;
        }

        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a2e;
            margin: 0 0 12px 0;
        }

        .message {
            font-size: 15px;
            color: #555770;
            line-height: 1.6;
            margin: 0 0 32px 0;
        }

        .order-summary {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
        }

        .order-summary h2 {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: #1a1a2e;
        }

        .order-info {
            display: table;
            width: 100%;
            margin-bottom: 16px;
        }

        .order-info-row {
            display: table-row;
        }

        .order-info-label {
            display: table-cell;
            padding: 8px 0;
            font-size: 13px;
            color: #6b7280;
            width: 40%;
        }

        .order-info-value {
            display: table-cell;
            padding: 8px 0;
            font-size: 13px;
            color: #1a1a2e;
            font-weight: 500;
            text-align: right;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
        }

        .items-table th {
            background-color: #f9fafb;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e5e7eb;
        }

        .items-table td {
            padding: 16px 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            color: #1a1a2e;
        }

        .items-table tr:last-child td {
            border-bottom: none;
        }

        .item-name {
            font-weight: 500;
        }

        .item-qty {
            color: #6b7280;
            text-align: center;
        }

        .item-price {
            text-align: right;
            font-weight: 500;
        }

        .totals {
            border-top: 2px solid #e5e7eb;
            padding-top: 16px;
            margin-top: 16px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }

        .total-row.grand-total {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a2e;
            padding-top: 16px;
            border-top: 2px solid #1a1a2e;
            margin-top: 8px;
        }

        .address-section {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
        }

        .address-section h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
            color: #1a1a2e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .address-section p {
            margin: 4px 0;
            font-size: 14px;
            color: #555770;
            line-height: 1.6;
        }

        .cta-button {
            display: inline-block;
            background-color: #1a1a2e;
            color: #ffffff;
            padding: 14px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            margin: 16px 0;
        }

        .divider {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 32px 0;
        }

        .help-section {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 4px;
            margin: 24px 0;
        }

        .help-section p {
            margin: 0;
            font-size: 13px;
            color: #1e40af;
            line-height: 1.6;
        }

        .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }

        .footer p {
            font-size: 12px;
            color: #6b7280;
            margin: 0 0 8px 0;
            line-height: 1.6;
        }

        .social-links {
            margin: 16px 0;
        }

        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #6b7280;
            text-decoration: none;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>${APP_NAME}</h1>
                <p>Thank you for your order!</p>
                <div class="success-badge">✓ Order Confirmed</div>
            </div>

            <div class="body">
                <p class="greeting">Hi ${data.customerName},</p>
                <p class="message">
                    Great news! Your order has been confirmed and is being processed. We'll send you another email when your order ships.
                </p>

                <div class="order-summary">
                    <h2>Order Summary</h2>
                    <div class="order-info">
                        <div class="order-info-row">
                            <div class="order-info-label">Order Number:</div>
                            <div class="order-info-value"><strong>${data.orderId}</strong></div>
                        </div>
                        <div class="order-info-row">
                            <div class="order-info-label">Order Date:</div>
                            <div class="order-info-value">${data.orderDate}</div>
                        </div>
                        <div class="order-info-row">
                            <div class="order-info-label">Payment Method:</div>
                            <div class="order-info-value">${data.paymentMethod}</div>
                        </div>
                        ${
                          data.transactionId
                            ? `
                        <div class="order-info-row">
                            <div class="order-info-label">Transaction ID:</div>
                            <div class="order-info-value">${data.transactionId}</div>
                        </div>
                        `
                            : ''
                        }
                    </div>
                </div>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items
                          .map(
                            (item) => `
                        <tr>
                            <td class="item-name">${item.name}</td>
                            <td class="item-qty">${item.quantity}</td>
                            <td class="item-price">₹${parseFloat(item.price).toLocaleString()}</td>
                        </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>₹${parseFloat(data.subtotal).toLocaleString()}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>${data.shipping === '0' ? 'Free' : '₹' + parseFloat(data.shipping).toLocaleString()}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Total:</span>
                        <span>₹${parseFloat(data.total).toLocaleString()}</span>
                    </div>
                </div>

                <div class="address-section">
                    <h3>📍 Delivery Address</h3>
                    <p><strong>${data.address.fullName}</strong></p>
                    <p>${data.address.line1}</p>
                    ${data.address.line2 ? `<p>${data.address.line2}</p>` : ''}
                    <p>${data.address.city}, ${data.address.state} - ${data.address.postalCode}</p>
                    <p>${data.address.country}</p>
                    <p>Phone: ${data.address.phone}</p>
                </div>

                <center>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders" class="cta-button">
                        View Order Details
                    </a>
                </center>

                <hr class="divider">

                <div class="help-section">
                    <p>
                        <strong>Need help?</strong> If you have any questions about your order, please contact our support team at <a href="mailto:${SUPPORT_EMAIL}" style="color: #1e40af; text-decoration: none;">${SUPPORT_EMAIL}</a>
                    </p>
                </div>
            </div>

            <div class="footer">
                <p><strong>${APP_NAME}</strong></p>
                <p>${COMPANY_ADDRESS}</p>
                <p style="margin-top: 16px;">This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`,

  text: (data: OrderConfirmationData) => `
${APP_NAME} - Order Confirmation
======================================

Hi ${data.customerName},

Thank you for your order! Your order has been confirmed and is being processed.

ORDER DETAILS
-------------
Order Number: ${data.orderId}
Order Date: ${data.orderDate}
Payment Method: ${data.paymentMethod}
${data.transactionId ? `Transaction ID: ${data.transactionId}` : ''}

ITEMS ORDERED
-------------
${data.items.map((item) => `${item.name} x ${item.quantity} - ₹${parseFloat(item.price).toLocaleString()}`).join('\n')}

ORDER TOTAL
-----------
Subtotal: ₹${parseFloat(data.subtotal).toLocaleString()}
Shipping: ${data.shipping === '0' ? 'Free' : '₹' + parseFloat(data.shipping).toLocaleString()}
Total: ₹${parseFloat(data.total).toLocaleString()}

DELIVERY ADDRESS
----------------
${data.address.fullName}
${data.address.line1}
${data.address.line2 || ''}
${data.address.city}, ${data.address.state} - ${data.address.postalCode}
${data.address.country}
Phone: ${data.address.phone}

--------------------------------------
Need help? Contact us at ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
`,
};

// Order Status Update Email Template
export const orderStatusTemplate = {
  html: (data: OrderStatusData) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Update - ${APP_NAME}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .wrapper { width: 100%; background-color: #f4f6f8; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); padding: 40px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; }
        .status-badge { background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 50px; display: inline-block; font-size: 14px; font-weight: 600; margin: 20px 0 0 0; }
        .body { padding: 40px; }
        .greeting { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 12px 0; }
        .message { font-size: 15px; color: #555770; line-height: 1.6; margin: 0 0 32px 0; }
        .order-id { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }
        .order-id strong { font-size: 16px; color: #1a1a2e; }
        .cta-button { display: inline-block; background-color: #1a1a2e; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin: 16px 0; }
        .footer { background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { font-size: 12px; color: #6b7280; margin: 0 0 8px 0; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="status-badge">${data.status}</div>
            </div>
            <div class="body">
                <p class="greeting">Hi ${data.customerName},</p>
                <p class="message">${data.statusMessage}</p>
                <div class="order-id">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; margin-bottom: 8px;">Order Number</p>
                    <strong>${data.orderId}</strong>
                </div>
                ${
                  data.trackingUrl
                    ? `
                <center>
                    <a href="${data.trackingUrl}" class="cta-button">Track Your Order</a>
                </center>
                `
                    : ''
                }
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`,

  text: (data: OrderStatusData) => `
${APP_NAME} - Order Update
======================================

Hi ${data.customerName},

${data.statusMessage}

Order Number: ${data.orderId}
Status: ${data.status}

${data.trackingUrl ? `Track your order: ${data.trackingUrl}` : ''}

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
`,
};

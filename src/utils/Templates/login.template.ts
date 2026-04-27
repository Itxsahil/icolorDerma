const APP_NAME = process.env.APP_NAME || 'Our App';
export const loginTemplate = {
  html: ({ name, otp }: { name: string; otp: string }) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Your Login Code - ${APP_NAME}</title>
    <style>
        /* Reset */
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
            max-width: 560px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .header {
            background-color: #1a1a2e;
            padding: 32px 40px;
            text-align: center;
        }

        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: 0.5px;
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

        .otp-label {
            font-size: 12px;
            font-weight: 600;
            color: #888aa0;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 10px 0;
        }

        .otp-box {
            background-color: #f4f6f8;
            border: 2px dashed #d0d4e8;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 32px;
        }

        .otp-code {
            font-size: 38px;
            font-weight: 700;
            color: #1a1a2e;
            letter-spacing: 10px;
            font-family: 'Courier New', Courier, monospace;
        }

        .otp-expiry {
            font-size: 13px;
            color: #888aa0;
            margin: 10px 0 0 0;
        }

        .divider {
            border: none;
            border-top: 1px solid #eef0f6;
            margin: 0 0 24px 0;
        }

        .warning {
            font-size: 13px;
            color: #888aa0;
            line-height: 1.6;
            margin: 0;
        }

        .warning strong {
            color: #e05252;
        }

        .footer {
            background-color: #f4f6f8;
            padding: 24px 40px;
            text-align: center;
        }

        .footer p {
            font-size: 12px;
            color: #aab0c6;
            margin: 0;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>${APP_NAME}</h1>
            </div>

            <div class="body">
                <p class="greeting">Hello, ${name}</p>
                <p class="message">
                    We received a request to sign in to your account. Use the one-time password below to complete your login. This code is valid for <strong>10 minutes</strong>.
                </p>

                <p class="otp-label">Your one-time password</p>
                <div class="otp-box">
                    <div class="otp-code">${otp}</div>
                    <p class="otp-expiry">Expires in 10 minutes</p>
                </div>

                <hr class="divider">

                <p class="warning">
                    <strong>Did not request this?</strong> If you did not attempt to log in, please ignore this email or contact support immediately. Never share this code with anyone.
                </p>
            </div>

            <div class="footer">
                <p>This is an automated message from ${APP_NAME}. Please do not reply to this email.</p>
                <p style="margin-top: 8px;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`,

  text: ({ name, otp }: { name: string; otp: string }) =>
    `${APP_NAME} - One-Time Login Password
======================================

Hello ${name},

We received a request to sign in to your account.

Your one-time password is: ${otp}

This code expires in 10 minutes.

--------------------------------------
Did not request this? If you did not attempt to log in, please ignore this email or contact support immediately. Never share this code with anyone.

This is an automated message from ${APP_NAME}. Please do not reply.
© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`,
};

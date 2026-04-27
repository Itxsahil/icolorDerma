import { Resend } from 'resend';
import 'dotenv/config';
const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
};

export const sendEmail = async ({ to, subject, text, html }: SendEmailParams) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <noreply@sahilkhan.site>',
      to,
      subject,
      ...(html ? { html } : { text: text ?? '' }),
    });

    if (error) {
      throw new Error(error.message || 'Failed to send email');
    }

    return data;
  } catch (err) {
    console.error('Email Error:', err);
    throw err; // 👈 important for upstream handling
  }
};

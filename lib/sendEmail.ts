// lib/sendEmail.ts
import nodemailer from "nodemailer";

interface EmailParams {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    content: string;
    encoding?: string; // ✅ Add this line
    type?: string;
    disposition?: string;
  }[];
}


export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments
}: EmailParams) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true, // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
    attachments,
  });
}

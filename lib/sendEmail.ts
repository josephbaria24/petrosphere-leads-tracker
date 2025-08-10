import sgMail from '@sendgrid/mail';

interface EmailParams {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    content: string;
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
  sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

  const msg = {
    to,
    from: 'jlb@petrosphere.com.ph', // must be a verified sender in SendGrid
    subject,
    text,
    html: html || text,
    attachments
  };

  await sgMail.send(msg);
}

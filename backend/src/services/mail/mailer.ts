import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | null = null;

export const isMailConfigured = (): boolean => !!config.mail.host;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
};

export const sendMail = async (message: MailMessage): Promise<void> => {
  if (!isMailConfigured()) {
    throw new Error('El envío de correos no está configurado (falta SMTP_HOST)');
  }
  await getTransporter().sendMail({ from: config.mail.from, ...message });
};

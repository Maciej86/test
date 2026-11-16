import nodemailer, { type SentMessageInfo, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { createI18n } from '@app/shared';
import { env } from '../env';

/** Jeden e-mail: zawsze HTML i wersja tekstowa (dla programów bez kolorów i przycisków). */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
}

/** Ustawienia serwera poczty. Mailpit i Mailgun różnią się tylko wartościami w `.env`; logowanie tylko z loginem. */
export const smtpOptions = (s: SmtpSettings): SMTPTransport.Options => ({
  host: s.host,
  port: s.port,
  secure: s.port === 465,
  ...(s.user ? { auth: { user: s.user, pass: s.password } } : {}),
});

export const createTransport = (): Transporter =>
  nodemailer.createTransport(
    smtpOptions({ host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, password: env.SMTP_PASSWORD }),
  );

let defaultTransport: Transporter | null = null;

/** Jedyne miejsce wysyłki e-maili w aplikacji. Nadawca: nazwa aplikacji i adres z `EMAIL_FROM`. */
export const sendEmail = async (message: EmailMessage, transport?: Transporter): Promise<SentMessageInfo> => {
  if (!message.text.trim()) throw new Error('sendEmail: empty text version');
  const t = createI18n().t;
  const via = transport ?? (defaultTransport ??= createTransport());
  return via.sendMail({
    from: { name: t('app_name', { ns: 'common' }), address: env.EMAIL_FROM },
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
};

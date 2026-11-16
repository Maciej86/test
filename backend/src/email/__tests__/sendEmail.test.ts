import { describe, expect, it } from 'vitest';
import nodemailer from 'nodemailer';
import { smtpOptions, sendEmail } from '../sendEmail';

const message = { to: 'anna.nowak@firma.pl', subject: 'Temat', html: '<p>Treść</p>', text: 'Treść' };

/** Transport, który niczego nie wysyła, tylko oddaje gotową wiadomość jako JSON. */
const jsonTransport = () => nodemailer.createTransport({ jsonTransport: true });

const sent = async () => {
  const transport = jsonTransport();
  const info = await sendEmail(message, transport);
  return JSON.parse(info.message as string) as {
    to: { address: string }[];
    from: { name: string; address: string };
    subject: string;
    html: string;
    text: string;
  };
};

describe('sendEmail', () => {
  it('sends to the given address with subject, html and non-empty text', async () => {
    const mail = await sent();
    expect(mail.to).toEqual([{ address: 'anna.nowak@firma.pl', name: '' }]);
    expect(mail.subject).toBe('Temat');
    expect(mail.html).toBe('<p>Treść</p>');
    expect(mail.text).toBe('Treść');
  });

  it('sets the sender name to the app name and the address from EMAIL_FROM', async () => {
    const mail = await sent();
    expect(mail.from).toEqual({ name: 'Urlopy i zadania', address: 'no-reply@localhost' });
  });

  it('logs in to SMTP only when SMTP_USER is set', () => {
    expect(smtpOptions({ host: 'h', port: 1025, user: '', password: '' })).toMatchObject({ host: 'h', port: 1025, secure: false });
    expect(smtpOptions({ host: 'h', port: 1025, user: '', password: '' })).not.toHaveProperty('auth');
    expect(smtpOptions({ host: 'smtp.eu.mailgun.org', port: 587, user: 'app@x', password: 'p' })).toMatchObject({
      host: 'smtp.eu.mailgun.org',
      port: 587,
      secure: false,
      auth: { user: 'app@x', pass: 'p' },
    });
    expect(smtpOptions({ host: 'h', port: 465, user: '', password: '' }).secure).toBe(true);
  });

  it('gives up on an unreachable mail server after 10 seconds, not minutes', () => {
    const o = smtpOptions({ host: 'h', port: 587, user: '', password: '' });
    expect(o.connectionTimeout).toBe(10_000);
    expect(o.greetingTimeout).toBe(10_000);
    expect(o.socketTimeout).toBe(10_000);
  });

  it('refuses an empty text version', async () => {
    await expect(sendEmail({ ...message, text: ' ' }, jsonTransport())).rejects.toThrow('text');
  });
});

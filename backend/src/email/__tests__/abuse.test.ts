import { describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { safeNextPath } from '@app/shared';
import { sendEmail } from '../sendEmail';
import { newLeaveRequestEmail, type NewLeaveRequestEmailData } from '../templates/newLeaveRequest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
const { emailAdminsAboutNewRequest } = await import('../notifyAdmins');

const data: NewLeaveRequestEmailData = {
  requestId: 128,
  employeeName: 'Jan Kowalski',
  leaveTypeName: 'Wypoczynkowy',
  dateFrom: '2027-02-08',
  dateTo: '2027-02-12',
  workingDays: 5,
  daysFromCarried: 3,
  daysFromAnnual: 2,
  leftAfter: 24,
  comment: null,
};

/** Cała wiadomość tak, jak poszłaby do serwera poczty (nagłówki i treść). */
const raw = async (d: NewLeaveRequestEmailData) => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const info = await sendEmail({ ...newLeaveRequestEmail(d), to: 'anna.nowak@firma.pl' }, transport);
  return (info.message as Buffer).toString('utf8');
};

const headers = (message: string) => message.split('\n\n')[0]!;

describe('abuse', () => {
  it('a name with a line break cannot add a hidden recipient (Bcc) to the email', async () => {
    const message = await raw({ ...data, employeeName: 'Jan\r\nBcc: zly@obca.pl\r\nX: y' });
    expect(headers(message)).not.toMatch(/^Bcc:/im);
    expect(headers(message)).not.toMatch(/^X: y/im);
    expect(headers(message)).toMatch(/^To: anna\.nowak@firma\.pl$/m);
  });

  it('a comment with a script, an image and a link arrives as plain text, not as HTML', () => {
    const comment = '<script>alert(1)</script><img src="https://zly.pl/x.png"><a href="https://zly.pl">kliknij</a>';
    const { html } = newLeaveRequestEmail({ ...data, comment });
    expect(html).not.toMatch(/<script|<img|<a href="https:\/\/zly/i);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('a very long comment (20 000 characters) still builds the email', () => {
    const { html, text } = newLeaveRequestEmail({ ...data, comment: 'ą'.repeat(20_000) });
    expect(text).toContain('ą'.repeat(20_000));
    expect(html.length).toBeGreaterThan(20_000);
  });

  it('i18n placeholders typed by a person are not filled in ({{employee}}, $t(…))', () => {
    const { text } = newLeaveRequestEmail({ ...data, comment: '{{employee}} $t(common:app_name)' });
    expect(text).toContain('Komentarz: {{employee}} $t(common:app_name)');
  });

  it('a recipient address with a second address hidden inside goes only to the admin list, never to the employee', async () => {
    const sendEmail = vi.fn(async () => ({}));
    await emailAdminsAboutNewRequest(
      { ...data, employeeName: 'jan@firma.pl, zly@obca.pl' },
      { listAdminEmails: async () => [{ name: 'Anna Nowak', email: 'anna.nowak@firma.pl' }], sendEmail },
    );
    expect(sendEmail.mock.calls.map((c) => (c as unknown as [{ to: string }])[0].to)).toEqual(['anna.nowak@firma.pl']);
  });

  it('the return address after login cannot lead to another site or out of the panel', () => {
    for (const next of ['https://obca.pl', '//obca.pl', '/\\obca.pl', '/admin/%2e%2e/login', '/admin/..%2f..%2flogin', 'javascript:alert(1)', '/admin/\tx']) {
      expect(safeNextPath(next)).toBeNull();
    }
  });
});

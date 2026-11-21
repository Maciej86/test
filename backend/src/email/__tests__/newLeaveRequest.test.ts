import { describe, expect, it } from 'vitest';
import { env } from '../../env';
import { newLeaveRequestEmail, type NewLeaveRequestEmailData } from '../templates/newLeaveRequest';

const data: NewLeaveRequestEmailData = {
  requestId: 128,
  employeeName: 'Jan Kowalski',
  leaveTypeName: 'Wypoczynkowy',
  dateFrom: '2027-02-08',
  dateTo: '2027-02-12',
  workingDays: 5,
  dayCount: 'working',
  autoApproved: false,
  daysFromCarried: 3,
  daysFromAnnual: 2,
  leftAfter: 24,
  comment: 'Ferie z dziećmi w górach.',
};

describe('newLeaveRequestEmail', () => {
  it('subject: "Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027"', () => {
    expect(newLeaveRequestEmail(data).subject).toBe('Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027');
  });

  it('html and text contain type, dates, 5 working days, "3 z zaległego, 2 z puli rocznej", "24 dni" and the comment', () => {
    const { html, text } = newLeaveRequestEmail(data);
    for (const body of [html, text]) {
      expect(body).toContain('Nowy wniosek urlopowy');
      expect(body).toContain('Jan Kowalski prosi o urlop. Wniosek czeka na Twoją decyzję.');
      expect(body).toContain('Wypoczynkowy');
      expect(body).toContain('08.02.2027 – 12.02.2027');
      expect(body).toMatch(/Dni(<[^>]+>|:\s|\s)+5 dni roboczych/);
      expect(body).toContain('3 z zaległego, 2 z puli rocznej');
      expect(body).toContain('24 dni');
      expect(body).toContain('Komentarz');
      expect(body).toContain('Ferie z dziećmi w górach.');
      expect(body).toContain('Moje konto');
    }
  });

  it('without a comment there is no "Komentarz" row', () => {
    for (const comment of [null, '', '   ']) {
      const { html, text } = newLeaveRequestEmail({ ...data, comment });
      expect(html).not.toContain('Komentarz');
      expect(text).not.toContain('Komentarz');
    }
  });

  it('leftAfter null → no "Z puli" and "Zostanie po zatwierdzeniu" rows', () => {
    const { html, text } = newLeaveRequestEmail({ ...data, daysFromCarried: 0, daysFromAnnual: 0, leftAfter: null });
    for (const body of [html, text]) {
      expect(body).not.toContain('Z puli');
      expect(body).not.toContain('Zostanie po zatwierdzeniu');
      expect(body).toContain('5 dni roboczych');
    }
  });

  it('button and text link to <FRONTEND_URL>/admin/leave-requests/128', () => {
    const link = `${env.FRONTEND_URL}/admin/leave-requests/128`;
    const { html, text } = newLeaveRequestEmail(data);
    expect(html).toContain(`href="${link}"`);
    expect(html).toContain('Otwórz wniosek');
    expect(text).toContain(`Otwórz wniosek: ${link}`);
  });

  it('escapes the comment and the names in html, keeps them as typed in text', () => {
    const evil = '<a href="https://zly.pl">kliknij</a> & "x"';
    const { html, text, subject } = newLeaveRequestEmail({ ...data, comment: evil, employeeName: '<b>Jan</b>', leaveTypeName: '<i>Typ</i>' });
    expect(html).not.toContain('<a href="https://zly.pl">');
    expect(html).not.toContain('<b>Jan</b>');
    expect(html).not.toContain('<i>Typ</i>');
    expect(html).toContain('&lt;a href=&quot;https://zly.pl&quot;&gt;kliknij&lt;/a&gt; &amp; &quot;x&quot;');
    expect(text).toContain(evil);
    expect(subject).toContain('<b>Jan</b>');
  });

  it('uses Polish plural forms: 1 dzień, 2 dni, 5 dni, 22 dni', () => {
    const left = (n: number) => newLeaveRequestEmail({ ...data, leftAfter: n }).text;
    expect(left(1)).toContain('Zostanie po zatwierdzeniu: 1 dzień');
    expect(left(2)).toContain('Zostanie po zatwierdzeniu: 2 dni');
    expect(left(5)).toContain('Zostanie po zatwierdzeniu: 5 dni');
    expect(left(22)).toContain('Zostanie po zatwierdzeniu: 22 dni');
    expect(left(0)).toContain('Zostanie po zatwierdzeniu: 0 dni');
  });

  it('no untranslated {{…}} and no missing keys in subject, html and text', () => {
    const { subject, html, text } = newLeaveRequestEmail(data);
    for (const body of [subject, html, text]) {
      expect(body).not.toMatch(/\{\{|\}\}/);
      expect(body).not.toMatch(/new_request\./);
    }
  });

  it('html is a complete light page no wider than 560 px', () => {
    const { html } = newLeaveRequestEmail(data);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('lang="pl"');
    expect(html).toContain('max-width:560px');
  });

  it('type without approval (sick leave): "Zgłoszona nieobecność" subject and heading, no "waits for your decision", calendar days', () => {
    const sick = { ...data, leaveTypeName: 'Chorobowe', dateFrom: '2026-11-15', dateTo: '2026-11-21', workingDays: 7, dayCount: 'calendar' as const, autoApproved: true, daysFromCarried: 0, daysFromAnnual: 0, leftAfter: null, comment: null };
    const mail = newLeaveRequestEmail(sick);
    expect(mail.subject).toBe('Zgłoszona nieobecność: Jan Kowalski, 15.11.2026–21.11.2026');
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain('Zgłoszona nieobecność');
      expect(body).toContain('Jan Kowalski zgłosił(a) nieobecność. Jest już zatwierdzona, nie wymaga Twojej decyzji.');
      expect(body).toContain('7 dni kalendarzowych');
      expect(body).not.toContain('czeka na Twoją decyzję');
      expect(body).not.toContain('Zostanie po zatwierdzeniu');
    }
  });
});

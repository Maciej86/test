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
      expect(body).toMatch(/Dni robocze(<[^>]+>|:\s|\s)+5/);
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
      expect(body).toContain('Dni robocze');
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
});

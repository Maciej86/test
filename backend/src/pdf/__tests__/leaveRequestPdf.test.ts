import { describe, expect, it } from 'vitest';
import { buildLeaveRequestPdf, leaveRequestPdfFileName, type LeaveRequestPdfData } from '../leaveRequestPdf';
import { renderPdf } from '../renderPdf';

const base: LeaveRequestPdfData = {
  id: 42,
  createdAt: '2026-11-17T09:15:00.000Z',
  employeeName: 'Jan Kowalski',
  leaveTypeName: 'Wypoczynkowy',
  deductsPool: true,
  dateFrom: '2026-12-21',
  dateTo: '2026-12-31',
  workingDays: 7,
  daysFromCarried: 2,
  daysFromAnnual: 5,
  poolYear: 2026,
  comment: 'Święta u rodziców.',
  decidedByName: 'Anna Nowak',
  decidedAt: '2026-12-01T23:30:00.000Z',
  dayCount: 'working',
  autoApproved: false,
};

/** Cały tekst dokumentu w kolejności, jedną linią. */
const textOf = (node: unknown): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (node && typeof node === 'object') {
    const n = node as Record<string, unknown>;
    return ['text', 'stack', 'columns', 'table', 'body', 'content'].map((k) => (k in n ? textOf(n[k]) : '')).join(' ');
  }
  return '';
};
const text = (data: Partial<LeaveRequestPdfData> = {}) => textOf(buildLeaveRequestPdf({ ...base, ...data })).replace(/\s+/g, ' ');

describe('buildLeaveRequestPdf', () => {
  it('shows app name, submission date, heading and number', () => {
    const t = text();
    expect(t).toContain('Urlopy i zadania');
    expect(t).toContain('Data złożenia: 17.11.2026');
    expect(t).toContain('Wniosek o urlop');
    expect(t).toContain('Nr 42');
  });

  it('shows employee, type, dates and working days with split', () => {
    const t = text();
    expect(t).toContain('Pracownik Jan Kowalski');
    expect(t).toContain('Typ urlopu Wypoczynkowy');
    expect(t).toContain('Termin 21.12.2026 – 31.12.2026');
    expect(t).toContain('Dni 7 dni roboczych (2 z zaległego, 5 z puli 2026)');
  });

  it('one-day request shows a single date', () => {
    const t = text({ dateTo: '2026-12-21', workingDays: 1, daysFromCarried: 0, daysFromAnnual: 1 });
    expect(t).toContain('Termin 21.12.2026 Dni 1 dzień roboczy (1 z puli 2026)');
  });

  it('type that does not deduct days has no split', () => {
    const t = text({ deductsPool: false, daysFromCarried: 0, daysFromAnnual: 0 });
    expect(t).toContain('Dni 7 dni roboczych Komentarz');
  });

  it('comment only when present', () => {
    expect(text()).toContain('Komentarz Święta u rodziców.');
    expect(text({ comment: null })).not.toContain('Komentarz');
  });

  it('decision with decided_by_name and date in Warsaw time', () => {
    expect(text()).toContain('Decyzja Zatwierdził(a) Anna Nowak, 02.12.2026');
  });

  it('sick leave approved automatically: calendar days and "Zatwierdzony automatycznie (typ bez zatwierdzania)"', () => {
    const t = text({ leaveTypeName: 'Chorobowe', deductsPool: false, workingDays: 7, dayCount: 'calendar', autoApproved: true, decidedByName: null, decidedAt: '2026-11-16T06:20:00.000Z' });
    expect(t).toContain('Dni 7 dni kalendarzowych');
    expect(t).toContain('Decyzja Zatwierdzony automatycznie (typ bez zatwierdzania), 16.11.2026');
  });

  it('missing decision name does not throw', () => {
    expect(() => text({ decidedByName: null, decidedAt: null })).not.toThrow();
    expect(text({ decidedByName: null, decidedAt: null })).toContain('Decyzja');
    expect(text({ decidedByName: null })).toContain('Decyzja Zatwierdzony 02.12.2026');
  });

  it('abuse: HTML in the comment stays plain text in the document', () => {
    expect(text({ comment: '<script>alert(1)</script>' })).toContain('Komentarz <script>alert(1)</script>');
  });

  it('two signature lines', () => {
    const t = text();
    expect(t).toContain('podpis pracownika');
    expect(t).toContain('podpis przełożonego');
  });

  it('is A4 portrait on white paper', () => {
    const doc = buildLeaveRequestPdf(base) as { pageSize: string; pageOrientation: string };
    expect(doc.pageSize).toBe('A4');
    expect(doc.pageOrientation).toBe('portrait');
  });

  it('full example with 500-char comment renders to %PDF', async () => {
    const comment = 'Zażółćgęśląjaźń'.repeat(34).slice(0, 500);
    const pdf = await renderPdf(buildLeaveRequestPdf({ ...base, comment }));
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('file name is ASCII: wniosek-urlopowy-<id>.pdf', () => {
    expect(leaveRequestPdfFileName(42)).toBe('wniosek-urlopowy-42.pdf');
    expect(leaveRequestPdfFileName(42)).toMatch(/^[\x20-\x7e]+$/);
  });
});

import { createI18n, formatDate } from '@app/shared';
import { theme } from '@app/shared/theme';

// Dokument „Wniosek o urlop” (moduł Moje urlopy, część 2; użyje go też moduł Wnioski urlopowe). Jasny jak papier,
// układ jak na podglądzie w makiecie (mockups/src/modules/my-leave/MyLeaveModals.tsx). Sama definicja dokumentu z
// gotowych danych: zapytania do bazy robi moduł, który pokazuje PDF, a plik tworzy renderPdf.

/** Zatwierdzony wniosek gotowy do wydruku. Daty dni `RRRR-MM-DD`, chwile jako tekst ISO. */
export interface LeaveRequestPdfData {
  id: number;
  createdAt: string;
  employeeName: string;
  leaveTypeName: string;
  deductsPool: boolean;
  dateFrom: string;
  dateTo: string;
  workingDays: number;
  daysFromCarried: number;
  daysFromAnnual: number;
  poolYear: number;
  comment: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
}

const color = (name: string, shade: number): string => theme.colors?.[name]?.[shade] ?? '';
const TEXT = color('dark', 9);
const MUTED = color('gray', 7);
const RULE = color('gray', 4);
const SIGN = color('gray', 6);

/** A4 ma 595 pt szerokości; marginesy ok. 2 cm. */
const MARGIN = 56;
const CONTENT_WIDTH = 595 - 2 * MARGIN;
const SIGN_GAP = 40;
const SIGN_WIDTH = (CONTENT_WIDTH - SIGN_GAP) / 2;

const i18n = createI18n();
const t = (key: string, values: Record<string, unknown> = {}): string => i18n.t(key, { ns: 'my-leave', ...values }) as string;

export const leaveRequestPdfFileName = (id: number): string => t('print_file_name', { id });

const termText = (d: LeaveRequestPdfData): string =>
  d.dateFrom === d.dateTo ? (formatDate(d.dateFrom) ?? '') : `${formatDate(d.dateFrom)} – ${formatDate(d.dateTo)}`;

const daysText = (d: LeaveRequestPdfData): string => {
  const days = t('days', { count: d.workingDays });
  if (!d.deductsPool || d.daysFromCarried + d.daysFromAnnual === 0) return days;
  const parts = [
    d.daysFromCarried > 0 ? t('split_carried', { count: d.daysFromCarried }) : null,
    d.daysFromAnnual > 0 ? t('split_annual', { count: d.daysFromAnnual, year: d.poolYear }) : null,
  ].filter(Boolean);
  return `${days} (${parts.join(t('check_and'))})`;
};

const signature = (label: string) => ({
  width: SIGN_WIDTH,
  stack: [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: SIGN_WIDTH, y2: 0, lineWidth: 0.8, dash: { length: 2, space: 2 }, lineColor: SIGN }] },
    { text: label, fontSize: 8, color: MUTED, alignment: 'center', margin: [0, 4, 0, 0] },
  ],
});

/** Definicja dokumentu pdfmake dla zatwierdzonego wniosku. */
export const buildLeaveRequestPdf = (d: LeaveRequestPdfData): object => {
  const rows: [string, string][] = [
    [t('print_employee'), d.employeeName],
    [t('field_type'), d.leaveTypeName],
    [t('col_dates'), termText(d)],
    [t('col_days'), daysText(d)],
  ];
  if (d.comment) rows.push([t('field_comment_short'), d.comment]);
  const decidedBy = d.decidedByName ? t('print_approved_by', { name: d.decidedByName }) : t('print_approved');
  rows.push([t('print_decision'), `${decidedBy} ${formatDate(d.decidedAt) ?? ''}`.trim()]);

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN],
    info: { title: `${t('print_heading')} ${t('print_number', { id: d.id })}` },
    defaultStyle: { fontSize: 11, color: TEXT, lineHeight: 1.25 },
    content: [
      {
        columns: [
          { text: i18n.t('app_name', { ns: 'common' }) as string, fontSize: 9, color: MUTED },
          { text: `${t('print_place_date')} ${formatDate(d.createdAt) ?? ''}`, fontSize: 9, color: MUTED, alignment: 'right' },
        ],
      },
      { text: t('print_heading'), fontSize: 20, bold: true, alignment: 'center', margin: [0, 32, 0, 2] },
      { text: t('print_number', { id: d.id }), fontSize: 9, color: MUTED, alignment: 'center', margin: [0, 0, 0, 24] },
      {
        layout: 'noBorders',
        table: {
          widths: [110, '*'],
          body: rows.map(([label, value]) => [
            { text: label, color: MUTED, margin: [0, 3, 0, 3] },
            { text: value, margin: [0, 3, 0, 3] },
          ]),
        },
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: RULE }], margin: [0, 20, 0, 0] },
      { columns: [signature(t('print_sign_employee')), signature(t('print_sign_manager'))], columnGap: SIGN_GAP, margin: [0, 70, 0, 0] },
    ],
  };
};

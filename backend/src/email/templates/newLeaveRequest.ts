import { createI18n, formatDate, formatNumber } from '@app/shared';
import { env } from '../../env';
import { escapeHtml } from '../escapeHtml';
import { EMAIL_COLORS as c, FONT_SERIF, emailLayout } from '../layout';

/** Dane wniosku do e-maila; wszystko liczy serwer (moduł „Moje urlopy”) po zapisaniu wniosku. */
export interface NewLeaveRequestEmailData {
  requestId: number;
  employeeName: string;
  leaveTypeName: string;
  /** `RRRR-MM-DD` */
  dateFrom: string;
  dateTo: string;
  workingDays: number;
  daysFromCarried: number;
  daysFromAnnual: number;
  /** Dni w puli po zatwierdzeniu; `null` dla typu, który nie odejmuje dni (bez wierszy o puli). */
  leftAfter: number | null;
  comment: string | null;
}

const whole = (n: number): string => formatNumber(n, 0) ?? String(n);

/** E-mail „Nowy wniosek urlopowy” dla administratora: temat, HTML i wersja tekstowa z tych samych kluczy. */
export const newLeaveRequestEmail = (data: NewLeaveRequestEmailData): { subject: string; html: string; text: string } => {
  const t = createI18n().t;
  const k = (key: string, vars?: Record<string, unknown>) => t(`new_request.${key}`, { ns: 'email', ...vars }) as string;
  const dateFrom = formatDate(data.dateFrom) ?? data.dateFrom;
  const dateTo = formatDate(data.dateTo) ?? data.dateTo;
  const dates = `${dateFrom} – ${dateTo}`;
  const link = `${env.FRONTEND_URL}/admin/leave-requests/${data.requestId}`;
  const comment = data.comment?.trim() || null;

  const rows: [string, string][] = [
    [k('employee'), data.employeeName],
    [k('leave_type'), data.leaveTypeName],
    [k('working_days'), k('working_days_value', { count: whole(data.workingDays) })],
    ...(data.leftAfter === null
      ? []
      : ([
          [k('split'), k('split_value', { carried: whole(data.daysFromCarried), annual: whole(data.daysFromAnnual) })],
          [k('left_after'), k('left_after_value', { count: whole(data.leftAfter) })],
        ] as [string, string][])),
    ...(comment ? ([[k('comment'), comment]] as [string, string][]) : []),
  ];

  const subject = k('subject', { employee: data.employeeName, dateFrom, dateTo });
  const heading = k('heading');
  const intro = k('intro', { employee: data.employeeName });
  const footer = k('footer');
  const appName = t('app_name', { ns: 'common' }) as string;

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;border-bottom:1px solid ${c.rule};font-size:14px;color:${c.muted};vertical-align:top;width:40%;">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;border-bottom:1px solid ${c.rule};font-size:14px;color:${c.text};vertical-align:top;white-space:pre-line;">${escapeHtml(value)}</td></tr>`,
    )
    .join('\n');

  const bodyHtml = `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(intro)}</p>
<div style="margin:0 0 16px;padding:4px 0 4px 16px;border-left:3px solid ${c.accent};">
<div style="font-size:14px;color:${c.muted};">${escapeHtml(k('dates'))}</div>
<div style="font-family:${FONT_SERIF};font-weight:600;font-size:24px;line-height:1.25;color:${c.text};">${escapeHtml(dates)}</div>
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
${rowsHtml}
</table>
<a href="${escapeHtml(link)}" style="display:inline-block;background:${c.button};color:${c.white};text-decoration:none;font-weight:600;font-size:16px;padding:10px 22px;border-radius:2px;">${escapeHtml(k('button'))}</a>
<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${c.muted};word-break:break-all;">${escapeHtml(k('link_hint', { link }))}</p>`;

  const text = [
    heading,
    '',
    intro,
    '',
    `${k('dates')}: ${dates}`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `${k('button')}: ${link}`,
    '',
    '--',
    footer,
  ].join('\n');

  return { subject, html: emailLayout({ appName, heading, bodyHtml, footer }), text };
};

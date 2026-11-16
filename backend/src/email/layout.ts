import { theme } from '@app/shared/theme';
import { escapeHtml } from './escapeHtml';

// Wspólna rama e-maili: jasna kartka (programy pocztowe pokazują e-maile na białym tle), granatowy pasek z nazwą
// aplikacji, treść, stopka. Programy pocztowe nie czytają arkuszy stylów, więc style są w atrybutach `style`.
// Kolory z motywu aplikacji (shared/src/theme.ts); biel to domyślna biel Mantine.

const color = (name: string, shade: number): string => theme.colors?.[name]?.[shade] ?? '';

export const EMAIL_COLORS = {
  band: color('navy', 8),
  button: color('navy', 7),
  accent: color('navy', 6),
  page: color('gray', 1),
  border: color('gray', 3),
  rule: color('gray', 2),
  muted: color('gray', 6),
  text: color('dark', 9),
  white: '#ffffff',
};

export const FONT_SANS = "'Source Sans 3', Arial, sans-serif";
export const FONT_SERIF = "'Source Serif 4', Georgia, serif";

/** Cały dokument HTML e-maila. `bodyHtml` jest już zabezpieczony; `appName`, `heading`, `footer` zabezpiecza rama. */
export const emailLayout = (p: { appName: string; heading: string; bodyHtml: string; footer: string }): string => {
  const c = EMAIL_COLORS;
  return `<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(p.heading)}</title></head>
<body style="margin:0;padding:0;background:${c.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${c.white};border:1px solid ${c.border};border-radius:2px;font-family:${FONT_SANS};color:${c.text};">
<tr><td style="background:${c.band};padding:12px 24px;font-family:${FONT_SERIF};font-weight:600;font-size:16px;color:${c.white};">${escapeHtml(p.appName)}</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 16px;font-family:${FONT_SERIF};font-weight:600;font-size:24px;line-height:1.3;color:${c.text};">${escapeHtml(p.heading)}</h1>
${p.bodyHtml}
</td></tr>
<tr><td style="border-top:1px solid ${c.rule};padding:16px 24px;font-size:12px;line-height:1.5;color:${c.muted};">${escapeHtml(p.footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};

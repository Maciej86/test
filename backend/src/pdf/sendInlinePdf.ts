import type { Response } from 'express';

/** PDF wniosku w odpowiedzi: otwiera się w nowej karcie (inline), nie zostaje w pamięci przeglądarki (no-store). */
export const sendInlinePdf = (res: Response, fileName: string, pdf: Buffer): void => {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${fileName}"`,
    'Cache-Control': 'no-store',
  });
  res.send(pdf);
};

import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { FONTS_DIR, isFontPath, renderPdf } from '../renderPdf';

const head = (buffer: Buffer) => buffer.subarray(0, 4).toString('latin1');

describe('renderPdf', () => {
  it('returns a buffer starting with %PDF', async () => {
    expect(head(await renderPdf({ content: ['Wniosek o urlop'] }))).toBe('%PDF');
  });

  it('renders Polish letters (Roboto)', async () => {
    const pdf = await renderPdf({ content: ['Zażółć gęślą jaźń. ZAŻÓŁĆ GĘŚLĄ JAŹŃ.'] });
    expect(head(pdf)).toBe('%PDF');
    expect(pdf.toString('latin1')).toContain('Roboto');
  });

  it('never downloads images from the internet', async () => {
    const doc = { images: { logo: 'https://example.com/logo.png' }, content: [{ image: 'logo' }] };
    await expect(renderPdf(doc)).rejects.toThrow();
  });

  it('never reads files from the server outside the fonts folder', async () => {
    await expect(renderPdf({ content: [{ image: '/etc/hostname' }] })).rejects.toThrow();
  });

  it('local access only inside the fonts folder (no sibling folder, no ..)', () => {
    expect(isFontPath(join(FONTS_DIR, 'Roboto', 'Roboto-Regular.ttf'))).toBe(true);
    expect(isFontPath(`${FONTS_DIR}-x/evil.ttf`)).toBe(false);
    expect(isFontPath(`${FONTS_DIR}/../../package.json`)).toBe(false);
  });
});

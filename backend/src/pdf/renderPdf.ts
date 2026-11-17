import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';

// Jedno miejsce, w którym serwer tworzy PDF (pdfmake). Dokument nigdy nie pobiera nic z internetu ani plików serwera:
// obrazki tylko jako dane dołączone przez kod aplikacji.
const require = createRequire(import.meta.url);
const pdfmake = require('pdfmake');
const Roboto = require('pdfmake/fonts/Roboto'); // polskie znaki
export const FONTS_DIR = dirname(require.resolve('pdfmake/fonts/Roboto'));
/** Tylko pliki wewnątrz folderu czcionek (bez folderów o podobnej nazwie i bez wychodzenia przez „..”). */
export const isFontPath = (path: string): boolean => resolve(path).startsWith(FONTS_DIR + sep);
pdfmake.addFonts(Roboto);
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(isFontPath);

export const renderPdf = (doc: object): Promise<Buffer> =>
  pdfmake.createPdf({ defaultStyle: { font: 'Roboto' }, ...doc }).getBuffer();

import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Response } from 'express';
import { SERVER_MESSAGES } from '@app/shared';
import { UPLOAD_FILE_TYPES, UPLOAD_MAX_BYTES } from '../config/constants';
import { env } from '../env';

/**
 * Pliki od użytkowników na dysku: `uploads/<moduł>/<id rekordu>/<losowa nazwa>.<rozszerzenie>`.
 * Kto może pobrać plik, decyduje trasa API (te same uprawnienia co rekord), nie folder. Oryginalna nazwa, typ i rozmiar
 * są w tabeli plików modułu (np. `leave_request_files`), na dysku nigdy nie ma nazwy od użytkownika.
 */
export type UploadFileType = (typeof UPLOAD_FILE_TYPES)[number];

export class UploadError extends Error {
  constructor(public readonly messageKey: string) {
    super(messageKey);
  }
}

const MODULE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/;

function startsWith(buffer: Buffer, bytes: readonly number[], offset = 0): boolean {
  return buffer.length >= offset + bytes.length && bytes.every((b, i) => buffer[offset + i] === b);
}

/** Typ pliku po jego zawartości albo `null`, gdy nie jest na liście dozwolonych. */
export function detectFileType(buffer: Buffer): UploadFileType | null {
  return (
    UPLOAD_FILE_TYPES.find(
      (type) =>
        startsWith(buffer, type.signature) &&
        (!('extra' in type) || startsWith(buffer, type.extra.bytes, type.extra.offset)),
    ) ?? null
  );
}

function recordDir(module: string, recordId: number): string {
  if (!MODULE.test(module)) throw new Error(`Zła nazwa modułu dla plików: ${module}`);
  if (!Number.isInteger(recordId) || recordId <= 0) throw new Error(`Złe id rekordu dla plików: ${recordId}`);
  return join(env.UPLOAD_DIR, module, String(recordId));
}

/** Ścieżka zapisanego pliku; odrzuca każdą nazwę, która nie powstała w saveUpload (np. `../../.env`). */
export function uploadPath(module: string, recordId: number, storedName: string): string {
  if (!STORED_NAME.test(storedName)) throw new Error('Zła nazwa zapisanego pliku');
  return join(recordDir(module, recordId), storedName);
}

/**
 * Sprawdza i zapisuje plik (bufor z multer.memoryStorage()). Zwraca dane do tabeli plików modułu.
 * Błąd rozmiaru lub typu: UploadError z kluczem tekstu (odpowiedz 400 przez sendError).
 */
export async function saveUpload(module: string, recordId: number, buffer: Buffer, maxBytes = UPLOAD_MAX_BYTES) {
  if (buffer.length > maxBytes) throw new UploadError(SERVER_MESSAGES.fileTooLarge);
  const type = detectFileType(buffer);
  if (!type) throw new UploadError(SERVER_MESSAGES.fileTypeNotAllowed);
  const storedName = `${randomUUID()}.${type.ext}`;
  const dir = recordDir(module, recordId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, storedName), buffer, { flag: 'wx' });
  return { storedName, mime: type.mime, size: buffer.length };
}

/** Usuwa jeden plik (po usunięciu wiersza z tabeli plików, po udanej transakcji). */
export async function removeUpload(module: string, recordId: number, storedName: string): Promise<void> {
  await rm(uploadPath(module, recordId, storedName), { force: true });
}

/** Usuwa wszystkie pliki rekordu (przy usunięciu rekordu na stałe, po udanej transakcji; nie przy archiwizacji). */
export async function removeRecordUploads(module: string, recordId: number): Promise<void> {
  await rm(recordDir(module, recordId), { recursive: true, force: true });
}

/** Wysyła plik do pobrania z oryginalną nazwą. Wołaj dopiero po sprawdzeniu, że ta osoba ma dostęp do rekordu. */
export function sendUpload(
  res: Response,
  file: { module: string; recordId: number; storedName: string; originalName: string; mime: string },
): void {
  res.setHeader('Content-Type', file.mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  res.sendFile(uploadPath(file.module, file.recordId, file.storedName));
}

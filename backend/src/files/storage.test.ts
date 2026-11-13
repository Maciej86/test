import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SERVER_MESSAGES } from '@app/shared';
import { env } from '../env';
import {
  detectFileType,
  removeRecordUploads,
  removeUpload,
  saveUpload,
  UploadError,
  uploadPath,
} from './storage';

const PDF = Buffer.from('%PDF-1.7\n...');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const EXE = Buffer.from('MZ\x90\x00');

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'uploads-'));
  process.env.UPLOAD_DIR = dir;
  (env as { UPLOAD_DIR: string }).UPLOAD_DIR = dir;
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('detectFileType', () => {
  it('recognises allowed files by content', () => {
    expect(detectFileType(PDF)?.ext).toBe('pdf');
    expect(detectFileType(PNG)?.ext).toBe('png');
    expect(detectFileType(JPG)?.ext).toBe('jpg');
    expect(detectFileType(WEBP)?.ext).toBe('webp');
  });

  it('rejects other files, whatever their name says', () => {
    expect(detectFileType(EXE)).toBeNull();
    expect(detectFileType(Buffer.from('RIFF0000WAVE'))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe('saveUpload', () => {
  it('stores the file under uploads/<module>/<record id>/ with a random name', async () => {
    const saved = await saveUpload('leave-requests', 152, PDF);
    expect(saved).toMatchObject({ mime: 'application/pdf', size: PDF.length });
    expect(saved.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(await readdir(join(dir, 'leave-requests', '152'))).toEqual([saved.storedName]);
  });

  it('rejects a file that is too large or of a forbidden type', async () => {
    await expect(saveUpload('leave-requests', 1, PDF, 3)).rejects.toEqual(new UploadError(SERVER_MESSAGES.fileTooLarge));
    await expect(saveUpload('leave-requests', 1, EXE)).rejects.toEqual(
      new UploadError(SERVER_MESSAGES.fileTypeNotAllowed),
    );
  });

  it('refuses paths built from user input', async () => {
    await expect(saveUpload('../etc', 1, PDF)).rejects.toThrow();
    await expect(saveUpload('leave-requests', -1, PDF)).rejects.toThrow();
    expect(() => uploadPath('leave-requests', 1, '../../.env')).toThrow();
  });
});

describe('removing files', () => {
  it('removes one file and the whole record folder', async () => {
    const a = await saveUpload('employees', 7, PNG);
    await saveUpload('employees', 7, JPG);
    await removeUpload('employees', 7, a.storedName);
    expect(await readdir(join(dir, 'employees', '7'))).toHaveLength(1);
    await removeRecordUploads('employees', 7);
    await expect(readdir(join(dir, 'employees', '7'))).rejects.toThrow();
  });
});

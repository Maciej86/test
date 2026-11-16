import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
const { setAuthCookie, signToken, verifyToken } = await import('../token');

describe('token', () => {
  it('signToken and verifyToken round-trip the user id, token version and issue time', () => {
    const before = Date.now();
    const result = verifyToken(signToken({ id: 7 }, 3));
    expect(result?.id).toBe(7);
    expect(result?.tokenVersion).toBe(3);
    expect(result!.issuedAtMs).toBeGreaterThanOrEqual(Math.floor(before / 1000) * 1000);
  });

  it('verifyToken rejects a token signed with another secret', () => {
    expect(verifyToken(jwt.sign({ id: 7 }, 'another-secret-another-secret-12345'))).toBeNull();
    expect(verifyToken('not-a-token')).toBeNull();
  });

  it('verifyToken rejects a token without a version (issued before the change)', () => {
    expect(verifyToken(jwt.sign({ id: 7 }, 'test-secret-test-secret-test-secret'))).toBeNull();
  });

  it('verifyToken rejects a token signed with another algorithm', () => {
    const forged = jwt.sign({ id: 7, ver: 0 }, 'test-secret-test-secret-test-secret', { algorithm: 'HS512' });
    expect(verifyToken(forged)).toBeNull();
  });

  it('setAuthCookie sets a session cookie without an expiry date', () => {
    const res = { cookie: vi.fn() } as unknown as Response;
    setAuthCookie(res, 'abc');
    const options = (vi.mocked(res.cookie).mock.calls[0] as unknown[])[2] as Record<string, unknown>;
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax' });
    expect(options.maxAge).toBeUndefined();
    expect(options.expires).toBeUndefined();
  });
});

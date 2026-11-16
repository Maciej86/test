import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { fail, idParam, reply } from '../routeHelpers';

const fakeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
};

describe('route helpers', () => {
  it('idParam: 0, -1, abc, 1.5, 1e3, 0x10, " 7", 007 → 404; 7 → 7', () => {
    for (const raw of ['0', '-1', 'abc', '1.5', '1e3', '0x10', ' 7', '007', '']) {
      const res = fakeRes();
      expect(idParam(res, raw)).toBeNull();
      expect(res.status).toHaveBeenCalledWith(404);
    }
    const res = fakeRes();
    expect(idParam(res, '7')).toBe(7);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('reply: error → sendError with fields and extra data; success → JSON with status', () => {
    const res = fakeRes();
    reply(res, fail(409, 'x.taken', { fields: { name: 'x.taken' }, hiddenType: { id: 4, name: 'Szkoleniowy' } }));
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'x.taken', fields: { name: 'x.taken' }, hiddenType: { id: 4, name: 'Szkoleniowy' } } });

    const ok = fakeRes();
    reply(ok, { id: 3 }, 201);
    expect(ok.status).toHaveBeenCalledWith(201);
    expect(ok.json).toHaveBeenCalledWith({ id: 3 });
  });
});

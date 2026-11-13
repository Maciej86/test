// Test zasad: każdy moduł podpięty w app.ts przez mountModule odrzuca osobę niezalogowaną (401) i osobę w roli,
// której moduł nie dopuszcza (403), na każdym adresie i każdą metodą. Plik stepkit: nie zmieniaj go.
// Działa sam dla każdego nowego modułu; trasy publiczne nie idą przez mountModule, więc ich tu nie ma.
import { describe, expect, it, vi } from 'vitest';
import express, { Router } from 'express';
import request from 'supertest';

vi.mock('../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret';

const { ROLES } = await import('@app/shared');
const { createApp } = await import('../app');
const { mountModule, mountedModules } = await import('../middleware/mountModule');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const PATHS = ['', '/1', '/1/x'];

createApp();
const modules = [...mountedModules.entries()];

describe('mountModule records what it mounts', () => {
  it('remembers the key and the roles', () => {
    mountModule(Router(), 'route-protection-check', Router(), ['admin']);
    expect(mountedModules.get('route-protection-check')).toEqual(['admin']);
    mountedModules.delete('route-protection-check');
  });
});

describe.skipIf(modules.length === 0)('every mounted module is protected', () => {
  it.each(modules)('/api/%s: without login → 401', async (key) => {
    const app = createApp();
    for (const method of METHODS) {
      for (const path of PATHS) {
        const res = await request(app)[method](`/api/${key}${path}`);
        expect(res.status, `${method.toUpperCase()} /api/${key}${path}`).toBe(401);
      }
    }
  });

  it.each(modules)('/api/%s: role outside the module → 403', async (key, roles) => {
    for (const role of ROLES.filter((r) => !roles.includes(r))) {
      // Te same role i ta sama kontrola co w mountModule, z osobą w roli spoza modułu.
      const app = express();
      app.use((req, _res, next) => {
        req.user = { id: 1, name: 'Test', role } as typeof req.user;
        next();
      });
      const api = Router();
      mountModule(api, key, Router(), roles);
      app.use('/api', api);
      for (const method of METHODS) {
        const res = await request(app)[method](`/api/${key}/1`);
        expect(res.status, `${method.toUpperCase()} /api/${key}/1 jako ${role}`).toBe(403);
      }
    }
  });
});

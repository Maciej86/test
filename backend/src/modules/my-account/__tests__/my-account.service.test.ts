import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/activityLog', async (orig) => ({ ...(await orig<object>()), logActivity: vi.fn() }));
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../auth/users.queries', () => ({ findPasswordHash: vi.fn(), updatePassword: vi.fn() }));
vi.mock('../my-account.queries', () => ({ findMyAccount: vi.fn(), isEmailTaken: vi.fn(), lockMyEmail: vi.fn(), setMyEmail: vi.fn(), lockPasswordHash: vi.fn() }));

const q = await import('../my-account.queries');
const users = await import('../../../auth/users.queries');
const { logActivity } = await import('../../../db/activityLog');
const { hashPassword, verifyPassword } = await import('../../../auth/password');
const s = await import('../my-account.service');
const { MY_ACCOUNT_MESSAGES: M, SERVER_MESSAGES } = await import('@app/shared');

const jan = { id: 2, name: 'Jan Kowalski' };
const account = { name: 'Jan Kowalski', login: 'jan@firma.pl', role: 'employee' as const, email: 'jan@firma.pl', hiredOn: '2021-09-01', contractTypeName: 'B2B' };
const taken = { error: { status: 409, message: 'validation.email_taken', fields: { email: 'validation.email_taken' } } };
const dup = () => Object.assign(new Error("Duplicate entry 'x' for key 'uq_users_email'"), { code: 'ER_DUP_ENTRY' });
const input = { currentPassword: 'Stare-haslo1', newPassword: 'Urlop2026!', repeatPassword: 'Urlop2026!' };
let currentHash = '';

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(q.findMyAccount).mockResolvedValue(account);
  vi.mocked(q.isEmailTaken).mockResolvedValue(false);
  vi.mocked(q.lockMyEmail).mockResolvedValue('jan@firma.pl');
  currentHash ||= await hashPassword('Stare-haslo1');
  vi.mocked(users.findPasswordHash).mockResolvedValue(currentHash);
  vi.mocked(users.updatePassword).mockResolvedValue(3);
  vi.mocked(q.lockPasswordHash).mockResolvedValue(currentHash);
});

describe('my account service', () => {
  it('getMyAccount → name, login, role, email, hiredOn, contractTypeName (also a hidden type)', async () => {
    expect(await s.getMyAccount(2)).toEqual(account);
    expect(q.findMyAccount).toHaveBeenCalledWith(expect.anything(), 2);
  });

  it('getMyAccount without the account → 404', async () => {
    vi.mocked(q.findMyAccount).mockResolvedValue(null);
    expect(await s.getMyAccount(2)).toEqual({ error: { status: 404, message: SERVER_MESSAGES.notFound } });
  });

  it('updateMyEmail saves and logs { email: before → after } in one transaction', async () => {
    expect(await s.updateMyEmail(jan, 'jan.k@firma.pl')).toEqual({ email: 'jan.k@firma.pl' });
    expect(q.setMyEmail).toHaveBeenCalledWith(conn, 2, 'jan.k@firma.pl');
    expect(logActivity).toHaveBeenCalledWith(conn, {
      userId: 2, userName: 'Jan Kowalski', action: 'update', entityType: 'users', entityId: 2, entityName: 'Jan Kowalski',
      changes: { email: { before: 'jan@firma.pl', after: 'jan.k@firma.pl' } },
    });
  });

  it('updateMyEmail with the same address → no write and no activity entry', async () => {
    expect(await s.updateMyEmail(jan, 'jan@firma.pl')).toEqual({ email: 'jan@firma.pl' });
    expect(q.setMyEmail).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('updateMyEmail to empty → null without asking who has it', async () => {
    expect(await s.updateMyEmail(jan, null)).toEqual({ email: null });
    expect(q.isEmailTaken).not.toHaveBeenCalled();
    expect(q.setMyEmail).toHaveBeenCalledWith(conn, 2, null);
  });

  it('updateMyEmail taken by another account (active or archived) → 409 under email, no name', async () => {
    vi.mocked(q.isEmailTaken).mockResolvedValue(true);
    expect(await s.updateMyEmail(jan, 'ewa@firma.pl')).toEqual(taken);
    expect(q.isEmailTaken).toHaveBeenCalledWith(conn, 'ewa@firma.pl', 2);
    expect(q.setMyEmail).not.toHaveBeenCalled();
  });

  it('updateMyEmail race (unique index) → the same 409', async () => {
    vi.mocked(q.setMyEmail).mockRejectedValue(dup());
    expect(await s.updateMyEmail(jan, 'ewa@firma.pl')).toEqual(taken);
  });

  it('changeMyPassword wrong current → 400 under currentPassword, nothing saved', async () => {
    expect(await s.changeMyPassword(jan, { ...input, currentPassword: 'zle-haslo1!' })).toEqual({
      error: { status: 400, message: SERVER_MESSAGES.invalidData, fields: { currentPassword: M.currentWrong } },
    });
    expect(users.updatePassword).not.toHaveBeenCalled();
  });

  it('changeMyPassword new = current → 400 under newPassword', async () => {
    expect(await s.changeMyPassword(jan, { ...input, newPassword: 'Stare-haslo1', repeatPassword: 'Stare-haslo1' })).toEqual({
      error: { status: 400, message: SERVER_MESSAGES.invalidData, fields: { newPassword: M.sameAsCurrent } },
    });
  });

  it('changeMyPassword saves the hash, raises the session version and logs password: changed (no hash)', async () => {
    expect(await s.changeMyPassword(jan, input)).toEqual({ tokenVersion: 3 });
    const [id, hash, db] = vi.mocked(users.updatePassword).mock.calls[0]!;
    expect([id, db]).toEqual([2, conn]);
    expect(await verifyPassword('Urlop2026!', hash)).toBe(true);
    expect(logActivity).toHaveBeenCalledWith(conn, {
      userId: 2, userName: 'Jan Kowalski', action: 'update', entityType: 'users', entityId: 2, entityName: 'Jan Kowalski',
      changes: { password: { before: null, after: 'changed' } },
    });
    expect(JSON.stringify(vi.mocked(logActivity).mock.calls)).not.toContain(hash);
  });
});

describe('abuse', () => {
  it('password changed meanwhile (admin reset or another tab) → 409, nothing overwritten', async () => {
    vi.mocked(q.lockPasswordHash).mockResolvedValue('$2b$12$innyskrotodadministratora');
    expect(await s.changeMyPassword(jan, input)).toEqual({ error: { status: 409, message: M.passwordChangedMeanwhile } });
    expect(q.lockPasswordHash).toHaveBeenCalledWith(conn, 2);
    expect(users.updatePassword).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });
});

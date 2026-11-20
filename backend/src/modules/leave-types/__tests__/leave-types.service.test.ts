import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/activityLog', async (orig) => ({ ...(await orig<object>()), logActivity: vi.fn() }));
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../my-leave/my-leave.queries', () => ({ countRequestsByLeaveType: vi.fn() }));
vi.mock('../leave-types.queries', () => ({
  listLeaveTypes: vi.fn(),
  findLeaveType: vi.fn(),
  findByName: vi.fn(),
  maxPosition: vi.fn(),
  insertLeaveType: vi.fn(),
  updateLeaveType: vi.fn(),
  lockVisible: vi.fn(),
  setPosition: vi.fn(),
  setHidden: vi.fn(),
  setVisible: vi.fn(),
}));

const q = await import('../leave-types.queries');
const myLeave = await import('../../my-leave/my-leave.queries');
const { logActivity } = await import('../../../db/activityLog');
const s = await import('../leave-types.service');
const { LEAVE_TYPE_MESSAGES: M, SERVER_MESSAGES } = await import('@app/shared');

const data = { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null };
const typeRow = (o: Record<string, unknown> = {}) => ({ id: 3, name: 'Okolicznościowy', deducts_pool: 0, yearly_limit: null, position: 3, hidden_at: null, ...o }) as never;
const dup = () => Object.assign(new Error("Duplicate entry 'x' for key 'uq_leave_types_name'"), { code: 'ER_DUP_ENTRY' });

const anna = { id: 1, name: 'Anna Nowak' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(q.findByName).mockResolvedValue(null);
  vi.mocked(q.maxPosition).mockResolvedValue(5);
  vi.mocked(q.insertLeaveType).mockResolvedValue(6);
  vi.mocked(q.findLeaveType).mockResolvedValue(typeRow());
});

describe('leave types service', () => {
  it('createType puts the new type at the end (maxPosition + 1) in one transaction', async () => {
    expect(await s.createType(data, anna)).toEqual({ id: 6 });
    expect(q.insertLeaveType).toHaveBeenCalledWith(conn, data, 6);
    expect(q.maxPosition).toHaveBeenCalledWith(conn);
  });

  it('name taken by visible type → 409 name_taken; by hidden → name_taken_hidden with hiddenType', async () => {
    vi.mocked(q.findByName).mockResolvedValueOnce({ id: 2, name: 'Na żądanie', hidden: false });
    expect(await s.createType({ ...data, name: 'na żądanie' }, anna)).toEqual({ error: { status: 409, message: M.nameTaken, fields: { name: M.nameTaken } } });
    vi.mocked(q.findByName).mockResolvedValueOnce({ id: 7, name: 'Szkoleniowy', hidden: true });
    expect(await s.createType(data, anna)).toEqual({
      error: { status: 409, message: M.nameTakenHidden, fields: { name: M.nameTakenHidden }, hiddenType: { id: 7, name: 'Szkoleniowy' } },
    });
    expect(q.insertLeaveType).not.toHaveBeenCalled();
  });

  it('ER_DUP_ENTRY from the database → 409 name_taken', async () => {
    vi.mocked(q.insertLeaveType).mockRejectedValueOnce(dup());
    expect(await s.createType(data, anna)).toEqual({ error: { status: 409, message: M.nameTaken, fields: { name: M.nameTaken } } });
    vi.mocked(q.updateLeaveType).mockRejectedValueOnce(dup());
    expect(await s.updateType(3, data, anna)).toEqual({ error: { status: 409, message: M.nameTaken, fields: { name: M.nameTaken } } });
  });

  it('other database errors are not hidden', async () => {
    vi.mocked(q.insertLeaveType).mockRejectedValueOnce(new Error('connection lost'));
    await expect(s.createType(data, anna)).rejects.toThrow('connection lost');
  });

  it('updateType skips itself when checking the name; missing → 404', async () => {
    expect(await s.updateType(1, { ...data, name: 'wypoczynkowy' }, anna)).toEqual({ ok: true });
    expect(q.findByName).toHaveBeenCalledWith(expect.anything(), 'wypoczynkowy', 1);
    expect(q.updateLeaveType).toHaveBeenCalledWith(expect.anything(), 1, { ...data, name: 'wypoczynkowy' });
    vi.mocked(q.findLeaveType).mockResolvedValueOnce(null);
    expect(await s.updateType(99, data, anna)).toEqual({ error: { status: 404, message: SERVER_MESSAGES.notFound } });
  });

  it('listTypes fills requestsCount from Moje urlopy (0 for types without requests)', async () => {
    vi.mocked(q.listLeaveTypes).mockResolvedValue([
      { id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, hidden: false, requestsCount: 0 },
      { id: 2, name: 'Na żądanie', deductsPool: true, yearlyLimit: 4, hidden: false, requestsCount: 0 },
    ]);
    vi.mocked(myLeave.countRequestsByLeaveType).mockResolvedValue(new Map([[1, 3]]));
    expect((await s.listTypes()).items.map((i) => i.requestsCount)).toEqual([3, 0]);
  });

  it('moveType swaps position with the visible neighbour (positions 1, 3, 4)', async () => {
    vi.mocked(q.lockVisible).mockResolvedValue([{ id: 1, position: 1 }, { id: 3, position: 3 }, { id: 4, position: 4 }]);
    expect(await s.moveType(3, 'up')).toEqual({ ok: true });
    expect(q.setPosition).toHaveBeenCalledWith(conn, 3, 1);
    expect(q.setPosition).toHaveBeenCalledWith(conn, 1, 3);
    vi.mocked(q.setPosition).mockClear();
    expect(await s.moveType(3, 'down')).toEqual({ ok: true });
    expect(q.setPosition).toHaveBeenCalledWith(conn, 3, 4);
    expect(q.setPosition).toHaveBeenCalledWith(conn, 4, 3);
  });

  it('moveType at the edge → ok without writes; hidden or missing → 404', async () => {
    vi.mocked(q.lockVisible).mockResolvedValue([{ id: 1, position: 1 }, { id: 3, position: 3 }]);
    expect(await s.moveType(1, 'up')).toEqual({ ok: true });
    expect(await s.moveType(3, 'down')).toEqual({ ok: true });
    expect(q.setPosition).not.toHaveBeenCalled();
    expect(await s.moveType(5, 'up')).toEqual({ error: { status: 404, message: SERVER_MESSAGES.notFound } });
  });

  it('hideType: missing → 404, already hidden → 409, last visible → 409 last_visible', async () => {
    vi.mocked(q.lockVisible).mockResolvedValue([{ id: 1, position: 1 }, { id: 3, position: 3 }]);
    expect(await s.hideType(3, anna)).toEqual({ ok: true });
    expect(q.setHidden).toHaveBeenCalledWith(conn, 3);
    vi.mocked(q.setHidden).mockClear();

    vi.mocked(q.findLeaveType).mockResolvedValueOnce(null);
    expect(await s.hideType(99, anna)).toEqual({ error: { status: 404, message: SERVER_MESSAGES.notFound } });
    vi.mocked(q.findLeaveType).mockResolvedValueOnce(typeRow({ hidden_at: new Date() }));
    expect(await s.hideType(3, anna)).toEqual({ error: { status: 409, message: M.alreadyHidden } });
    vi.mocked(q.lockVisible).mockResolvedValue([{ id: 3, position: 3 }]);
    expect(await s.hideType(3, anna)).toEqual({ error: { status: 409, message: M.lastVisible } });
    expect(q.setHidden).not.toHaveBeenCalled();
  });

  it('two hides one after another with two visible types → ok, then 409 last_visible', async () => {
    const visible = [{ id: 1, position: 1 }, { id: 3, position: 3 }];
    vi.mocked(q.lockVisible).mockImplementation(async () => [...visible]);
    vi.mocked(q.setHidden).mockImplementation(async (_db, id) => { visible.splice(visible.findIndex((v) => v.id === id), 1); });
    vi.mocked(q.findLeaveType).mockImplementation(async (_db, id) => typeRow({ id }));
    expect(await s.hideType(1, anna)).toEqual({ ok: true });
    expect(await s.hideType(3, anna)).toEqual({ error: { status: 409, message: M.lastVisible } });
    // Blokada wierszy jest przed sprawdzeniem typu, żeby drugie „Ukryj” czekało na pierwsze.
    expect(vi.mocked(q.lockVisible).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(q.findLeaveType).mock.invocationCallOrder[0]!);
  });

  it('unhideType: missing → 404, visible → 409 not_hidden, restored at the end', async () => {
    vi.mocked(q.findLeaveType).mockResolvedValueOnce(typeRow({ hidden_at: new Date() }));
    expect(await s.unhideType(3, anna)).toEqual({ ok: true });
    expect(q.setVisible).toHaveBeenCalledWith(conn, 3, 6);
    vi.mocked(q.findLeaveType).mockResolvedValueOnce(null);
    expect(await s.unhideType(99, anna)).toEqual({ error: { status: 404, message: SERVER_MESSAGES.notFound } });
    expect(await s.unhideType(3, anna)).toEqual({ error: { status: 409, message: M.notHidden } });
  });
});

describe('activity log', () => {
  it('create writes an activity entry with the name, in the same transaction', async () => {
    await s.createType(data, anna);
    expect(logActivity).toHaveBeenCalledWith(conn, {
      userId: 1, userName: 'Anna Nowak', action: 'create', entityType: 'leave_types', entityId: 6, entityName: data.name,
      changes: { name: { before: undefined, after: 'Szkoleniowy' }, deducts_pool: { before: undefined, after: true }, yearly_limit: { before: undefined, after: null } },
    });
  });

  it('update writes changed fields only, in a transaction; nothing changed → no entry', async () => {
    vi.mocked(q.findLeaveType).mockResolvedValue(typeRow({ name: 'Szkoleniowy', deducts_pool: 1, yearly_limit: 5 }));
    await s.updateType(3, { name: 'Szkolenie', deductsPool: true, yearlyLimit: 5 }, anna);
    expect(q.findLeaveType).toHaveBeenCalledWith(conn, 3, { lock: true });
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ action: 'update', entityType: 'leave_types', changes: { name: { before: 'Szkoleniowy', after: 'Szkolenie' } } }));
    vi.mocked(logActivity).mockClear();
    vi.mocked(q.findLeaveType).mockResolvedValue(typeRow({ name: 'Szkoleniowy', deducts_pool: 1, yearly_limit: null }));
    await s.updateType(3, data, anna);
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('hide and unhide write entries with the type name', async () => {
    vi.mocked(q.lockVisible).mockResolvedValue([{ id: 3, position: 3 }, { id: 4, position: 4 }] as never);
    await s.hideType(3, anna);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ action: 'hide', entityType: 'leave_types', entityId: 3, entityName: 'Okolicznościowy', changes: {} }));
    vi.mocked(q.findLeaveType).mockResolvedValue(typeRow({ hidden_at: new Date() }));
    await s.unhideType(3, anna);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ action: 'unhide', entityType: 'leave_types', entityId: 3, changes: {} }));
  });

  it('move does not write an entry', async () => {
    vi.mocked(q.lockVisible).mockResolvedValue([{ id: 3, position: 3 }, { id: 4, position: 4 }] as never);
    await s.moveType(3, 'down');
    expect(logActivity).not.toHaveBeenCalled();
  });
});

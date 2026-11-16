import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
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
const s = await import('../leave-types.service');
const { LEAVE_TYPE_MESSAGES: M, SERVER_MESSAGES } = await import('@app/shared');

const data = { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null };
const typeRow = (o: Record<string, unknown> = {}) => ({ id: 3, name: 'Okolicznościowy', deducts_pool: 0, yearly_limit: null, position: 3, hidden_at: null, ...o }) as never;
const dup = () => Object.assign(new Error("Duplicate entry 'x' for key 'uq_leave_types_name'"), { code: 'ER_DUP_ENTRY' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(q.findByName).mockResolvedValue(null);
  vi.mocked(q.maxPosition).mockResolvedValue(5);
  vi.mocked(q.insertLeaveType).mockResolvedValue(6);
  vi.mocked(q.findLeaveType).mockResolvedValue(typeRow());
});

describe('leave types service', () => {
  it('createType puts the new type at the end (maxPosition + 1) in one transaction', async () => {
    expect(await s.createType(data)).toEqual({ id: 6 });
    expect(q.insertLeaveType).toHaveBeenCalledWith(conn, data, 6);
    expect(q.maxPosition).toHaveBeenCalledWith(conn);
  });

  it('name taken by visible type → 409 name_taken; by hidden → name_taken_hidden with hiddenType', async () => {
    vi.mocked(q.findByName).mockResolvedValueOnce({ id: 2, name: 'Na żądanie', hidden: false });
    expect(await s.createType({ ...data, name: 'na żądanie' })).toEqual({ error: { status: 409, message: M.nameTaken, fields: { name: M.nameTaken } } });
    vi.mocked(q.findByName).mockResolvedValueOnce({ id: 7, name: 'Szkoleniowy', hidden: true });
    expect(await s.createType(data)).toEqual({
      error: { status: 409, message: M.nameTakenHidden, fields: { name: M.nameTakenHidden }, hiddenType: { id: 7, name: 'Szkoleniowy' } },
    });
    expect(q.insertLeaveType).not.toHaveBeenCalled();
  });

  it('ER_DUP_ENTRY from the database → 409 name_taken', async () => {
    vi.mocked(q.insertLeaveType).mockRejectedValueOnce(dup());
    expect(await s.createType(data)).toEqual({ error: { status: 409, message: M.nameTaken, fields: { name: M.nameTaken } } });
    vi.mocked(q.updateLeaveType).mockRejectedValueOnce(dup());
    expect(await s.updateType(3, data)).toEqual({ error: { status: 409, message: M.nameTaken, fields: { name: M.nameTaken } } });
  });

  it('other database errors are not hidden', async () => {
    vi.mocked(q.insertLeaveType).mockRejectedValueOnce(new Error('connection lost'));
    await expect(s.createType(data)).rejects.toThrow('connection lost');
  });

  it('updateType skips itself when checking the name; missing → 404', async () => {
    expect(await s.updateType(1, { ...data, name: 'wypoczynkowy' })).toEqual({ ok: true });
    expect(q.findByName).toHaveBeenCalledWith(expect.anything(), 'wypoczynkowy', 1);
    expect(q.updateLeaveType).toHaveBeenCalledWith(expect.anything(), 1, { ...data, name: 'wypoczynkowy' });
    vi.mocked(q.findLeaveType).mockResolvedValueOnce(null);
    expect(await s.updateType(99, data)).toEqual({ error: { status: 404, message: SERVER_MESSAGES.notFound } });
  });

  it('listTypes returns items', async () => {
    vi.mocked(q.listLeaveTypes).mockResolvedValue([{ id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, hidden: false, requestsCount: 0 }]);
    expect((await s.listTypes()).items).toHaveLength(1);
  });

  it.todo('moveType swaps position with the visible neighbour (positions 1, 3, 4)');
  it.todo('moveType at the edge → ok without writes; hidden or missing → 404');
  it.todo('hideType: missing → 404, already hidden → 409, last visible → 409 last_visible');
  it.todo('unhideType: missing → 404, visible → 409 not_hidden, restored at the end');
});

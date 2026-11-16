import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../contract-types.queries', () => ({
  listContractTypes: vi.fn(),
  findContractType: vi.fn(),
  findByName: vi.fn(),
  maxPosition: vi.fn(),
  insertContractType: vi.fn(),
  updateContractType: vi.fn(),
  lockVisible: vi.fn(),
  setPosition: vi.fn(),
  setHidden: vi.fn(),
  setVisible: vi.fn(),
}));

const q = await import('../contract-types.queries');
const s = await import('../contract-types.service');
const { CONTRACT_TYPE_MESSAGES: M, SERVER_MESSAGES } = await import('@app/shared');

const data = { name: 'Umowa o staż' };
const found = (o: Partial<{ id: number; name: string; hidden: boolean }> = {}) => ({ id: 4, name: 'B2B', hidden: false, ...o });
const dup = () => Object.assign(new Error("Duplicate entry 'x' for key 'uq_contract_types_name'"), { code: 'ER_DUP_ENTRY' });
const notFound = { error: { status: 404, message: SERVER_MESSAGES.notFound } };
const taken = { error: { status: 409, message: M.nameTaken, fields: { name: M.nameTaken } } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(q.findByName).mockResolvedValue(null);
  vi.mocked(q.maxPosition).mockResolvedValue(4);
  vi.mocked(q.insertContractType).mockResolvedValue(5);
  vi.mocked(q.findContractType).mockResolvedValue(found());
});

describe('contract types service', () => {
  it('listTypes returns items', async () => {
    vi.mocked(q.listContractTypes).mockResolvedValue([{ id: 1, name: 'Umowa o pracę', hidden: false, employeesCount: 4 }]);
    expect(await s.listTypes()).toEqual({ items: [{ id: 1, name: 'Umowa o pracę', hidden: false, employeesCount: 4 }] });
  });

  it('createType puts the new type at the end (maxPosition + 1) in one transaction', async () => {
    expect(await s.createType(data)).toEqual({ id: 5 });
    expect(q.maxPosition).toHaveBeenCalledWith(conn);
    expect(q.insertContractType).toHaveBeenCalledWith(conn, data, 5);
  });

  it('name taken by visible type → 409 name_taken; by hidden → name_taken_hidden with hiddenType', async () => {
    vi.mocked(q.findByName).mockResolvedValueOnce(found({ id: 2, name: 'Umowa zlecenie' }));
    expect(await s.createType({ name: 'umowa zlecenie' })).toEqual(taken);
    vi.mocked(q.findByName).mockResolvedValueOnce(found({ id: 7, name: 'Umowa o staż', hidden: true }));
    expect(await s.createType(data)).toEqual({
      error: { status: 409, message: M.nameTakenHidden, fields: { name: M.nameTakenHidden }, hiddenType: { id: 7, name: 'Umowa o staż' } },
    });
    expect(q.insertContractType).not.toHaveBeenCalled();
  });

  it('ER_DUP_ENTRY → 409 name_taken; other errors are not hidden', async () => {
    vi.mocked(q.insertContractType).mockRejectedValueOnce(dup());
    expect(await s.createType(data)).toEqual(taken);
    vi.mocked(q.updateContractType).mockRejectedValueOnce(dup());
    expect(await s.updateType(4, data)).toEqual(taken);
    vi.mocked(q.insertContractType).mockRejectedValueOnce(new Error('connection lost'));
    await expect(s.createType(data)).rejects.toThrow('connection lost');
  });

  it('updateType skips itself (b2b for B2B → ok); missing → 404', async () => {
    expect(await s.updateType(4, { name: 'b2b' })).toEqual({ ok: true });
    expect(q.findByName).toHaveBeenCalledWith(expect.anything(), 'b2b', 4);
    expect(q.updateContractType).toHaveBeenCalledWith(expect.anything(), 4, { name: 'b2b' });
    vi.mocked(q.findContractType).mockResolvedValueOnce(null);
    expect(await s.updateType(99, data)).toEqual(notFound);
  });

  it('moveType swaps with the visible neighbour (positions 1, 3, 4)', async () => {
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
    expect(await s.moveType(5, 'up')).toEqual(notFound);
  });

  it('hideType: missing → 404, already hidden → 409; the only visible type can be hidden', async () => {
    vi.mocked(q.lockVisible).mockResolvedValue([{ id: 4, position: 4 }]);
    expect(await s.hideType(4)).toEqual({ ok: true });
    expect(q.setHidden).toHaveBeenCalledWith(conn, 4);
    vi.mocked(q.setHidden).mockClear();
    vi.mocked(q.findContractType).mockResolvedValueOnce(null);
    expect(await s.hideType(99)).toEqual(notFound);
    vi.mocked(q.findContractType).mockResolvedValueOnce(found({ hidden: true }));
    expect(await s.hideType(4)).toEqual({ error: { status: 409, message: M.alreadyHidden } });
    expect(q.setHidden).not.toHaveBeenCalled();
  });

  it('unhideType: missing → 404, visible → 409 not_hidden, restored at the end', async () => {
    vi.mocked(q.findContractType).mockResolvedValueOnce(found({ hidden: true }));
    expect(await s.unhideType(4)).toEqual({ ok: true });
    expect(q.setVisible).toHaveBeenCalledWith(conn, 4, 5);
    vi.mocked(q.findContractType).mockResolvedValueOnce(null);
    expect(await s.unhideType(99)).toEqual(notFound);
    expect(await s.unhideType(4)).toEqual({ error: { status: 409, message: M.notHidden } });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (orig) => ({ ...(await orig<object>()), logActivity: vi.fn() }));
vi.mock('../employees.queries', () => ({
  findUser: vi.fn(),
  findAccountsWithLoginOrEmail: vi.fn(async () => []),
  updateUser: vi.fn(),
  findPool: vi.fn(),
  upsertPool: vi.fn(),
  minOpenYear: vi.fn(async () => 2026),
}));
vi.mock('../../tasks/projects.service', () => ({ addMemberWhereAssigned: vi.fn(async () => []) }));

const q = await import('../employees.queries');
const { addMemberWhereAssigned } = await import('../../tasks/projects.service');
const { updateEmployee } = await import('../employees.service');

const anna = { id: 1, name: 'Anna Nowak' };
const user = (role: 'admin' | 'employee') =>
  ({ id: 7, first_name: 'Marek', last_name: 'Nowicki', login: 'marek@firma.pl', email: null, role, hired_on: null, contract_type_id: null, archived_at: null }) as never;
const input = (role: 'admin' | 'employee') =>
  ({ firstName: 'Marek', lastName: 'Nowicki', login: 'marek@firma.pl', email: null, role, hiredOn: null, contractTypeId: null }) as never;

afterEach(() => vi.clearAllMocks());

// Ustalenie 2026-11-18 (moduł Zadania): administrator, który staje się pracownikiem, zostaje członkiem projektów,
// w których ma otwarte zadania.
describe('role change and task projects', () => {
  it('admin → employee calls addMemberWhereAssigned in the same transaction', async () => {
    vi.mocked(q.findUser).mockResolvedValue(user('admin'));
    expect(await updateEmployee(7, input('employee'), anna)).toEqual({ ok: true });
    expect(addMemberWhereAssigned).toHaveBeenCalledWith(conn, 7, anna);
  });

  it('employee → admin and saves without a role change do not call it', async () => {
    vi.mocked(q.findUser).mockResolvedValue(user('employee'));
    await updateEmployee(7, input('admin'), anna);
    vi.mocked(q.findUser).mockResolvedValue(user('admin'));
    await updateEmployee(7, input('admin'), anna);
    expect(addMemberWhereAssigned).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('../../modules/notifications/notifications.queries', () => ({ activeIdsByRole: vi.fn() }));
vi.mock('../../modules/notifications/notifications.service', () => ({ notifyUsers: vi.fn(async (_c, i: { userIds: number[] }) => i.userIds.length) }));

const q = await import('../../modules/notifications/notifications.queries');
const s = await import('../../modules/notifications/notifications.service');
const { sendTestNotifications } = await import('../sendTestNotifications');

const conn = { query: vi.fn() } as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(q.activeIdsByRole).mockImplementation(async (_db, role) => (role === 'admin' ? [1, 3] : [2]));
});

describe('sendTestNotifications', () => {
  it('refuses to run in production', async () => {
    await expect(sendTestNotifications(conn, { NODE_ENV: 'production' })).rejects.toThrow();
    expect(s.notifyUsers).not.toHaveBeenCalled();
  });

  it('admins get admin types, employees get employee types, from a test actor nobody is', async () => {
    expect(await sendTestNotifications(conn, {})).toEqual({ admins: 2, employees: 1 });
    const calls = vi.mocked(s.notifyUsers).mock.calls.map(([, input]) => [input.type, input.userIds, input.link]);
    expect(calls).toEqual([
      ['leave_request_new', [1, 3], '/admin/leave-requests'],
      ['leave_request_withdrawn', [1, 3], '/admin/leave-requests'],
      ['leave_approved', [2], '/admin/my-leave'],
      ['leave_rejected', [2], '/admin/my-leave'],
      ['leave_cancelled', [2], '/admin/my-leave'],
      ['task_assigned', [2], '/admin/tasks'],
    ]);
    const actor = vi.mocked(s.notifyUsers).mock.calls[0]![1].actor;
    expect(actor).toEqual({ id: 0, name: 'Powiadomienie testowe' });
  });
});

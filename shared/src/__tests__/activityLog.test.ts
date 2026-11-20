import { describe, expect, it } from 'vitest';
import { describeActivity } from '../activityLog';

const status = (before: string, after: string) => ({ status: { before, after } });

describe('describeActivity', () => {
  it('leave request: create, approve, reject, withdraw, cancel with tones', () => {
    expect(describeActivity('leave_requests', 'create', {})).toEqual({ kind: 'leave_create', tone: 'neutral' });
    expect(describeActivity('leave_requests', 'status', status('pending', 'approved'))).toEqual({ kind: 'leave_approve', tone: 'positive' });
    expect(describeActivity('leave_requests', 'status', status('pending', 'rejected'))).toEqual({ kind: 'leave_reject', tone: 'negative' });
    expect(describeActivity('leave_requests', 'status', status('pending', 'withdrawn'))).toEqual({ kind: 'leave_withdraw', tone: 'muted' });
    expect(describeActivity('leave_requests', 'status', status('approved', 'cancelled'))).toEqual({ kind: 'leave_cancel', tone: 'negative' });
  });

  it('leave pool: create, update and close year', () => {
    expect(describeActivity('leave_pools', 'create', {})).toEqual({ kind: 'pool_create', tone: 'positive' });
    expect(describeActivity('leave_pools', 'update', { annual_days: { before: 20, after: 26 } })).toEqual({ kind: 'pool_update', tone: 'neutral' });
    expect(describeActivity('leave_pools', 'update', { closed_year: { before: null, after: 2026 } })).toEqual({ kind: 'pool_close_year', tone: 'neutral' });
  });

  it('task: create, update, move, finish, unfinish, archive, restore, delete', () => {
    expect(describeActivity('tasks', 'create', {})).toEqual({ kind: 'task_create', tone: 'positive' });
    expect(describeActivity('tasks', 'update', { title: { before: 'a', after: 'b' } })).toEqual({ kind: 'task_update', tone: 'neutral' });
    expect(describeActivity('tasks', 'status', { column_key: { before: 'draft', after: 'done' } })).toEqual({ kind: 'task_move', tone: 'neutral' });
    expect(describeActivity('tasks', 'status', { finished: { before: false, after: true } })).toEqual({ kind: 'task_finish', tone: 'positive' });
    expect(describeActivity('tasks', 'status', { finished: { before: true, after: false } })).toEqual({ kind: 'task_unfinish', tone: 'muted' });
    expect(describeActivity('tasks', 'archive', {})).toEqual({ kind: 'task_archive', tone: 'negative' });
    expect(describeActivity('tasks', 'restore', {})).toEqual({ kind: 'task_restore', tone: 'positive' });
    expect(describeActivity('tasks', 'delete', {})).toEqual({ kind: 'task_delete', tone: 'negative' });
  });

  it('project: create, update, delete', () => {
    expect(describeActivity('projects', 'create', {})).toEqual({ kind: 'project_create', tone: 'positive' });
    expect(describeActivity('projects', 'update', { added_member_id: { before: null, after: 7 } })).toEqual({ kind: 'project_update', tone: 'neutral' });
    expect(describeActivity('projects', 'delete', {})).toEqual({ kind: 'project_delete', tone: 'negative' });
  });

  it('user: create, update, role change, temporary password, archive, restore, delete', () => {
    expect(describeActivity('users', 'create', {})).toEqual({ kind: 'user_create', tone: 'positive' });
    expect(describeActivity('users', 'update', { login: { before: 'a', after: 'b' } })).toEqual({ kind: 'user_update', tone: 'neutral' });
    expect(describeActivity('users', 'update', { role: { before: 'employee', after: 'admin' }, login: { before: 'a', after: 'b' } })).toEqual({ kind: 'user_role', tone: 'neutral' });
    expect(describeActivity('users', 'update', { password: { before: null, after: 'reset' } })).toEqual({ kind: 'user_password', tone: 'neutral' });
    expect(describeActivity('users', 'update', { password: { before: null, after: 'changed' } })).toEqual({ kind: 'user_own_password', tone: 'neutral' });
    expect(describeActivity('users', 'archive', {})).toEqual({ kind: 'user_archive', tone: 'negative' });
    expect(describeActivity('users', 'restore', {})).toEqual({ kind: 'user_restore', tone: 'positive' });
    expect(describeActivity('users', 'delete', {})).toEqual({ kind: 'user_delete', tone: 'negative' });
  });

  it('leave and contract types: create, update, hide, unhide', () => {
    for (const [area, prefix] of [['leave_types', 'leave_type'], ['contract_types', 'contract_type']] as const) {
      expect(describeActivity(area, 'create', {})).toEqual({ kind: `${prefix}_create`, tone: 'positive' });
      expect(describeActivity(area, 'update', {})).toEqual({ kind: `${prefix}_update`, tone: 'neutral' });
      expect(describeActivity(area, 'hide', {})).toEqual({ kind: `${prefix}_hide`, tone: 'muted' });
      expect(describeActivity(area, 'unhide', {})).toEqual({ kind: `${prefix}_unhide`, tone: 'positive' });
    }
  });

  it('unknown combination falls back to a neutral generic action', () => {
    expect(describeActivity('tasks', 'login', {})).toEqual({ kind: 'generic', tone: 'neutral' });
    expect(describeActivity('leave_requests', 'status', status('pending', 'pending'))).toEqual({ kind: 'generic', tone: 'neutral' });
  });
});

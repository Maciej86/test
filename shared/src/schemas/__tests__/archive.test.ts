import { describe, expect, it } from 'vitest';
import {
  archiveDeleteEmployeeSchema,
  archiveEmployeesQuerySchema,
  archivePageSchema,
  archiveTasksQuerySchema,
} from '../archive';
import { ARCHIVE_PATH, archiveEmployeesPath, archiveTaskPath } from '../../constants/archive';

describe('archive schemas', () => {
  it('lists: newest in the archive first by default', () => {
    expect(archiveEmployeesQuerySchema.parse({})).toEqual({ page: 1, search: '', sort: 'archived_at', dir: 'desc' });
    expect(archiveTasksQuerySchema.parse({ projectId: '7' })).toMatchObject({ sort: 'archived_at', dir: 'desc', projectId: 7 });
  });

  it('lists: an unknown sort column is an error (400 on the server)', () => {
    expect(archiveEmployeesQuerySchema.safeParse({ sort: 'name' }).success).toBe(false);
    expect(archiveTasksQuerySchema.safeParse({ sort: 'title' }).success).toBe(false);
  });

  it('tasks: projectId must be a whole number from 1', () => {
    expect(archiveTasksQuerySchema.safeParse({ projectId: '0' }).success).toBe(false);
    expect(archiveTasksQuerySchema.safeParse({ projectId: 'abc' }).success).toBe(false);
    expect(archiveTasksQuerySchema.parse({}).projectId).toBeUndefined();
  });

  it('delete account: confirmName required, up to 141 characters, trimmed', () => {
    expect(archiveDeleteEmployeeSchema.safeParse({}).success).toBe(false);
    expect(archiveDeleteEmployeeSchema.safeParse({ confirmName: 'a'.repeat(142) }).success).toBe(false);
    expect(archiveDeleteEmployeeSchema.parse({ confirmName: ' Olga Testowa ' })).toEqual({ confirmName: 'Olga Testowa' });
  });

  it('screen address: unknown tab falls back to employees, bad values are dropped', () => {
    expect(archivePageSchema.parse({ tab: 'foo' }).tab).toBe('employees');
    expect(archivePageSchema.parse({ tab: 'tasks', taskId: '12', projectId: 'x' })).toMatchObject({ tab: 'tasks', taskId: 12, projectId: undefined });
  });
});

describe('archive addresses', () => {
  it('open an account or a task in the archive', () => {
    expect(ARCHIVE_PATH).toBe('/admin/archive');
    expect(archiveTaskPath(5)).toBe('/admin/archive?tab=tasks&taskId=5');
    expect(archiveEmployeesPath('a b@x.pl')).toBe('/admin/archive?tab=employees&search=a%20b%40x.pl');
  });
});

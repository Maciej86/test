import { i18n } from '../../../test/render';
import { formatChangeValue, formatContext } from '../activityValues';

const t = i18n.getFixedT('pl', 'activity-log');
const v = (field: string, value: unknown) => formatChangeValue(field, value, t);

describe('formatChangeValue', () => {
  it('statuses, columns and roles are translated', () => {
    expect(v('status', 'approved')).toBe('Zatwierdzony');
    expect(v('column_key', 'in_progress')).toBe(i18n.t('column.in_progress', { ns: 'tasks' }));
    expect(v('role', 'admin')).toBe(i18n.t('roles.admin', { ns: 'common' }));
  });

  it('dates, yes/no, people, password and empty values', () => {
    expect(v('due_date', '2026-11-25')).toBe('25.11.2026');
    expect(v('hired_on', null)).toBeNull();
    expect(v('finished', true)).toBe('tak');
    expect(v('deducts_pool', 0)).toBe('nie');
    expect(v('assignee_ids', ['Jan Kowalski', null])).toBe('Jan Kowalski, usunięte konto');
    expect(v('member_ids', [])).toBeNull();
    expect(v('added_member_id', null)).toBeNull();
    expect(v('password', 'reset')).toBe('ustawiono hasło tymczasowe');
    expect(v('yearly_limit', null)).toBe('bez limitu');
    expect(v('title', '')).toBeNull();
    expect(v('working_days', 6)).toBe('6');
  });
});

describe('formatContext', () => {
  it('builds the short description from data per area', () => {
    expect(formatContext('leave_requests', { leaveType: 'Wypoczynkowy', from: '2026-12-22', to: '2026-12-31', days: 6 }, t)).toBe('Wypoczynkowy, 22.12.2026–31.12.2026, dni: 6');
    expect(formatContext('tasks', { project: 'Marketing' }, t)).toBe('projekt Marketing');
    expect(formatContext('leave_pools', { year: 2026 }, t)).toBe('rok 2026');
    expect(formatContext('users', { role: 'employee' }, t)).toBe(i18n.t('roles.employee', { ns: 'common' }));
    expect(formatContext('projects', null, t)).toBeNull();
    expect(formatContext('projects', { x: 1 }, t)).toBeNull();
  });
});

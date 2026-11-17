import { pathToFileURL } from 'node:url';
import { createI18n, type NotificationType } from '@app/shared';
import { pool } from '../db/pool';
import { withTransaction } from '../db/transaction';
import { activeIdsByRole, type Db } from '../modules/notifications/notifications.queries';
import { notifyUsers } from '../modules/notifications/notifications.service';

// `npm run notifications:test`: przykładowe powiadomienia każdego rodzaju dla aktywnych kont (dane jak w makiecie
// modułu Powiadomienia), żeby zobaczyć dzwonek, zanim powiadomienia zaczną tworzyć urlopy i zadania. Nie na serwerze.

const SAMPLES: { role: 'admin' | 'employee'; type: NotificationType; link: string; params: Record<string, string | number> }[] = [
  { role: 'admin', type: 'leave_request_new', link: '/admin/leave-requests', params: { employee: 'Jan Kowalski', leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08', dateTo: '2027-02-12', days: 5 } },
  { role: 'admin', type: 'leave_request_withdrawn', link: '/admin/leave-requests', params: { employee: 'Piotr Zieliński', leaveType: 'Wypoczynkowy', dateFrom: '2026-12-23', dateTo: '2026-12-31' } },
  { role: 'employee', type: 'leave_approved', link: '/admin/my-leave', params: { leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08', dateTo: '2027-02-12' } },
  { role: 'employee', type: 'leave_rejected', link: '/admin/my-leave', params: { leaveType: 'Na żądanie', dateFrom: '2026-12-04', dateTo: '2026-12-04', reason: 'tego dnia audyt klienta, potrzebna cała ekipa' } },
  { role: 'employee', type: 'leave_cancelled', link: '/admin/my-leave', params: { leaveType: 'Wypoczynkowy', dateFrom: '2026-11-16', dateTo: '2026-11-17', reason: 'Ustaliliśmy przesunięcie urlopu na styczeń.' } },
  { role: 'employee', type: 'task_assigned', link: '/admin/tasks', params: { task: 'Inwentaryzacja magazynu w Poznaniu', dueDate: '2026-11-20' } },
];

export const sendTestNotifications = async (conn: Db, env: Record<string, string | undefined>): Promise<{ admins: number; employees: number }> => {
  if (env.NODE_ENV === 'production') throw new Error('Przykładowe powiadomienia nie powstają na serwerze produkcyjnym.');
  // id 0 nie ma żadne konto, więc nikt nie zostanie pominięty jako „autor”.
  const actor = { id: 0, name: createI18n().t('test_actor', { ns: 'notifications' }) };
  const ids = { admin: await activeIdsByRole(conn, 'admin'), employee: await activeIdsByRole(conn, 'employee') };
  for (const sample of SAMPLES) {
    await notifyUsers(conn, { type: sample.type, params: sample.params, link: sample.link, actor, userIds: ids[sample.role] });
  }
  return { admins: ids.admin.length, employees: ids.employee.length };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const url = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  withTransaction((conn) => sendTestNotifications(conn, process.env))
    .then((counts) => console.log(createI18n().t('test_sent', { ns: 'notifications', ...counts, url })))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => void pool.end());
}

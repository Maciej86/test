import { pathToFileURL } from 'node:url';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createI18n, type LeaveRequestStatus } from '@app/shared';
import { pool } from '../db/pool';
import { withTransaction } from '../db/transaction';
import type { Db } from '../modules/my-leave/my-leave.queries';

// `npm run my-leave:approve-test [-- login]`: zatwierdza najnowszy wniosek czekający na decyzję (albo najnowszy wniosek
// osoby o tym loginie) jako pierwszy aktywny administrator, żeby sprawdzić PDF, zanim zatwierdzanie zbuduje moduł
// „Wnioski urlopowe”. Bez powiadomień i e-maili. Nie na serwerze.

const PENDING: LeaveRequestStatus = 'pending';
const APPROVED: LeaveRequestStatus = 'approved';

export interface ApprovedTestRequest {
  id: number;
  employee: string;
  admin: string;
}

export const approveNewestPending = async (
  conn: Db,
  env: Record<string, string | undefined>,
  login?: string,
): Promise<ApprovedTestRequest | null> => {
  if (env.NODE_ENV === 'production') throw new Error('Polecenie testowe nie działa na serwerze produkcyjnym.');
  const [admins] = await conn.query<RowDataPacket[]>('SELECT id, name FROM users WHERE role = ? AND archived_at IS NULL ORDER BY id LIMIT 1', ['admin']);
  const admin = admins[0];
  if (!admin) throw new Error('Brak aktywnego konta administratora (npm run admin).');
  const [rows] = login
    ? await conn.query<RowDataPacket[]>(
        'SELECT r.id, u.name AS employee FROM leave_requests r JOIN users u ON u.id = r.user_id WHERE r.status = ? AND u.login = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 1',
        [PENDING, login.trim().toLowerCase()],
      )
    : await conn.query<RowDataPacket[]>(
        'SELECT r.id, u.name AS employee FROM leave_requests r JOIN users u ON u.id = r.user_id WHERE r.status = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 1',
        [PENDING],
      );
  const request = rows[0];
  if (!request) return null;
  await conn.query<ResultSetHeader>(
    'UPDATE leave_requests SET status = ?, decided_by = ?, decided_by_name = ?, decided_at = NOW() WHERE id = ? AND status = ?',
    [APPROVED, admin.id, admin.name, request.id, PENDING],
  );
  return { id: request.id as number, employee: request.employee as string, admin: admin.name as string };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const t = createI18n().t;
  withTransaction((conn) => approveNewestPending(conn, process.env, process.argv[2]))
    .then((done) => console.log(done ? t('approve_test_done', { ns: 'my-leave', ...done }) : t('approve_test_none', { ns: 'my-leave' })))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => void pool.end());
}

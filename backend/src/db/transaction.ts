import type { PoolConnection } from 'mysql2/promise';
import { pool } from './pool';

/**
 * Kilka zapisów, które muszą się udać razem (także każdy zapis z historią zmian): wszystko albo nic.
 * Sama zatwierdza, cofa przy błędzie i oddaje połączenie. Nie wołaj pool.getConnection() ręcznie.
 *
 *   const id = await withTransaction(async (conn) => {
 *     const [result] = await conn.query('INSERT INTO orders ...', [...]);
 *     await logActivity(conn, { ... });
 *     return result.insertId;
 *   });
 */
export async function withTransaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

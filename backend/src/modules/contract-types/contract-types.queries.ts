import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { ContractTypeData, ContractTypeItem, SelectableContractType } from '@app/shared';
import { pool } from '../../db/pool';

/** Pula połączeń albo połączenie transakcji: oba mają `query`. */
export type Db = Pick<typeof pool, 'query'>;

interface ContractTypeRow extends RowDataPacket {
  id: number;
  name: string;
  position: number;
  hidden_at: Date | null;
}

/** Typ umowy z informacją, czy jest ukryty (dla Pracowników: sprawdzenie przy zapisie). */
export interface FoundContractType {
  id: number;
  name: string;
  hidden: boolean;
}

/** Lista na ekran: widoczne według kolejności, potem ukryte alfabetycznie; liczba pracowników także z archiwum. */
export const listContractTypes = async (db: Db): Promise<ContractTypeItem[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT c.id, c.name, c.hidden_at, COUNT(u.id) AS employees_count FROM contract_types c LEFT JOIN users u ON u.contract_type_id = c.id GROUP BY c.id, c.name, c.position, c.hidden_at ORDER BY c.hidden_at IS NOT NULL, CASE WHEN c.hidden_at IS NULL THEN c.position END, c.name',
  );
  return rows.map((r) => ({ id: r.id as number, name: r.name as string, hidden: r.hidden_at !== null, employeesCount: Number(r.employees_count) }));
};

/** `forShare`: w transakcji blokuje typ do końca zapisu (Pracownicy), więc równoczesne „Ukryj” poczeka. */
export const findContractType = async (db: Db, id: number, options: { forShare?: boolean } = {}): Promise<FoundContractType | null> => {
  const sql = options.forShare
    ? 'SELECT id, name, position, hidden_at FROM contract_types WHERE id = ? FOR SHARE'
    : 'SELECT id, name, position, hidden_at FROM contract_types WHERE id = ?';
  const [rows] = await db.query<ContractTypeRow[]>(sql, [id]);
  const r = rows[0];
  return r ? { id: r.id, name: r.name, hidden: r.hidden_at !== null } : null;
};

/** Typ o tej nazwie (bez względu na wielkość liter, także ukryty), z pominięciem `exceptId`. */
export const findByName = async (db: Db, name: string, exceptId: number | null): Promise<FoundContractType | null> => {
  const [rows] = await db.query<ContractTypeRow[]>(
    'SELECT id, name, position, hidden_at FROM contract_types WHERE name = ? AND (? IS NULL OR id <> ?) LIMIT 1',
    [name, exceptId, exceptId],
  );
  const r = rows[0];
  return r ? { id: r.id, name: r.name, hidden: r.hidden_at !== null } : null;
};

/** Największa pozycja (0 przy pustej tabeli); w transakcji blokuje tabelę, żeby dwa nowe typy nie dostały tej samej. */
export const maxPosition = async (db: Db): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT MAX(position) AS max FROM contract_types FOR UPDATE');
  return Number(rows[0]?.max ?? 0);
};

export const insertContractType = async (db: Db, data: ContractTypeData, position: number): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>('INSERT INTO contract_types (name, position) VALUES (?, ?)', [data.name, position]);
  return result.insertId;
};

export const updateContractType = async (db: Db, id: number, data: ContractTypeData): Promise<void> => {
  await db.query('UPDATE contract_types SET name = ? WHERE id = ?', [data.name, id]);
};

/** Widoczne typy zablokowane do końca transakcji (przesuwanie, ukrywanie). */
export const lockVisible = async (db: Db): Promise<{ id: number; position: number }[]> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id, position FROM contract_types WHERE hidden_at IS NULL ORDER BY position FOR UPDATE');
  return rows.map((r) => ({ id: r.id as number, position: r.position as number }));
};

export const setPosition = async (db: Db, id: number, position: number): Promise<void> => {
  await db.query('UPDATE contract_types SET position = ? WHERE id = ?', [position, id]);
};

export const setHidden = async (db: Db, id: number): Promise<void> => {
  await db.query('UPDATE contract_types SET hidden_at = NOW() WHERE id = ?', [id]);
};

export const setVisible = async (db: Db, id: number, position: number): Promise<void> => {
  await db.query('UPDATE contract_types SET hidden_at = NULL, position = ? WHERE id = ?', [position, id]);
};

/** Dla modułu Pracownicy: typy do wyboru w oknie pracownika, w ustalonej kolejności. */
export const listSelectableContractTypes = async (db: Db = pool): Promise<SelectableContractType[]> => {
  const [rows] = await db.query<ContractTypeRow[]>('SELECT id, name, position, hidden_at FROM contract_types WHERE hidden_at IS NULL ORDER BY position');
  return rows.map((r) => ({ id: r.id, name: r.name }));
};

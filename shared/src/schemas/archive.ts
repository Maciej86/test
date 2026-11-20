import { z } from 'zod';
import { ARCHIVE_TABS } from '../constants/archive';
import { FIRST_NAME_MAX, LAST_NAME_MAX } from '../constants/login';
import type { Role } from '../constants/roles';
import type { TaskColumn } from '../constants/tasks';
import { addressNumber, text } from './fields';
import { listQuerySchema, type ListResponse } from './list';

/** Listy archiwum: zawsze najnowsze w archiwum na górze (jedyna kolumna sortowania). */
const archiveList = listQuerySchema(['archived_at']).extend({ dir: z.enum(['asc', 'desc']).catch('desc').default('desc') });

/** `GET /api/archive/employees?page&search` */
export const archiveEmployeesQuerySchema = archiveList;
export type ArchiveEmployeesQuery = z.output<typeof archiveEmployeesQuerySchema>;

/** `GET /api/archive/tasks?page&search&projectId` (zły numer projektu: 400). */
export const archiveTasksQuerySchema = archiveList.extend({ projectId: addressNumber.optional() });
export type ArchiveTasksQuery = z.output<typeof archiveTasksQuerySchema>;

/** Imię i nazwisko wpisane w oknie „Usuń na stałe” (imię + spacja + nazwisko). */
export const archiveDeleteEmployeeSchema = z.object({ confirmName: text(FIRST_NAME_MAX + 1 + LAST_NAME_MAX) });
export type ArchiveDeleteEmployeeInput = z.output<typeof archiveDeleteEmployeeSchema>;

/**
 * Adres ekranu: `?tab=tasks&search=…&projectId=3&page=2&taskId=12`. Zły parametr (np. stary link) jest pomijany.
 * `taskId` otwiera podgląd zadania (link z Historii zmian).
 */
export const archivePageSchema = z.object({
  tab: z.enum(ARCHIVE_TABS).catch('employees').default('employees'),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  search: archiveList.shape.search,
  projectId: addressNumber.optional().catch(undefined),
  taskId: addressNumber.optional().catch(undefined),
});
export type ArchivePageParams = z.output<typeof archivePageSchema>;

export interface ArchiveCounts {
  employees: number;
  tasks: number;
}

export interface ArchivedEmployee {
  id: number;
  name: string;
  login: string;
  role: Role;
  archivedAt: string;
  /** Kto przeniósł do archiwum; konto usunięte na stałe: null. */
  archivedByName: string | null;
  /** Wnioski urlopowe w każdym statusie; więcej niż 0 = nie da się usunąć na stałe. */
  leaveRequests: number;
  /** Zadania (także w archiwum), do których osoba jest przypisana. */
  tasks: number;
}

export interface ArchivedTask {
  id: number;
  title: string;
  projectId: number;
  projectName: string;
  column: TaskColumn;
  dueDate: string | null;
  /** Liczba komentarzy. */
  comments: number;
  archivedAt: string;
  archivedByName: string | null;
}

export interface ArchivedTasksResponse extends ListResponse<ArchivedTask> {
  /** Projekty, które mają zadania w archiwum (pole wyboru projektu). */
  projects: { id: number; name: string }[];
}

export interface ArchivedTaskDetails extends ArchivedTask {
  description: string | null;
  assignees: { name: string; archived: boolean }[];
  commentsList: { id: number; authorName: string; authorArchived: boolean; createdAt: string; text: string }[];
}

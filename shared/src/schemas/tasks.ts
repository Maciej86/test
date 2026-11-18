import { z } from 'zod';
import type { Role } from '../constants/roles';
import {
  PROJECT_MEMBERS_MAX,
  PROJECT_NAME_MAX,
  PROJECT_NAME_MIN,
  TASK_ASSIGNEES_MAX,
  TASK_COLUMNS,
  TASK_DESCRIPTION_MAX,
  TASK_MESSAGES,
  TASK_TITLE_MAX,
  TASK_TITLE_MIN,
  type TaskColumn,
} from '../constants/tasks';
import { todayIsoDate } from '../date';
import { addressNumber, idList, isoDate, optionalField, text, textRange } from './fields';

/** Okno projektu „Dodaj projekt” / „Edytuj” (POST i PUT /api/tasks/projects). */
export const projectSchema = z.object({
  name: textRange(PROJECT_NAME_MIN, PROJECT_NAME_MAX),
  memberIds: idList(PROJECT_MEMBERS_MAX),
});

/** „Usuń projekt na stałe”: trzeba wpisać nazwę projektu (DELETE /api/tasks/projects/:id). */
export const projectDeleteSchema = z.object({ confirmName: text(PROJECT_NAME_MAX) });

/** Zadanie (PUT /api/tasks/:id): termin może być w przeszłości. */
export const taskSchema = z.object({
  title: textRange(TASK_TITLE_MIN, TASK_TITLE_MAX),
  description: optionalField(text(TASK_DESCRIPTION_MAX)),
  dueDate: optionalField(isoDate),
  column: z.enum(TASK_COLUMNS),
  assigneeIds: idList(TASK_ASSIGNEES_MAX),
});

/** Nowe zadanie (POST /api/tasks/projects/:id/tasks): termin najwcześniej dziś (strefa aplikacji). */
export const newTaskSchema = taskSchema.refine((t) => t.dueDate === null || t.dueDate >= todayIsoDate(), {
  message: TASK_MESSAGES.dueInPast,
  path: ['dueDate'],
});

/** Przeniesienie karty: kolumna i zadanie, przed którym ma stanąć (`null` = na koniec kolumny). */
export const taskMoveSchema = z.object({
  column: z.enum(TASK_COLUMNS),
  beforeTaskId: addressNumber.nullable(),
});

/** Parametry tablicy: `oldDone=1` dokłada zrealizowane starsze niż 30 dni. */
export const boardQuerySchema = z.object({
  oldDone: z
    .enum(['0', '1'])
    .optional()
    .transform((v) => v === '1'),
});

/** Widok tablicy w adresie: wyszukiwarka, „Tylko moje zadania” i otwarte zadanie (`?task=` z powiadomienia). */
export const boardViewSchema = z.object({
  search: z.string().trim().max(TASK_TITLE_MAX).default(''),
  // W adresie `mine=true` (tak zapisuje useListParams); `mine=1` z ręcznie wpisanego adresu też działa.
  mine: z
    .enum(['0', '1', 'false', 'true'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  task: addressNumber.optional(),
});
export type BoardView = z.output<typeof boardViewSchema>;

export type ProjectInput = z.input<typeof projectSchema>;
export type ProjectData = z.output<typeof projectSchema>;
export type ProjectDeleteInput = z.output<typeof projectDeleteSchema>;
export type TaskInput = z.input<typeof taskSchema>;
export type TaskData = z.output<typeof taskSchema>;
export type TaskMoveInput = z.output<typeof taskMoveSchema>;
export type BoardQuery = z.output<typeof boardQuerySchema>;

/** Członek projektu na liście projektów; `openTasks` = jego otwarte zadania w tym projekcie. */
export interface ProjectMember {
  id: number;
  name: string;
  archived: boolean;
  openTasks: number;
}

/** Projekt w menu i na liście projektów (GET /api/tasks/projects). */
export interface ProjectItem {
  id: number;
  name: string;
  position: number;
  members: ProjectMember[];
  openCount: number;
  doneCount: number;
  createdAt: string;
}

export interface ProjectsResponse {
  items: ProjectItem[];
}

/** Pracownik do wyboru w oknie projektu. */
export interface ProjectCandidate {
  id: number;
  name: string;
}

/** Osoba na tablicy: widzi projekt albo jest przypisana; `assignable` = można ją dodać do zadania. */
export interface BoardPerson {
  id: number;
  name: string;
  role: Role;
  archived: boolean;
  assignable: boolean;
}

/** Zatwierdzony urlop przypisanej osoby przed terminem zadania (tylko daty). */
export interface TaskLeave {
  userId: number;
  dateFrom: string;
  dateTo: string;
}

export interface BoardTask {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  column: TaskColumn;
  position: number;
  completedAt: string | null;
  createdByName: string;
  createdAt: string;
  assigneeIds: number[];
  leaves: TaskLeave[];
}

/** Tablica projektu (GET /api/tasks/projects/:id/board). */
export interface BoardResponse {
  project: { id: number; name: string };
  people: BoardPerson[];
  tasks: BoardTask[];
  oldDoneCount: number;
}

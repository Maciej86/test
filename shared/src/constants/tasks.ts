/** Zadania i projekty (moduł Zadania). */

/** Kolumny tablicy: W opracowaniu, W toku, Zrealizowane (ENUM column_key w bazie). */
export const TASK_COLUMNS = ['draft', 'in_progress', 'done'] as const;
export type TaskColumn = (typeof TASK_COLUMNS)[number];

/** Tytuł 3–150 znaków (VARCHAR(150)), opis do 2000, do 10 przypisanych osób. */
export const TASK_TITLE_MIN = 3;
export const TASK_TITLE_MAX = 150;
export const TASK_DESCRIPTION_MAX = 2000;
export const TASK_ASSIGNEES_MAX = 10;

/** Nazwa projektu 2–60 znaków (VARCHAR(60)), do 50 członków. */
export const PROJECT_NAME_MIN = 2;
export const PROJECT_NAME_MAX = 60;
export const PROJECT_MEMBERS_MAX = 50;

/** Co ile tablica pyta serwer o zmiany innych osób (gdy karta przeglądarki jest widoczna). */
export const TASK_BOARD_REFRESH_MS = 5_000;
/** Zrealizowane dawniej niż tyle dni temu chowają się same. */
export const TASK_HIDE_DONE_AFTER_DAYS = 30;
/** Zadanie bez terminu: urlopy przypisanych osób w najbliższych tylu dniach. */
export const TASK_LEAVE_LOOKAHEAD_DAYS = 14;

/** Klucze błędów serwera modułu (teksty w tasks.json). */
export const TASK_MESSAGES = {
  projectNameTaken: 'tasks.project_name_taken',
  projectConfirmMismatch: 'tasks.project_confirm_mismatch',
  assigneeNotAllowed: 'tasks.assignee_not_allowed',
  memberNotAllowed: 'tasks.member_not_allowed',
  dueInPast: 'tasks.due_in_past',
  beforeTaskInvalid: 'tasks.before_task_invalid',
} as const;

/** Adresy ekranów: sam „Zadania” (przekierowanie), lista projektów, tablica projektu. */
export const TASKS_PATH = '/admin/tasks';
export const TASK_PROJECTS_PATH = '/admin/tasks/projects';
export const TASK_BOARD_PATH = '/admin/tasks/:projectId';

/** Adres tablicy projektu; z `taskId` otwiera od razu podgląd zadania (link z powiadomienia). */
export const taskBoardPath = (projectId: number, taskId?: number): string =>
  `${TASKS_PATH}/${projectId}${taskId === undefined ? '' : `?task=${taskId}`}`;

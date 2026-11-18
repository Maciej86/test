# Plan: Zadania, część 1: Projekty i tablice

**Spec:** `SPEC-1.md` (i ogólny `SPEC.md`). Każdy krok: najpierw test, który nie przechodzi, potem kod, potem
`npm run check` zielony i odhaczenie. Wykonanie w tej rozmowie, na `main`.

**Stałe ze specu (obowiązują w każdym kroku):** kolumny `draft` / `in_progress` / `done`; tytuł 3–150, opis do 2000,
termin przy dodawaniu ≥ dziś (Europe/Warsaw), przypisani 0–10; nazwa projektu 2–60, członkowie 0–50; tablica
odświeżana co 5000 ms; zrealizowane chowane po 30 dniach od `completed_at`; urlop bez terminu: 14 dni naprzód;
podgląd zadania 540 px; teksty tylko z `tasks.json`; kolory z motywu; funkcje strzałkowe.

**Używam ponownie:** `ConfirmModal`, `EmptyState`, `PageHeader`, `DataState`, `DateField`, `DateText`, `ButtonIcon`,
`SearchField` (common), `notify`, `useListParams` (core, filtry tablicy w adresie), `withTransaction`, `Db`,
`isDuplicateEntry`, `logActivity`/`diffChanges` (db), `idParam`, `reply`, `fail`, `notFound`, `actorOf`
(routeHelpers), `validateBody`, `mountModule`, `requireRole`, `notifyUsers` (notifications), `listActiveUsers`
(employees), `formatDate`, `formatDateTime`, `todayIsoDate`, `dayjs`, `isoDate`, `optionalField`, `text`,
`addressNumber` (shared), e2e `logIn`, `employee`, `typed` (helpers).

**Wydzielam:**
- strzałki kolejności z Typów urlopów i Typów umów (front) → `frontend/src/common/OrderArrows.tsx` (parametry:
  `index`, `count`, `onMove(direction)`); makietowy `mockups/src/common/OrderArrows.tsx` dostaje to samo API;
  teksty `move_up`/`move_down` tylko w `common.json`;
- kierunek strzałek: `LEAVE_TYPE_DIRECTIONS`, `CONTRACT_TYPE_DIRECTIONS` i dwa schematy `…MoveSchema` →
  `ORDER_DIRECTIONS`, `OrderDirection`, `orderMoveSchema` w `shared/src/schemas/ordering.ts`;
- `moveType` z Typów urlopów i Typów umów (zamiana z sąsiadem) → `swapWithNeighbour` w `backend/src/db/ordering.ts`.

**Review focus (łatwo przeoczyć, testy w krokach):**
1. Pracownik zgaduje numer cudzego projektu albo zadania (adres, `beforeTaskId`, `assigneeIds`) → 404 / 400, nic się
   nie zmienia (kroki 7–9).
2. Dwie osoby przeciągają karty w tej samej kolumnie naraz → pozycje bez dziur i powtórzeń (krok 9, blokada
   `FOR UPDATE` kolumny).
3. Odświeżanie co 5 s w trakcie przeciągania albo edycji nie gubi tego, co osoba robi (krok 14).
4. Usunięty projekt albo usunięta osoba z projektu, a ktoś ma otwartą tablicę → komunikat braku dostępu, nie pusty
   ekran ani błąd (krok 14).
5. Termin „dziś” liczony w strefie Europe/Warsaw, nie UTC (o 0:30 czasu polskiego dzień jest już nowy) (krok 4).

---

- [x] **0. Szkielet testów.** Pliki z `it.todo` dla każdego wymagania:
  `shared/src/schemas/__tests__/tasks.test.ts`, `shared/src/schemas/__tests__/ordering.test.ts`,
  `backend/src/db/__tests__/ordering.test.ts`, `backend/src/modules/tasks/__tests__/tasks.migration.test.ts`,
  `…/tasks/__tests__/projects.routes.test.ts`, `…/tasks/__tests__/board.routes.test.ts`,
  `…/tasks/__tests__/tasks.routes.test.ts`, `…/tasks/__tests__/tasks.service.test.ts`,
  `frontend/src/common/__tests__/OrderArrows.test.tsx`, `frontend/src/modules/tasks/__tests__/` (`tasks.api`,
  `ProjectsPage`, `TaskBoardPage`, `TaskCard`, `TaskFormModal`, `TaskDrawer`), `e2e/tasks.spec.ts`. Lista `it.todo`
  = wiersze tabel API i pól ze `SPEC-1.md` plus scenariusze `TESTS-1.md` → `npm run check`.

- [ ] **1. Wydzielenie kolejności strzałkami.**
  - Test `ordering.test.ts` (shared): `orderMoveSchema` przyjmuje `up`/`down`, odrzuca `left` (klucz
    `validation.required`/enum). Kod: `ORDER_DIRECTIONS = ['up', 'down'] as const`, `OrderDirection`,
    `orderMoveSchema`, `OrderMoveInput`; usunięcie `LEAVE_TYPE_DIRECTIONS`, `CONTRACT_TYPE_DIRECTIONS`,
    `leaveTypeMoveSchema`, `contractTypeMoveSchema` i ich typów, podmiana w trasach, usługach i `*.api.ts`.
  - Test `backend/src/db/__tests__/ordering.test.ts`: `swapWithNeighbour(conn, rows, id, 'up', setPosition)` zamienia
    pozycje z poprzednim; pierwszy w górę i ostatni w dół → `{ ok: true }` bez zapisu; brak `id` → 404. Kod:
    `swapWithNeighbour = async (db: Db, rows: {id: number; position: number}[], id: number, direction:
    OrderDirection, setPosition: (db: Db, id: number, position: number) => Promise<void>): Promise<Result>`; `moveType`
    w obu modułach woła go po `lockVisible`. Istniejące testy tras Typów urlopów i umów dalej zielone.
  - Test `OrderArrows.test.tsx` (front): pierwsza pozycja ma wyłączone „Przesuń wyżej”, ostatnia „Przesuń niżej”,
    kliknięcie woła `onMove('down')`. Kod `frontend/src/common/OrderArrows.tsx`; makietowy dostaje `onMove?:
    (d: OrderDirection) => void` (test makiety poprawiony). Podmiana w `LeaveTypesTable` i `ContractTypesTable`;
    `move_up`/`move_down` usunięte z `leave-types.json` i `contract-types.json` → `npm run check`.

- [ ] **2. Biblioteka `@dnd-kit`.** `npm install -w @app/frontend -w @app/mockups @dnd-kit/core @dnd-kit/sortable
  @dnd-kit/utilities` (wersje sprzed co najmniej 2 tygodni), wpis jest już w „Bibliotekach” `SPEC-GENERAL.md`;
  `npm audit --omit=dev` bez „high”/„critical` → `npm run check`.

- [ ] **3. Migracje.** Test `tasks.migration.test.ts` (wzór: `my-leave.migration.test.ts`): każdy plik ma swoje
  `FOREIGN KEY … ON DELETE` z tabeli relacji `SPEC-1.md`, `projects.name` jest `UNIQUE`, `tasks.column_key` to
  `ENUM('draft','in_progress','done')`, indeks (`project_id`, `archived_at`, `column_key`, `position`).
  Pliki: `019_projects.sql`, `020_project_members.sql`, `021_tasks.sql`, `022_task_assignees.sql` →
  `npm run migrate`, `npm run check`.

- [ ] **4. Wspólne stałe i schematy.**
  - `shared/src/constants/tasks.ts`: `TASK_COLUMNS`, `TaskColumn`, `TASK_TITLE_MIN = 3`, `TASK_TITLE_MAX = 150`,
    `TASK_DESCRIPTION_MAX = 2000`, `TASK_ASSIGNEES_MAX = 10`, `PROJECT_NAME_MIN = 2`, `PROJECT_NAME_MAX = 60`,
    `PROJECT_MEMBERS_MAX = 50`, `TASK_BOARD_REFRESH_MS = 5000`, `TASK_HIDE_DONE_AFTER_DAYS = 30`,
    `TASK_LEAVE_LOOKAHEAD_DAYS = 14`, `TASK_MESSAGES` (klucze `tasks.project_name_taken`,
    `tasks.project_confirm_mismatch`, `tasks.assignee_not_allowed`, `tasks.member_not_allowed`,
    `tasks.due_in_past`, `tasks.task_not_found`), ścieżki `TASKS_PATH = '/admin/tasks'`,
    `TASK_PROJECTS_PATH`, `taskBoardPath(projectId, taskId?)`.
  - `fields.ts`: `textRange(min, max)` (trim, `tooShort` / `tooLong`), test w `fields.test.ts`.
  - `shared/src/schemas/tasks.ts`: `projectSchema` (`name`, `memberIds` bez powtórzeń), `projectDeleteSchema`
    (`confirmName`), `taskSchema` (`title`, `description`, `dueDate`, `column`, `assigneeIds` bez powtórzeń),
    `newTaskSchema` = `taskSchema` + `dueDate` ≥ `todayIsoDate()` (klucz `tasks.due_in_past`), `taskMoveSchema`
    (`column`, `beforeTaskId: addressNumber.nullable()`), `boardQuerySchema` (`oldDone` 0/1); typy odpowiedzi
    `ProjectItem`, `ProjectMember`, `BoardPerson`, `BoardTask`, `BoardResponse`, `TaskLeave`.
  - Testy: wartości graniczne każdego pola z tabeli „Pola formularzy” (2, 2/3, 60/150, 61/151 znaków; 10 i 11
    osób; 50 i 51 członków; powtórzony numer → błąd), termin wczoraj / dziś przy `newTaskSchema` z zegarem
    ustawionym na 2026-11-18 00:30 czasu polskiego (= 2026-11-17 23:30 UTC; „dziś” to 18.11) → `npm run check`.

- [ ] **5. Menu z projektami (shared, front, makieta).**
  - `NavItem` dostaje `text?: string` (gotowa etykieta zamiast klucza); `NavMenu` i `mockups/src/Shell.tsx`
    pokazują `item.text ?? translateKey(t, item.label)` (test w `NavMenu.test.tsx`).
  - `NAVIGATION`: `tasks` staje się grupą `children: [{ key: 'task-projects', path: '/admin/tasks/projects', label:
    'common.nav.task_projects', icon: 'folder-cog', roles: ['admin'] }]`; `common.json` `nav.task_projects`
    („Projekty”). Test `navigation` w shared: `rolesFor('tasks')` = admin, employee.
  - `mockups/src/modules/tasks/navigation.tsx`: projekty dokładane **przed** stałą pozycją z konfiguracji (z `text`
    zamiast kluczy `mockup_projects`), ekran `task-projects` w `TASK_SCREENS` → `npm run check`.

- [ ] **6. Powiązanie z urlopami.** Test w `leave-requests.queries.test.ts`: `listApprovedLeaves(db, [5, 6],
  '2026-11-18', '2026-12-02')` pyta tylko o status `approved` i nakładanie się dat, zwraca `{ userId, dateFrom,
  dateTo }[]` bez rodzaju i powodu; pusta lista osób → `[]` bez zapytania. Kod w `leave-requests.queries.ts`
  → `npm run check`.

- [ ] **7. Projekty: zapytania, usługa, trasy.** Pliki `backend/src/modules/tasks/projects.queries.ts`,
  `projects.service.ts`, `tasks.routes.ts` (jeden router modułu, `mountModule(api, 'tasks', tasksRoutes)` w `app.ts`).
  Testy w `projects.routes.test.ts` (wzór: `leave-types.routes.test.ts`, usługa podmieniona) i
  `tasks.service.test.ts` (zapytania podmienione):
  - `GET /tasks/projects`: admin dostaje wszystkie, pracownik tylko te z `project_members` (warunek w SQL z
    `req.user.id`), z `members` (z `openTasks`), `openCount`, `doneCount` bez archiwum; 401 bez logowania.
  - `GET /tasks/projects/candidates`, `POST`, `PUT /:id`, `POST /:id/move`, `DELETE /:id`: pracownik → 403.
  - `POST`: 201; nazwa 1 znak → 400 z polem `name`; powtórzona → 409 `tasks.project_name_taken` z polem `name`
    (`isDuplicateEntry`); członek z rolą `admin` albo z archiwum → 400 `tasks.member_not_allowed` (członek już
    zapisany, który przeszedł do archiwum, przy `PUT` może zostać); nowi członkowie dostają `project_added` z linkiem
    `/admin/tasks/<id>`; wpis historii `projects`/`create`.
  - `PUT`: usunięty członek znika z `task_assignees` tylko w zadaniach projektu z `column_key <> 'done'`; wpis
    historii z członkami przed → po; nieistniejący → 404.
  - `POST /:id/move`: przez `swapWithNeighbour` na `lockProjects`.
  - `DELETE`: `confirmName` inne niż nazwa → 400 `tasks.project_confirm_mismatch`; zgodne → `{ ok, deletedTasks }`
    (wszystkie zadania projektu, także w archiwum), wpis historii `projects`/`delete` z nazwą i liczbą.
  - Funkcja dla Pracowników: `addMemberWhereAssigned(conn: PoolConnection, userId: number, actor: Actor):
    Promise<number[]>` dopisuje osobę do projektów, w których ma przypisane zadanie spoza `done` i spoza archiwum,
    zwraca numery projektów, wpis historii `projects`/`update` dla każdego → `npm run check`.

- [ ] **8. Tablica projektu.** `GET /tasks/projects/:id/board` w `board.routes.test.ts` i `tasks.service.test.ts`:
  pracownik spoza projektu → 404 (bez zdradzania, że projekt jest); admin bez członkostwa → 200; `people` =
  aktywni administratorzy i członkowie (z `assignable`) plus osoby z archiwum przypisane do zadań; `tasks` bez
  archiwum, w kolejności `column_key`, `position`; zrealizowane z `completed_at` starszym niż 30 dni pominięte, ich
  liczba w `oldDoneCount`, a z `?oldDone=1` są w `tasks`; `leaves` tylko dla zadań spoza `done` z terminem ≥ dziś
  (bez terminu: dziś + 14 dni), z `listApprovedLeaves`; `?oldDone=2` → 400 → `npm run check`.

- [ ] **9. Zadania: dodanie, zmiana, przeniesienie, archiwum.** Pliki `tasks.queries.ts`, `tasks.service.ts`.
  Testy w `tasks.routes.test.ts` i `tasks.service.test.ts`:
  - `POST /tasks/projects/:id/tasks`: 201; termin wczoraj → 400 `tasks.due_in_past` (pole `dueDate`); osoba spoza
    projektu, z archiwum albo pracownik niebędący członkiem → 400 `tasks.assignee_not_allowed` (pole
    `assigneeIds`); projekt niewidoczny → 404; nowe zadanie na górze kolumny (pozycje kolumny od nowa), w `done`
    od razu `completed_at`; `created_by` i `created_by_name` z `req.user`, nie z treści; powiadomienie
    `task_assigned` dla przypisanych poza autorem z linkiem `/admin/tasks/<projectId>?task=<id>`; historia
    `tasks`/`create`.
  - `PUT /tasks/:taskId`: termin w przeszłości dozwolony; zmiana kolumny → karta na górze nowej kolumny i
    `completed_at` ustawione / skasowane; powiadomienie tylko dla nowo przypisanych; osoba już przypisana, która
    przeszła do archiwum, może zostać; zadanie w archiwum albo z niewidocznego projektu → 404; historia
    `tasks`/`update` (przypisani przed → po).
  - `POST /tasks/:taskId/move`: w obrębie kolumny i między kolumnami; `beforeTaskId` z innego projektu, z innej
    kolumny niż docelowa albo w archiwum → 400; kolumna blokowana `SELECT … FOR UPDATE`, pozycje 1..n bez dziur
    (test: dwa przeniesienia po kolei dają 1..n); wejście do `done` ustawia `completed_at`, wyjście kasuje,
    przesunięcie w `done` zostawia; historia `tasks`/`status` tylko przy zmianie kolumny.
  - `POST /tasks/:taskId/archive`: `archived_at`, `archived_by` z `req.user`; drugi raz → 404; historia
    `tasks`/`archive`.
  - Blok `describe('abuse')`: zmyślone numery w adresie (`0`, `-1`, `1e3`, `0x10`, `007`, `21;DROP`) → 404 bez
    wołania usługi; pracownik nie przypisze się do cudzego projektu przez `PUT` cudzego zadania → 404 →
    `npm run check`.

- [ ] **10. Zmiana roli w Pracownikach.** Test w `employees.service.test.ts` (albo trasach): zmiana roli
  `admin` → `employee` w tej samej transakcji woła `addMemberWhereAssigned(conn, id, actor)`; inne zmiany (bez zmiany
  roli, `employee` → `admin`) jej nie wołają. Kod w `employees.service.ts` (import z
  `../tasks/projects.service`, jedyne miejsce, gdzie moduł woła funkcję innego modułu, zgodnie z „Powiązaniami”)
  → `npm run check`.

- [ ] **11. Powiadomienia.** Test w `shared` (`notifications.test.ts` już sprawdza teksty każdego rodzaju):
  `NOTIFICATION_TYPES` + `project_added`; `notifications.json` `types.project_added.title` („Dodano Cię do
  projektu”) i `detail` („„{{project}}””); ikona rodzaju w dzwonku (`folder`, kolor `navy`) z testem
  `NotificationItem`. W `docs/modules/notifications/SPEC.md` link `task_assigned` →
  `/admin/tasks/<projectId>?task=<id>` i wiersz `project_added` → `npm run check`.

- [ ] **12. Hooki frontu `tasks.api.ts`.** Test `tasks.api.test.tsx` (wzór: `leave-requests.api.test.tsx`):
  `useProjects()` → `GET /tasks/projects`; `useProjectCandidates(enabled)`; `useSaveProject()` (POST bez `id`, PUT z
  `id`), `useMoveProject()`, `useDeleteProject()` odświeżają klucz `['tasks']`; `useBoard(projectId, oldDone)` →
  `GET /tasks/projects/<id>/board` z `refetchInterval: TASK_BOARD_REFRESH_MS`, `refetchIntervalInBackground: false`,
  `refetchOnWindowFocus: true`, `placeholderData: keepPreviousData`; `useSaveTask()`, `useArchiveTask()`;
  `useMoveTask(projectId)` zmienia od razu dane tablicy w pamięci (`setQueryData`), przy błędzie przywraca
  poprzednie i odświeża → `npm run check`.

- [ ] **13. Menu i trasy we froncie.**
  - `frontend/src/core/routes/useAppNavigation.ts`: `useAppNavigation(): NavItem[]` dokłada do grupy `tasks`
    pozycje z `useProjectNavItems()` (z modułu Zadania: `{ key: 'task-project-<id>', path: taskBoardPath(id), text:
    name, icon: 'folder', roles: ['admin', 'employee'] }`) przed „Projektami”; `AppLayout` używa go zamiast
    `NAVIGATION`. Test: pracownik z dwoma projektami widzi „Zadania” z dwoma pozycjami; bez projektów nie widzi
    grupy; administrator widzi projekty i „Projekty”.
  - `buildAppRoutes`: trasy bez pozycji w menu `/admin/tasks/:projectId` (`pages['task-board']`) i `/admin/tasks`
    (`pages['tasks-home']`: przekierowanie na pierwszy projekt, bez projektów na Pulpit, administratora na listę
    projektów); `PAGES`: `task-projects`, `task-board`, `tasks-home`. Test w `buildAppRoutes.test.tsx`; numer
    projektu nie z cyfr → „nie znaleziono” → `npm run check`.

- [ ] **14. Tablica projektu (front).** Pliki `frontend/src/modules/tasks/TaskBoardPage.tsx`,
  `components/BoardColumn.tsx`, `components/TaskCard.tsx`, `components/PersonAvatar.tsx`, `components/BoardHeader.tsx`
  (każdy plik poniżej ok. 250 linii). Układ z makiety (`TasksMockup.tsx`, `TaskCard.tsx`). Testy
  (`renderWithProviders`, `api` podmienione):
  - ładowanie / błąd / pusty projekt (tekst i „Dodaj zadanie”) / 404 → „Nie masz dostępu do tego projektu albo projekt
    został usunięty.” z przyciskiem na Pulpit;
  - nagłówek z liczbą otwartych i po terminie; karta: termin czerwony po czasie, żółty dziś i jutro, „Zrealizowane
    DD.MM.RRRR”, „+N” przy 4 osobach, szare kółko osoby z archiwum, kropka urlopu z podpowiedzią dat, pasek przy
    moim zadaniu;
  - wyszukiwarka i „Tylko moje” w adresie (`?search=…&mine=1`), liczniki „pasujące / wszystkie”, „Brak pasujących
    zadań.”; „Pokaż starsze zrealizowane (N)” pobiera z `oldDone=1`;
  - „⋮ → Przenieś do” woła `useMoveTask` z `beforeTaskId: null`; przeciąganie przez `@dnd-kit` (test logiki
    `dropTarget(...)` w osobnej funkcji `components/boardDrop.ts`: z miejsca upuszczenia wylicza `column` i
    `beforeTaskId`); w trakcie przeciągania odświeżanie nie podmienia kolejności (dane z serwera wchodzą po
    upuszczeniu);
  - na telefonie (`useMediaQuery` podmienione) przełącznik kolumn z liczbami, domyślnie „W toku”;
  - `?task=<id>` otwiera podgląd; nieznany numer → dymek „Nie znaleziono zadania.” → `npm run check`.

- [ ] **15. Okno nowego zadania, podgląd, usunięcie (front).** Pliki `components/TaskFields.tsx`,
  `components/TaskFormModal.tsx`, `components/TaskDrawer.tsx` (`size={540}`), `components/ArchiveTaskModal.tsx`
  (na `ConfirmModal`). Testy: puste i 2-znakowe pole „Tytuł” → błąd pod polem; termin wczoraj w nowym zadaniu → błąd;
  lista osób = `people` z `assignable`, osoba nieprzypisywalna już przypisana zostaje wyłączona; żółta ramka „Urlop
  przed terminem” z datami; zapis woła `useSaveTask` i pokazuje dymek; błąd 400 z serwera trafia pod pole
  (`fieldError`); podgląd z otwartą edycją nie traci wpisanych wartości po odświeżeniu tablicy; „Usuń” → okno →
  `useArchiveTask` → dymek → `npm run check`.

- [ ] **16. Lista projektów (front).** Pliki `ProjectsPage.tsx`, `components/ProjectsTable.tsx`,
  `components/ProjectModal.tsx`, `components/DeleteProjectModal.tsx`. Testy: tabela z kolumnami ze specu i karty na
  telefonie, strzałki (`OrderArrows`) wołają `useMoveProject`, pusta lista z „Dodaj projekt”; okno: powtórzona
  nazwa → błąd pod polem; usunięcie z członków osoby z otwartymi zadaniami → żółta ramka z liczbą (z `openTasks`
  osoby w odpowiedzi `members`); przycisk „Edytuj projekt” w nagłówku tablicy (tylko administrator) otwiera to samo
  okno; okno usunięcia: przycisk wyłączony, dopóki nazwa się nie zgadza, po usunięciu z
  tablicy tego projektu przejście na listę projektów; pracownik na `/admin/tasks/projects` → „Brak dostępu”
  → `npm run check`.

- [ ] **17. Makieta, dokumenty, wygląd.** Makieta tablicy przeciąga przez `@dnd-kit` jak aplikacja (te same
  `boardDrop`-owe zasady, bez API); `SPEC-GENERAL.md`: wiersze Mapy dostępu z tabeli API `SPEC-1.md`; `DESIGN.md`:
  wzorce „Podgląd z prawej (szuflada 540 px)” i „Karta zadania” → `npm run check`.

- [ ] **18. E2e ze scenariuszy `TESTS-1.md`.** `e2e/tasks.spec.ts`: administrator zakłada projekt z dwoma pracownikami → pracownik A dodaje zadanie i przypisuje
  B → B widzi powiadomienie i link otwiera podgląd → B przenosi kartę do „Zrealizowane” → A widzi zmianę bez
  odświeżania (≤ 7 s) → administrator usuwa B z projektu (B znika z otwartego zadania) → usuwa projekt po wpisaniu
  nazwy. `npm run test:e2e` zielony.

- [ ] **19. Przegląd kodu** całej części (lista kontrolna z `CONVENTIONS.md`), poprawki z testami → `npm run check`.

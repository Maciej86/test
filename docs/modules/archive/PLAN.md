# Plan: Archiwum

**Spec:** `docs/modules/archive/SPEC.md` · wykonanie w tej rozmowie, krok po kroku: test → kod → `npm run check`.

**Używam ponownie:** `ConfirmModal`, `DataState`, `EmptyState`, `PageHeader`, `SearchField`, `ListPagination`,
`DateText`, `ButtonIcon` (common); `useListParams`, `notify`, `apiErrorMessage` (core); `listQuerySchema`,
`validateQuery`, `validateBody`, `idParam`, `reply` / `fail` / `notFound` (`routeHelpers`), `withTransaction`,
`logActivity`, `mountModule` (backend); `restoreEmployee` (employees), `lockProject` (tasks), `initials`,
`formatDateTime`, `TABLE_MIN_WIDTH`, `PAGE_SIZE` (shared/backend).
**Wydzielam:** okno „usuń na stałe po wpisaniu nazwy” z `tasks/components/DeleteProjectModal.tsx` →
`common/ConfirmByNameModal.tsx` (front i makiety; parametry: `title`, `confirmLabel`, `name`, `inputLabel`,
`loading`, `onConfirm(name)`, `onClose`, `children`); podmiana w Projektach i w makiecie Archiwum.
Bez wydzielania: kółko osoby i komentarz tylko do oglądania w podglądzie (kilka linii; wersje w Zadaniach mają urlop
i edycję).

## Kształty danych (shared, krok 2)

- `ARCHIVE_PATH = '/admin/archive'`, `archiveEmployeesPath(login)` → `/admin/archive?tab=employees&search=<login>`,
  `archiveTaskPath(id)` → `/admin/archive?tab=tasks&taskId=<id>`.
- `ARCHIVE_MESSAGES = { hasLeaveRequests: 'archive.has_leave_requests', notArchived: 'archive.not_archived' }`,
  `SERVER_MESSAGES.archiveFirst = 'server.archive_first'`.
- `archiveEmployeesQuerySchema = listQuerySchema(['archived_at'])` (domyślnie `dir: 'desc'`),
  `archiveTasksQuerySchema` = to samo + `projectId` (liczba ≥ 1, opcjonalna); `archiveDeleteEmployeeSchema =
  z.object({ confirmName: text(141) })`; front: `archivePageSchema` = `tab: 'employees' | 'tasks'` (domyślnie
  employees), `taskId?` + pola obu list.
- Typy: `ArchivedEmployee { id, name, login, role, archivedAt, archivedByName: string | null, leaveRequests, tasks }`,
  `ArchivedTask { id, title, projectId, projectName, column, dueDate, comments, archivedAt, archivedByName }`,
  `ArchivedTasksResponse = ListResponse<ArchivedTask> & { projects: { id, name }[] }`,
  `ArchivedTaskDetails = ArchivedTask & { description, assignees: { name, archived }[], commentsList: { authorName,
  authorArchived, createdAt, text }[] }`, `ArchiveCounts { employees, tasks }`.

## Kroki

- [x] 0. **Szkielet testów** (`it.todo`, po jednym na wymaganie): `backend/src/modules/archive/__tests__/archive.routes.test.ts`
  (każdy wiersz tabeli API: sukces, 400, 404, 409; 401 i 403), `employees/__tests__/archived.service.test.ts`
  (lista, liczby, blokada wniosków, zła nazwa, wpis historii), `tasks/__tests__/archived.service.test.ts` (lista
  z filtrem projektu, podgląd 404 dla aktywnego, przywrócenie na koniec kolumny, usunięcie z komentarzami, wpisy
  historii), `frontend/src/modules/archive/__tests__/ArchivePage.test.tsx`, `e2e/archive.spec.ts` (scenariusze
  `TESTS.md`) → `npm run check`
- [x] 1. **Wydzielenie `ConfirmByNameModal`** (front `common/` + makiety `common/`): test (przycisk wyłączony, dopóki
  tekst po `trim()` ≠ `name`; `onConfirm` dostaje obcięty tekst); podmiana w `DeleteProjectModal` i w makiecie
  `archive/ArchiveModals.tsx`; wzór „Usunięcie na stałe” w `DESIGN.md` wskazuje klocek → `npm run check`
- [x] 2. **Shared**: `constants/archive.ts`, `schemas/archive.ts`, typy jak wyżej, `server.archive_first` w
  `server.json`, klucze `has_leave_requests`, `not_archived`, `gone`, `confirm_label` w `archive.json`; testy
  schematów (domyślne `dir=desc`, zły `sort` → błąd, `projectId=0` → błąd, `confirmName` 142 znaki → błąd,
  `tab=foo` → employees; adresy `archiveTaskPath(5)`, `archiveEmployeesPath('a b@x.pl')` kodują znaki) → `npm run check`
- [ ] 3. **Liczby z innych modułów**: `countRequestsByUser(db, userIds): Promise<Map<number, number>>`
  (`my-leave.queries.ts`, każdy status) i `countAssignmentsByUser(db, userIds)` (`tasks.queries.ts`, także zadania
  w archiwum); testy: pusta lista bez zapytania, SQL z `?` → `npm run check`
- [ ] 4. **Pracownicy w archiwum** (`employees.queries.ts` + `employees.service.ts`):
  `listArchivedEmployees(query): Promise<ListResponse<ArchivedEmployee>>` (`archived_at IS NOT NULL`, szukanie po
  imieniu, nazwisku, loginie przez `LIKE ?`, `ORDER BY archived_at DESC, id DESC`, `PAGE_SIZE`, nazwisko
  przenoszącego z `LEFT JOIN users`); `countArchivedEmployees(db)`;
  `deleteArchivedEmployee(id, confirmName, actor): Promise<Result>` (transakcja, `findUser … FOR UPDATE`, kolejność
  sprawdzeń: 404 → 409 `archiveFirst` → 409 `hasLeaveRequests` → 400 `confirmName` (pole) → `DELETE` → `logActivity`
  `delete`/`users`); testy na podmienionym `conn` jak w module Pracownicy, w tym każda gałąź błędu bez `DELETE`
  → `npm run check`
- [ ] 5. **Zadania w archiwum** (`tasks.queries.ts` + `tasks.service.ts`): `listArchivedTasks(query)` (z `projects`
  mającymi zadania w archiwum, szukanie po tytule, filtr `projectId`, licznik komentarzy, nazwisko przenoszącego),
  `countArchivedTasks(db)`, `getArchivedTask(id): Promise<Result<ArchivedTaskDetails>>` (aktywne → 404),
  `restoreArchivedTask(id, actor)` (`lockProject`, 404 / 409 `notArchived`, pozycja = `MAX(position)+1` kolumny
  wśród aktywnych, `archived_at/by = NULL`, `logTask` `restore`), `deleteArchivedTask(id, actor)` (`lockProject`,
  404 / 409 `archiveFirst`, `DELETE`, `logTask` `delete`); testy na podmienionym `conn` → `npm run check`
- [ ] 6. **Trasy** `backend/src/modules/archive/archive.routes.ts` (tabela API ze specu) +
  `mountModule(api, 'archive', archiveRoutes)` w `app.ts`; `GET /counts` łączy oba liczniki; testy tras (dane,
  400 złe parametry i nazwa, 404 dla `abc`, 409, jeden 401 i jeden 403); wiersze w „Mapie dostępu” w
  `SPEC-GENERAL.md` (zamiast ogólnego `/api/archive`) i potwierdzenie RESTRICT `leave_requests.user_id` (odpowiedź 1a)
  → `npm run check`
- [ ] 7. **Historia zmian: „Otwórz w archiwum”**: `linkOf` dla rekordu w archiwum zwraca `archiveTaskPath(id)`
  (zadanie) albo `archiveEmployeesPath(login)` (konto, pula); `OpenRecord` przy `state === 'archived'` pokazuje
  przycisk `open_in_archive` (klucz w `activity-log.json`); testy usługi i komponentu (link archiwum, przycisk, brak
  przycisku dla usuniętego) → `npm run check`
- [ ] 8. **Hooki** `frontend/src/modules/archive/archive.api.ts`: `useArchiveCounts`, `useArchivedEmployees(params)`,
  `useArchivedTasks(params)`, `useArchivedTask(id | null)`, `useRestoreEmployee`, `useDeleteEmployee`,
  `useRestoreTask`, `useDeleteTask` (sukces i błąd odświeżają `['archive']`, przywrócenie też `['employees']` /
  `['tasks']`, `keepPreviousData` na listach); testy z podmienionym `api` → `npm run check`
- [ ] 9. **Ekran i zakładka Pracownicy**: `ArchivePage.tsx` (nagłówek, zakładki z licznikami, parametry w adresie
  przez `useListParams(archivePageSchema, …)`, zmiana zakładki czyści `search`, `projectId`, `page`),
  `components/ArchivedEmployees.tsx` (tabela + karty na telefonie, dymek przy wyłączonym „Usuń na stałe”),
  `components/EmployeeModals.tsx` (przywróć, usuń przez `ConfirmByNameModal`); błąd 404/409 → dymek `gone`,
  zamknięcie, odświeżenie; wpis w `core/routes/pages.ts` (makieta już ma wpis) ; testy komponentów (stany: lista,
  pusta, brak wyników; przycisk wyłączony przy wnioskach; okno wysyła `confirmName`; 409 → dymek `gone`) → `npm run check`
- [ ] 10. **Zakładka Zadania i podgląd**: `components/ArchivedTasks.tsx` (wyszukiwarka, wybór projektu z
  `projects`, tabela + karty, kliknięcie wiersza ustawia `taskId` w adresie), `components/TaskPreview.tsx` (szuflada
  540 px / cały ekran na telefonie, tylko do oglądania, akcje), `components/TaskModals.tsx` (przywróć z kolumną,
  usuń z liczbą komentarzy); `taskId` z adresu otwiera podgląd (link z Historii), nieistniejący → dymek `gone`
  i czysty adres; testy (podgląd z adresu, przyciski w podglądzie otwierają okna, 404 → `gone`) → `npm run check`
- [ ] 11. **Zgodność z makietą i telefonem**: porównanie w przeglądarce (komputer i 390 px) z
  `mockups/src/modules/archive/`; poprawki z testem, gdy coś się różni → `npm run check`
- [ ] 12. **E2E** `e2e/archive.spec.ts` ze scenariuszy `TESTS.md` (konta i zadania zakłada test, `e2e.tmp.*`,
  projekty „E2E …”) → `npm run check`, `npm run test:e2e`
- [ ] 13. **Przegląd kodu** całego modułu (lista kontrolna z `CONVENTIONS.md`), poprawki z testem → `npm run check`

## Uwagi

- Krok 0: szkielety testów usług pracowników i zadań leżą na razie w `backend/src/modules/archive/__tests__/*.todo.test.ts`, bo test zasad nie przepuszcza `it.todo` w zrobionych modułach; gotowe testy trafiają do `employees/__tests__` i `tasks/__tests__`, a pliki `.todo` znikają.
- Krok 2: klucze błędów modułu jak w innych modułach: `archive.server.has_leave_requests`, `archive.server.not_archived`, `archive.server.confirm_mismatch` (spec pisał `archive.has_leave_requests`); `ARCHIVE_TABS` w stałych. Komentarze w podglądzie: pole `commentsList` (liczba komentarzy to `comments`).

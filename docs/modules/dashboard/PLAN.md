# Plan: Pulpit

**Spec:** `docs/modules/dashboard/SPEC.md` (zaakceptowany 2026-11-20). Wykonanie w tej rozmowie, krok po kroku:
test, który nie przechodzi → kod → `npm run check` → odhaczenie.

**Używam ponownie:** `InfoCard`, `PageHeader`, `DataState`, `DateText`, `PersonAvatar`, `ButtonIcon`, `EmptyState`
(common); `todayIsoDate`, `formatDate`, `dayjs`, `getHoliday`, `isWeekend`, `taskBoardPath`, `TASK_HIDE_DONE_AFTER_DAYS`
(shared); `getMyLeaveOverview` (my-leave), `reply`, `Viewer` (`middleware/routeHelpers`), `mountModule`.
**Wydzielam:**
- termin zadania (`dueState` z `tasks/taskDue.ts`) → `shared/src/taskDue.ts` jako `taskDueState(dueDate, column, today)`;
  podmiana w `TaskCard` i `TaskBoardPage`.
- karta puli (`PoolCard` z `my-leave/components/PoolCards.tsx`) → `common/PoolCard.tsx` (teksty do `common.json`,
  `pool.*`); podmiana w Moich urlopach.
- pasek dni z osobami (`TeamStrip` w leave-requests) → `common/LeaveStrip.tsx` (rama: nagłówek dni, wiersze osób,
  komórki, legenda; treść: dni, wiersze, podpisy, wyróżniony dzień); `TeamStrip` zostaje cienką nakładką.
  Porównane z: `TeamStrip` (leave-requests), `DayStrip` (my-leave: jeden wiersz dni bez osób, inna rama, zostaje),
  makieta `mockups/src/modules/dashboard/AbsenceStrip.tsx`.
**Osobno, bez wydzielania:** `listAbsences` i `listOverlapping` (leave-requests) mają podobny SQL, ale inne warunki
(wszystkie osoby spoza archiwum vs. inne osoby niż wnioskodawca); kilka linii, zostają osobno.

## Kroki

- [x] 0. Szkielet testów (`it.todo`) z wymagań specu → `npm run check`:
  - `backend/src/modules/dashboard/__tests__/dashboard.routes.test.ts`: GET bez logowania → 401; z hasłem
    tymczasowym → 403; administrator → `role: 'admin'` ze wszystkimi boksami; pracownik → `role: 'employee'` bez
    `pending`, `absences`, `projects`, `overdue`; pracownik nie widzi cudzych wniosków ani zadań z cudzych projektów.
  - `backend/src/modules/dashboard/__tests__/dashboard.service.test.ts`: `today` z `todayIsoDate()`; listy przycięte do
    5 z `total`; pracownik bez puli → `pool: null`.
  - `backend/src/modules/dashboard/__tests__/leave-requests.todo.test.ts` (pierwsza linia:
    `// Docelowo: backend/src/modules/leave-requests/__tests__/dashboard.queries.test.ts`), `my-leave.todo.test.ts`
    (`my-leave/__tests__/dashboard.queries.test.ts`), `tasks.todo.test.ts` (`tasks/__tests__/dashboard.queries.test.ts`):
    wymagania z kroków 4–6.
  - `frontend/src/modules/dashboard/__tests__/DashboardPage.test.tsx`: wymagania z kroków 8–9.
  - `e2e/dashboard.spec.ts`: scenariusze z `TESTS.md` (`test.fixme`).
- [x] 1. Wydzielenie terminu zadania: `taskDueState(dueDate: string | null, column: TaskColumn, today = todayIsoDate()):
  'overdue' | 'soon' | 'normal' | null` w `shared/src/taskDue.ts` (eksport z `index.ts`), test w
  `shared/src/__tests__/taskDue.test.ts` (wczoraj → overdue, dziś i jutro → soon, pojutrze → normal, `done` i `null`
  → null); `TaskCard` i `TaskBoardPage` wołają nową funkcję, `dueState` znika z `tasks/taskDue.ts` → `npm run check`.
- [x] 2. Wydzielenie karty puli: `common/PoolCard.tsx` (`PoolCard({ pool, actions? }: { pool: MyLeaveOverview['pool'];
  actions?: ReactNode })`), klucze `pool_title`, `pool_left`, `pool_aria`, `pool_hint`, `legend_*` przeniesione do
  `common.json` jako `pool.*`; test `common/__tests__/PoolCard.test.tsx` (liczba, legenda, 0 dni → `red.4`
  `data-left="none"`, przycisk z `actions`); Moje urlopy używają klocka, ich testy bez zmian zielone → `npm run check`.
- [x] 3. Wydzielenie paska: `common/LeaveStrip.tsx`:
  `LeaveStrip({ days, rows, labels, highlight? })`, `rows: { name: string; bold?: boolean; markOn: (iso) => StripMark }[]`,
  `StripMark = 'request' | 'approved' | 'pending' | 'none'`, `labels: Partial<Record<StripMark, string>>` (legenda
  pokazuje tylko podane), `highlight` = dzień podkreślony `navy.4` (`data-today`); dymek święta i weekendu z
  `common.json` (`strip.weekend`, `strip.off`). Test `common/__tests__/LeaveStrip.test.tsx` (święto przekreślone
  z nazwą, kolory komórek, legenda tylko z podanych, wyróżniony dzień); `TeamStrip` przepisany na `LeaveStrip`, jego
  test bez zmian zielony → `npm run check`.
- [ ] 4. Typy i stałe: `shared/src/constants/dashboard.ts` (`DASHBOARD_BOX_LIMIT = 5`, `DASHBOARD_ABSENCE_DAYS = 14`),
  `shared/src/schemas/dashboard.ts`: `DashboardPendingRequest`, `DashboardAbsence`, `DashboardProjectCounts`,
  `DashboardTask` (`id, title, projectId, projectName, column: 'draft' | 'in_progress', dueDate, assignees?:
  { name; archived }[]`), `DashboardOwnRequest`, `AdminDashboard`, `EmployeeDashboard`,
  `DashboardResponse = AdminDashboard | EmployeeDashboard` (pole `role`), pola jak w tabeli API specu. Funkcje
  leave-requests (prawdziwe testy w `leave-requests/__tests__/dashboard.queries.test.ts`, usunięte z pliku `.todo`):
  - `listPendingForDashboard(db, limit): Promise<{ items: DashboardPendingRequest[]; total }>`: tylko `pending`,
    każdy rok, `ORDER BY date_from, created_at, id`, `limit`, `total` wszystkich czekających.
  - `listAbsences(db, from, to): Promise<DashboardAbsence[]>` (`{ name, dateFrom, dateTo, status }`): `approved`
    i `pending`, zakres zahacza o `from`–`to` (także zaczęty wcześniej i kończący później), bez kont w archiwum,
    `ORDER BY date_from, name`; bez typu i komentarza w wyniku.
  → `npm run check`
- [ ] 5. Funkcja my-leave: `listUpcomingOwn(db, userId, today): Promise<{ pending: DashboardOwnRequest[];
  nextApproved: DashboardOwnRequest | null }>` (`{ id, typeName, dateFrom, dateTo, workingDays }`) w
  `my-leave.queries.ts`; testy w `my-leave/__tests__/dashboard.queries.test.ts`: tylko własne; czekające od
  najwcześniejszego początku; najbliższy zatwierdzony z `date_to >= today` (trwający dziś też), zakończony wczoraj
  nie; odrzucony, wycofany, anulowany pomijane → `npm run check`
- [ ] 6. Funkcje tasks (`tasks.queries.ts`, testy w `tasks/__tests__/dashboard.queries.test.ts`):
  - `projectTaskCounts(db, today, doneSince): Promise<DashboardProjectCounts[]>`: każdy projekt (także bez zadań, same
    zera) w kolejności `position`; bez zadań z archiwum; `overdue` = `due_date < today` i kolumna ≠ `done`;
    `doneRecently` = `completed_at >= doneSince`.
  - `listOverdueTasks(db, today, limit): Promise<{ items: DashboardTask[]; total }>`: wszystkie projekty, bez archiwum
    i `done`, `ORDER BY due_date, project position, position`, z przypisanymi (imię, archiwum).
  - `listMyOpenTasks(db, viewer: Viewer, today, limit): Promise<{ items; total }>`: przypisane do `viewer.id`, kolumna
    `draft`/`in_progress`, bez archiwum, projekt widoczny (warunek jak `findVisibleProject`); kolejność: po terminie,
    potem termin rosnąco, `NULL` na końcu, potem `position` projektu i zadania.
  → `npm run check`
- [ ] 7. Usługa i trasa: `backend/src/modules/dashboard/dashboard.service.ts`, `getDashboard(viewer: Viewer):
  Promise<DashboardResponse>` (dziś = `todayIsoDate()`, zakres nieobecności dziś + 13 dni, `doneSince` =
  dziś − `TASK_HIDE_DONE_AFTER_DAYS`; pracownik: `pool` z `getMyLeaveOverview(viewer.id)?.pool ?? null`);
  `dashboard.routes.ts` (`GET /`), `mountModule(api, 'dashboard', dashboardRoutes)` w `app.ts`; testy usługi i tras
  z kroku 0; plik `.todo` usunięty, gdy pusty; w `SPEC-GENERAL.md` Mapa dostępu: wiersz `GET /api/dashboard` →
  `npm run check`
- [ ] 8. Ekran administratora: `frontend/src/modules/dashboard/dashboard.api.ts` (`useDashboard()`, klucz
  `['dashboard']`), `DashboardPage.tsx` z `DataState` i `PageHeader` („Dziś piątek, 20.11.2026”), boksy
  w `components/`: `PendingBox` (znacznik liczby, „zaczyna się …”: za N dni / jutro / dziś / „termin już się zaczął”,
  żółte przy ≤ 7 dniach), `AbsenceBox` (`LeaveStrip`, „Dziś nie ma: …” tylko z zatwierdzonych), `ProjectsBox`
  (tabela + zadania po terminie z kółkami), `MyTasksBox` (`TaskRow` z `taskDueState`, „dziś”/„jutro”/„bez terminu”,
  „i jeszcze N zadań”, link `taskBoardPath(projectId, id)`). Testy w `DashboardPage.test.tsx` (dane z makiety, puste
  stany, linki) → `npm run check`
- [ ] 9. Ekran pracownika: `PoolCard` z przyciskiem „Złóż wniosek” (`/admin/my-leave`), bez puli zdanie
  `pool.no_pool` bez przycisku; `MyRequestsBox`; `MyTasksBox` na całą szerokość. Klucze `ready` i `start_card` usunięte
  z `dashboard.json`, dopisane `pending.starts_today`, `pending.started`, `pool.no_pool`. Testy w
  `DashboardPage.test.tsx` → `npm run check`
- [ ] 10. Test e2e `e2e/dashboard.spec.ts` ze scenariuszy `TESTS.md` → `npm run test:e2e`, `npm run check`; przegląd
  kodu całego modułu.

## Na co uważać (bez osobnego kroku, testy w krokach)

1. Granica dnia: „dziś” liczone w `Europe/Warsaw` (`todayIsoDate`), nie w UTC; testy kroków 5–6 podają `today`
   jawnie, zadanie z terminem = dziś nie jest po terminie.
2. Wniosek czekający, którego termin już się zaczął: zostaje w „Wnioskach do rozpatrzenia” z napisem „termin już się
   zaczął” (krok 8).
3. Urlop zaczęty przed dziś i trwający: widać go na pasku od pierwszej kolumny (krok 4) i jako najbliższy zatwierdzony
   (krok 5).
4. Pracownik usunięty z projektu: jego zadania z tego projektu nie trafiają do „Moich zadań” (krok 6).
5. Zadania z archiwum i zrealizowane nie liczą się ani w „Po terminie”, ani w „Moich zadaniach” (krok 6).

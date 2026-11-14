# Plan: Pracownicy

> Wykonanie: w tej rozmowie, krok po kroku (`superpowers:executing-plans` + `superpowers:test-driven-development`),
> na gałęzi `main`. Każdy krok: test, który nie przechodzi → kod → `npm run check` → odhaczenie `- [x]`.

**Cel:** lista pracowników z paskiem puli, dodawanie i edycja z pulą na rok otwarty, hasło tymczasowe, „Zamknij rok”,
archiwizacja i przywracanie; tabela `leave_pools`.

**Architektura:** backend `modules/employees/`: `employees.routes.ts` (trasy, `validateBody`/`validateQuery`),
`employees.queries.ts` (SQL na `users` i `leave_pools`), `employees.service.ts` (rok otwarty, liczenie puli,
zamknięcie roku, zapisy w `withTransaction` z `logActivity`). Podpięcie `mountModule(api, 'employees',
employeesRoutes)`. Front `modules/employees/`: `EmployeesListPage.tsx`, `components/` (pasek puli, okna),
`employees.api.ts`. Testy backendu z podmienionym `pool` / zapytaniami (jak `auth.routes.test.ts`), całość z bazą
w e2e.

**Spec:** `docs/modules/employees/SPEC.md` · `docs/CONVENTIONS.md` · makieta `mockups/src/modules/employees/`

## Zasady całego planu

- Teksty tylko w `shared/locales/pl/employees.json`, `validation.json`, `server.json`; kod po angielsku.
- Stałe w `shared/src/constants/employees.ts`: `USER_NAME_MIN = 2`, `ANNUAL_DAYS_MAX = 60`,
  `CARRIED_DAYS_MAX = 120`, `ANNUAL_DAYS_DEFAULT = 26`, `EMPLOYEE_SORTS = ['name', 'days_left'] as const`,
  `EMPLOYEE_MESSAGES` (klucze błędów serwera `employees.*`). Długości kont z `constants/login.ts`.
- Rok otwarty i „bieżący rok” zawsze w strefie `APP_TIME_ZONE` (funkcje dat z `@app/shared`).
- Każdy zapis z historią w `withTransaction`; `logActivity` nigdy nie zapisuje hasła ani skrótu.
- Testy zasad niezmienione; `// rule-ok:` tylko z konkretnym powodem.

## Na co uważać (testy dopisane w krokach)

1. Dwa szybkie kliknięcia „Zamknij rok” → drugie żądanie 409 `year_not_open`, pule nie powstają podwójnie (krok 5).
2. Login `Ewa.Mazur@Firma.pl ` przy koncie w archiwum `ewa.mazur@firma.pl` → 409 z `archivedUser` (krok 3).
3. Zmiana roli Pracownik → Administrator → Pracownik: pula roku otwartego zostaje i wraca, bez drugiego wiersza
   (krok 4).
4. Edycja pracownika z zaległymi 70 (po zamknięciu roku) zapisuje się (krok 1, 4).
5. Pracownik zarchiwizowany w trakcie sesji: następne kliknięcie → 401 (działa z Logowania; test w kroku 6).

---

- [x] **0. Szkielet testów.** `it.todo` dla każdego wymagania z kroków 1–12 (nazwy jak niżej) w:
  `shared/src/schemas/fields.test.ts` (dopisane), `shared/src/schemas/employees.test.ts`,
  `backend/src/modules/employees/employees.service.test.ts`, `backend/src/modules/employees/employees.routes.test.ts`,
  `frontend/src/modules/employees/EmployeesListPage.test.tsx`, `frontend/src/modules/employees/components/*.test.tsx`,
  `e2e/employees.spec.ts` (`test.fixme`). → `npm run check`

- [x] **1. Pola i schematy.**
  - `fields.ts`: `wholeNumber(min: number, max: number)` (liczba lub tekst cyfr → `number`; ułamek →
    `validation.whole_number`; poza zakresem → `validation.range` z `{ min, max }` w kluczu przez `params`; puste →
    `validation.required`). Test: 0/60 ok, −1/61 błąd, `2.5` błąd, `'26'` → 26.
  - `shared/src/schemas/employees.ts`: `employeeBase = { name: text(USER_NAME_MAX).min(USER_NAME_MIN, 'validation.name_too_short'),
    login, email: optionalField(email), role: z.enum(ROLES), annualDays: wholeNumber(0, ANNUAL_DAYS_MAX).optional(),
    carriedDays: wholeNumber(0, CARRIED_DAYS_MAX).optional() }` z `superRefine`: rola `employee` bez `annualDays` →
    `validation.required` na `annualDays` (`carriedDays` domyślnie 0). `employeeCreateSchema = employeeBase + password:
    newPassword`, `employeeUpdateSchema = employeeBase`, `employeePasswordSchema = { password: newPassword }`,
    `closeYearSchema = { year: z.int(), pools: z.array({ userId: z.int().positive(), annualDays: wholeNumber(0, 60) }) }`,
    `employeesListQuerySchema = listQuerySchema(EMPLOYEE_SORTS).extend({ role: z.enum(ROLES).optional().catch(undefined) })`.
    Typy `EmployeeInput`, `EmployeeListItem`, `EmployeePool`, `CloseYearPreview`, `EmployeesListResponse`.
  - Testy: imię 1/2/150/151 znaków; login z wielkimi literami → małe; e-mail pusty → `null`; rola `employee` bez
    puli → błąd na `annualDays`, `admin` bez puli ok; zaległe 120 ok, 121 błąd; hasło `Urlop2026` → `password_rules`;
    `role=kot` w adresie → brak filtra; `sort=password` → błąd.
  - Teksty `validation.json`: `whole_number`, `range`, `name_too_short`.

- [x] **2. Migracja i zapytania.** `backend/migrations/003_leave_pools.sql` (kolumny ze specu, `UNIQUE (user_id, year)`,
  `INDEX (year)`, `fk_leave_pools_user` `ON DELETE CASCADE`). `employees.queries.ts`:
  `listEmployees(q: { search, role, sort, dir, page, pageSize, year }): Promise<{ rows; total }>` (bez archiwum,
  `LEFT JOIN leave_pools` na rok, sort `name` → `SUBSTRING_INDEX(name, ' ', -1), name`, `days_left` →
  `role = 'admin', annual_days + carried_days` — mapa kolumn w kodzie, `// rule-ok` przy wstawieniu z mapy),
  `countEmployees(): { all, admins }`, `findUserByLoginOrEmail(conn, login, email, exceptId?)` (także archiwum →
  `{ id, name, archived, field }`), `findEmployee(conn, id)`, `insertUser`, `updateUser`, `setPassword(conn, id, hash)`
  (`must_change_password = 1`), `setArchived(conn, id, byUserId | null)`, `minOpenYear(conn)`,
  `upsertPool(conn, userId, year, annual, carried)`, `findPoolsForYear(conn, year)`, `closePool(conn, id)`.
  Testy (podmieniony `pool`/`conn`): każde SQL z `?`; sort spoza mapy niemożliwy (typ); test CASCADE pul w e2e-seed
  (`npm run migrate` i usunięcie użytkownika w `seedE2e`-teście). → `npm run migrate`, `npm run check`

- [ ] **3. Lista i dodawanie (trasy).** `employees.service.ts`: `getOpenYear(conn?): Promise<number>`,
  `getPoolUsage(userIds: number[], year: number): Promise<Map<number, { usedDays: number; pendingDays: number }>>`
  (na razie zera; komentarz: podmienia moduł my-leave), `toPool(row, usage): EmployeePool` (zaległe schodzą
  pierwsze: `leftCarried = carried − min(used, carried)`), `createEmployee(input, actor)`. Trasy:
  `GET /employees` → `{ items, total, page, pageSize, openYear, counts }`, `isMe` z `req.user.id`, pula `null` dla
  admina; `POST /employees` → 201 `{ id }`, hasło `hashPassword`, `must_change_password = 1`, pula na rok otwarty
  przy roli `employee`, `logActivity` `create` (bez hasła). `mountModule(api, 'employees', employeesRoutes)` w
  `app.ts`. Testy: lista bez `password_hash`; `isMe`; `toPool` 26+4, wykorzystane 9 → zostało 21, zaległe 0;
  0 wykorzystanych → zostało z zaległych 4; `sort=days_left`; login aktywny zajęty → 409 `fields.login =
  employees.login_taken`; w archiwum → `employees.login_taken_archived` + `archivedUser`; e-mail tak samo
  (`email_taken`, `email_taken_archived`); `ER_DUP_ENTRY` z bazy → 409; zapis w jednej transakcji z historią;
  401 bez logowania, 403 dla `employee`; rok otwarty: brak pul → bieżący rok, pule 2026 zamknięte i 2027 otwarte →
  2027.

- [ ] **4. Edycja.** `PUT /employees/:id` z `validateBody(employeeUpdateSchema)`: brak lub w archiwum → 404; zmiana
  własnej roli → 409 `employees.own_role`; login/e-mail jak w kroku 3 (poza tym kontem); rola `employee` → `upsertPool`
  roku otwartego; rola `admin` → pula nietknięta; historia: `users` `update` z `diffChanges` (tylko zmienione) i
  `leave_pools` `update`/`create`, gdy pula się zmieniła. Testy: wszystkie przypadki; edycja z zaległymi 70 → 200;
  pracownik → admin → pracownik: jedno `upsertPool` na ten sam rok, bez nowego wiersza; brak zmian → brak wpisu
  historii.

- [ ] **5. Hasło, archiwum, przywrócenie, zamknięcie roku.**
  - `POST /:id/password` (`employeePasswordSchema`): 404 dla brakującego/archiwum; `setPassword`; historia
    `password: { before: null, after: 'reset' }`. Test: w odpowiedzi i historii nie ma hasła ani skrótu.
  - `POST /:id/archive`: własne → 409 `employees.archive_self`; już w archiwum → 409 `employees.already_archived`;
    historia `archive`. `POST /:id/restore`: aktywne → 409 `employees.not_archived`; historia `restore`.
  - `GET /close-year` → `CloseYearPreview` (osoby spoza archiwum z pulą roku otwartego, `left`, `annualDays`,
    `canClose = openYear ≤ bieżący rok`, `pendingRequests: 0`). `POST /close-year` (`closeYearSchema`): `year` ≠
    otwarty → 409 `employees.year_not_open`; `year` > bieżący → 409 `employees.year_too_early`; w jednej transakcji
    każda pula roku Y (także archiwum): `closePool`, `upsertPool(Y+1, annual z żądania albo z Y, carried = zostało)`,
    historia. Testy: 26+4−9 → nowa pula 26 / zaległe 21; osoba w archiwum dostaje pulę z Y; drugie żądanie dla tego
    samego roku → 409; `pools` z obcym `userId` jest pomijane; rok 2027 w 2026 → 409.
  - Klucze `employees.*` w `employees.json` (sekcja `server`) i `EMPLOYEE_MESSAGES`.

- [ ] **6. Funkcje dla innych modułów.** W `employees.service.ts`: `getPool(userId, year)`, `listActiveUsers():
  { id, name }[]`, `restoreEmployee(id, actor)` (używane przez trasę restore). Testy: `listActiveUsers` bez
  archiwum; `getPool` dla admina → `null`. Test „konto zarchiwizowane w trakcie sesji → 401” na `GET /employees`
  z `findActiveUserById` → `null`.

- [ ] **7. Front: dane i pasek puli.** `employees.api.ts`: `useEmployees(params)`, `useCreateEmployee()`,
  `useUpdateEmployee()`, `useSetEmployeePassword()`, `useArchiveEmployee()`, `useRestoreEmployee()`,
  `useCloseYearPreview(enabled)`, `useCloseYear()` (po sukcesie `invalidateQueries(['employees'])`).
  `components/PoolMeter.tsx` i `PoolLegend` jak w makiecie (kolory `dark.4`, `navy.3`, `navy.6`). Testy: 21 z 30 →
  „21”, „z 30 dni zostało”; 0 → „pula wykorzystana”; dopisek „w tym 3 dni zaległe, 1 dzień czeka na decyzję”
  (odmiana); `null` → „nie dotyczy”.

- [ ] **8. Front: ekran listy.** `EmployeesListPage.tsx` (wpis w `pages.ts`), `components/EmployeesTable.tsx`,
  `components/EmployeeCards.tsx`, `components/EmployeesFilters.tsx`: układ z makiety, `DataState`, filtry i strona
  w adresie (`employeesListQuerySchema`), `Pagination`, pusto (tylko administratorzy) i brak wyników z „Wyczyść
  wyszukiwanie”. Testy: wiersze z danymi; „(to Ty)” i wyłączone „Do archiwum” przy własnym koncie; wpisanie w
  wyszukiwarkę zmienia adres i zapytanie; tylko administrator → ramka „Nie masz jeszcze pracowników”; brak wyników
  → tekst z frazą; przycisk „Zamknij rok 2027” wyłączony przy `canClose = false`.

- [ ] **9. Front: okno pracownika.** `components/EmployeeFormModal.tsx` (`useForm` + `zodResolver` z tym samym
  schematem), `components/PasswordField.tsx` (z „Wygeneruj”: `generateTemporaryPassword()` w
  `frontend/src/core/password.ts`, z `crypto.getRandomValues`, zawsze spełnia `newPassword`). Testy: puste →
  „To pole jest wymagane.”; rola Administrator chowa pulę; własna rola wyłączona z opisem; 409 `login_taken_archived`
  → błąd pod loginem z linkiem „Przywróć konto…”, kliknięcie → potwierdzenie → `useRestoreEmployee` → dymek;
  `generateTemporaryPassword()` 100× przechodzi `newPassword`; sukces → dymek i zamknięcie.

- [ ] **10. Front: okna hasła, archiwum, zamknięcia roku.** `components/PasswordModal.tsx`,
  `components/ArchiveModal.tsx`, `components/CloseYearModal.tsx` jak w makiecie. Testy: zmiana „Pula na 2027” na 20
  przelicza „Razem w 2027” (21 + 20 = 41); wysłane `pools` z wpisanymi liczbami; 409 `year_not_open` → dymek
  błędu i odświeżenie listy; okno archiwum z imieniem; dymki po sukcesie.

- [ ] **11. Dokumenty i testy w przeglądarce.** `TESTS.md` (scenariusze admina; pracownik nie ma menu
  „Pracownicy”, `/admin/employees` → brak dostępu). `e2e/employees.spec.ts`: admin dodaje pracownika z hasłem
  wygenerowanym → wylogowanie → pracownik loguje się, ustawia własne hasło → Pulpit; admin zmienia pulę i widzi pasek;
  „Ustaw hasło”; „Do archiwum” → pracownik nie może się zalogować; dodanie tego samego loginu → „Przywróć konto”;
  „Zamknij rok” (na osobnej bazie e2e, po nim seed przywraca stan). Seed e2e: pule dla `e2e.employee`.
  → `npm run check`, `npm run test:e2e`.

- [ ] **12. Przegląd kodu** (jeden recenzent, lista kontrolna z `CONVENTIONS.md`), poprawki z testami.

## Rozstrzygnięcia w trakcie budowy

- Krok 1: zakres liczb komunikatami `validation.min` / `validation.max` (już są) zamiast nowego `validation.range` z liczbami w treści (tłumaczenie kluczy nie przekazuje liczb; zakres widać w podpowiedzi pod polem).

# Plan: Moje urlopy, część 1 (wnioski i pula)

**Spec:** `SPEC.md` (zasady obu części) i `SPEC-1.md`. **Testy ręczne:** `TESTS-1.md`.
**Jak:** w tej rozmowie, krok po kroku na `main`: test, który nie przechodzi → kod → `npm run check` → `- [x]`
i etap w `STATUS.md` (`implementacja, część 1/2 (krok n/14)`). Kod według `docs/CONVENTIONS.md`.

**Używam ponownie:** `ConfirmModal`, `PageHeader`, `DataState`, `EmptyState` (przez `DataState`), `DateField`,
`DateText`, `InfoCard`, `ButtonIcon`, `NoAccess` (common); `useListParams` (core, rok w adresie); `notify`,
`apiErrorMessage`, `fieldError`; `isoDate`, `text`, `optionalField` (`fields.ts`); `countWorkingDays`, `getHoliday`,
`isWeekend`, `todayIsoDate`, `dayjs` (`@app/shared`); `withTransaction`, `logActivity`/`diffChanges`, `idParam`, `reply`,
`fail`, `validateBody`, `validateQuery`, `mountModule`; `notifyAdmins`, `emailAdminsAboutNewRequest`;
`listSelectableLeaveTypes`, `findSelectableLeaveType`; wzór tabela + karty z Typów urlopów.
**Wydzielam:** `notFound()` (dziś trzy kopie `const notFound = () => fail(404, …)` w Pracownikach, Typach urlopów
i Typach umów) → `backend/src/middleware/routeHelpers.ts` z testem; używa go „Moje urlopy”. Podmiana w trzech
starych modułach razem z resztą porządków z `IDEAS.md` (2026-11-17, odpowiedź b), żeby nie robić ich w połowie.
Pasek dni (`DayStrip`) i liczenie podglądu wniosku (`checkLeaveRequest`) powstają raz we froncie; makieta zostaje
ze swoją kopią (makieta niczego nie importuje z `frontend/`).

## Uwaga przy przeglądzie (Review Focus)

1. Dwa wnioski wysłane naraz (dwie karty) nie przekraczają puli ani limitu: blokada wiersza puli (`FOR UPDATE`) przed
   liczeniem, test w kroku 6.
2. Termin zachodzący na wniosek czekający/zatwierdzony tylko jednym dniem na brzegu (Od = cudze Do): 409 `overlap`;
   wniosek wycofany/odrzucony nie blokuje (krok 6).
3. Wniosek tylko w weekend/święto: 409 `no_working_days`, nawet gdy front pozwolił (krok 6); jeden dzień = Od = Do
   działa (krok 3, 6).
4. Ukryty albo nieistniejący typ i cudzy wniosek przy wycofaniu: 400 pole `leaveTypeId` / 404, nigdy 500 (kroki 6, 7).
5. Rok w adresie listy spoza zakresu albo tekst (`?year=abc`, `?year=1999`): front wraca do roku otwartego, serwer
   400 (kroki 5, 10).

## Kroki

- [x] 0. **Szkielet testów** (`it.todo`, po jednym na wymaganie): `shared/src/schemas/__tests__/myLeave.test.ts`,
  `shared/src/__tests__/leaveRequestCheck.test.ts`, `backend/src/modules/my-leave/__tests__/`
  (`my-leave.queries.test.ts`, `my-leave.service.test.ts`, `my-leave.routes.test.ts`), dopiski w testach Pracowników
  i Typów urlopów, `frontend/src/modules/my-leave/__tests__/MyLeavePage.test.tsx`, `…/components/__tests__/`
  (`RequestModal.test.tsx`, `DayStrip.test.tsx`), `e2e/my-leave.spec.ts` (scenariusze z `TESTS-1.md`) → `npm run check`.
  _Uwaga:_ testy Pracowników i Typów urlopów nie dostały `it.todo` (test zasad nie pozwala na nie w zrobionym module); powstają od razu jako prawdziwe w kroku 8.

- [x] 1. **`notFound()` wspólne:** `export const notFound = (): Result => fail(404, SERVER_MESSAGES.notFound)`
  w `routeHelpers.ts`; test w `backend/src/middleware/__tests__/routeHelpers.test.ts` (status 404, klucz) →
  `npm run check`.
  _Uwaga:_ podmiana trzech kopii w starych modułach zostaje na porządki z `IDEAS.md`, jak w planie.

- [x] 2. **Migracja `017_leave_requests.sql`** według `SPEC-1.md` („Dane”), potem `npm run migrate`. Test (wzór
  z `notifications.routes.test.ts`, odczyt pliku SQL): `user_id … ON DELETE RESTRICT`, `leave_type_id … ON DELETE
  RESTRICT`, `decided_by … ON DELETE SET NULL`, `comment VARCHAR(500)`. Dane testowe: `seedE2e.ts` usuwa wnioski kont
  `E2E_TEMP_LOGIN_LIKE`, typów `E2E_TEMP_LEAVE_TYPE_LIKE` i konta e2e pracownika przed usunięciem kont/typów; test
  w `seedE2e.test.ts` (kolejność zapytań: `DELETE FROM leave_requests …` przed `DELETE FROM users …`) → `npm run check`.
  _Uwaga:_ test migracji w osobnym pliku `my-leave.migration.test.ts`; stałe `LEAVE_REQUEST_COMMENT_MAX` i `LEAVE_REQUEST_STATUSES` powstały już tu (test migracji je porównuje). `npm run migrate` czeka na uruchomienie Dockera (baza nie działała).

- [x] 3. **Wspólne zasady w `shared`:**
  - `shared/src/constants/myLeave.ts`: `LEAVE_REQUEST_COMMENT_MAX = 500`, `LEAVE_REQUEST_STATUSES` (5 statusów),
    `LEAVE_REQUEST_YEAR_MIN = 2000`, `LEAVE_REQUEST_YEAR_MAX = 2100`, `MY_LEAVE_MESSAGES` (klucze
    `my-leave.server.*` i `my-leave.validation.*` ze `SPEC-1.md`, „Teksty”), `EMPLOYEE_MESSAGES.pendingRequests =
    'employees.server.pending_requests'`.
  - `shared/src/schemas/myLeave.ts`: `leaveRequestSchema` (`leaveTypeId`, `dateFrom: isoDate`, `dateTo: isoDate`,
    `comment: optionalField(text(500))`, `refine`: Do ≥ Od → pole `dateTo` `dates_order`; ten sam rok → `dateTo`
    `same_year`), `myLeaveRequestsQuerySchema` (`year` opcjonalny, liczba 2000–2100), typy `MyLeaveOverview`,
    `MyLeaveRequest`, `LeaveRequestStatus`.
  - `shared/src/leaveRequestCheck.ts`: `checkLeaveRequest(input, ctx): LeaveRequestCheck`, gdzie `input = { type:
    { id, deductsPool, yearlyLimit, usedOfLimit } | null, dateFrom, dateTo, today }`, `ctx = { poolYear,
    annualDays, carriedDays, usedCarried, usedAnnual, pendingCarried, pendingAnnual, busy: {dateFrom,dateTo}[] }`;
    wynik: `{ kind: 'ok', workingDays, fromCarried, fromAnnual, leftAfter: number | null }` albo `{ kind:
    'past_date' | 'pool_not_ready' | 'year_closed' | 'overlap' | 'no_working_days' | 'not_enough_days' |
    'limit_exceeded', … dane do komunikatu }`. Kolejność sprawdzeń: past_date, rok (rok > poolYear →
    pool_not_ready, < → year_closed), overlap, no_working_days, limit, pula. Tej samej funkcji używa serwer (krok 6)
    i okno (krok 11), więc wynik jest ten sam.
  - Testy: schemat (Od = Do ok; Do < Od; różne lata; komentarz 500/501 znaków, pusty → `null`; zła data; `year`
    1999/2000/2100/2101/„abc”); `checkLeaveRequest`: 21–31.12.2026 = 7 dni (Wigilia), podział 4 zaległe + 3 z puli
    przy zostałych 4 zaległych, typ bez odejmowania → 0/0 i `leftAfter: null`, brzeg nakładania (Od = cudze Do) →
    overlap, sobota–niedziela → no_working_days, limit 1 + 4 > 4 → limit_exceeded, 4 > 3 zostałe → not_enough_days,
    wczoraj → past_date, 2027 przy puli 2026 → pool_not_ready, 2025 → year_closed → `npm run check`.
  _Uwaga:_ `checkLeaveRequest` przyjmuje typ bez `id` i zawsze z datami (puste pola obsługuje okno); `busy` niesie też nazwę typu i status, żeby ramka „termin zajęty” mówiła, na który wniosek zachodzi (jak w makiecie). `leaveTypeId` przez `wholeNumber` (Select daje tekst). Nowy klucz `my-leave.server.type_unavailable` dla ukrytego albo nieistniejącego typu.

- [ ] 4. **Zapytania** `backend/src/modules/my-leave/my-leave.queries.ts` (wszystkie z `userId` w `WHERE`):
  `listRequests(db, userId, year)`, `listRequestYears(db, userId)`, `listBusy(db, userId, year)`,
  `sumTypeUsage(db, userId, year)` (dni czekających+zatwierdzonych per typ), `insertRequest(db, row)`,
  `findOwnRequest(db, id, userId)`, `setWithdrawn(db, id, userId)` (`WHERE status = 'pending'`, zwraca liczbę zmian);
  dla innych modułów: `sumPoolUsage(db, userIds, year)` → `Map<userId, { usedCarried, usedAnnual, pendingCarried,
  pendingAnnual }>`, `countPendingRequests(db, year)`, `countRequestsByLeaveType(db)` → `Map<leaveTypeId, number>`.
  W `employees.queries.ts`: `findOpenPoolOfUser(db, userId, lock: boolean)` (`… closed_at IS NULL … FOR UPDATE`).
  Testy (`pool.query` podmieniony): parametry `?`, `userId` w każdym zapytaniu, `FOR UPDATE` przy `lock` →
  `npm run check`.

- [ ] 5. **Odczyt:** `my-leave.service.ts`: `getMyLeaveOverview(userId): Promise<MyLeaveOverview | null>` i
  `listMyRequests(userId, year?)` (kolejność: czekające, potem `date_from` malejąco); trasy `GET /my-leave/overview`
  (brak puli → 404), `GET /my-leave/requests` (`validateQuery(myLeaveRequestsQuerySchema)`); `mountModule(api,
  'my-leave', myLeaveRoutes)` w `app.ts`. Testy tras: 401 bez logowania, 403 administrator, 200 z danymi tylko
  `req.user.id`, `?year=abc` → 400; usługi: liczby puli (`leftDays` = pula + zaległe − zatwierdzone − czekające,
  `leftCarriedDays`), `usedOfLimit`, lata z rokiem otwartym → `npm run check`.

- [ ] 6. **Złożenie wniosku:** `createRequest(input: LeaveRequestInput, actor): Promise<Result<MyLeaveRequest>>`
  w `withTransaction`: `findOpenPoolOfUser(conn, actor.id, true)` (brak → 404), `findSelectableLeaveType` (brak →
  400 pole `leaveTypeId`), `checkLeaveRequest` z `todayIsoDate()` (nie ok → `past_date` 400 przy `dateFrom`, reszta
  409 z danymi), `insertRequest`, `logActivity` (`create`), `notifyAdmins` (`leave_request_new`, params `employee,
  leaveType, dateFrom, dateTo, days`, link `/admin/leave-requests`); po transakcji `void
  emailAdminsAboutNewRequest(...)` (nie czeka). Trasa `POST /my-leave/requests` (`validateBody(leaveRequestSchema)`,
  201). Testy: każdy kod błędu z `SPEC-1.md` (API), `user_id` z `req.user` mimo `userId` w treści, liczby liczone
  przez serwer mimo `workingDays` w treści, blokada `FOR UPDATE` przed liczeniem, powiadomienie w transakcji, e-mail
  po niej z danymi (`leftAfter`), błąd e-maila nie psuje odpowiedzi → `npm run check`.

- [ ] 7. **Wycofanie:** `withdrawRequest(id, actor): Promise<Result>` w transakcji: `findOwnRequest` (brak/cudzy →
  `notFound()`), status ≠ `pending` → 409 `not_pending`, `setWithdrawn` (0 zmian → 409), `logActivity` (`status`,
  `pending → withdrawn`), `notifyAdmins` (`leave_request_withdrawn`). Trasa `POST /my-leave/requests/:id/withdraw`
  (`idParam`). Testy: 404 cudzy, 404 `abc`, 409 zatwierdzony, 409 drugi raz, 200 → `npm run check`.

- [ ] 8. **Pracownicy i Typy urlopów:** `getPoolUsage` z `sumPoolUsage` (usedDays = zatwierdzone, pendingDays =
  czekające, `usedCarried` do `toPool`); `toPool(year, annual, carried, usage)` bierze `leftCarriedDays = carried −
  usedCarried`; `getOpenPool` w `employees.service.ts`; `getCloseYearPreview().pendingRequests =
  countPendingRequests(year)`; `closeYear` → 409 `EMPLOYEE_MESSAGES.pendingRequests`, gdy > 0 (w transakcji).
  `CloseYearModal`: przy `pendingRequests > 0` żółta ramka z nowym tekstem `close_year_pending` („Najpierw rozpatrz
  {{count}} wniosków czekających na decyzję. Wtedy zamkniesz rok.”, odmiana) i wyłączony przycisk; to samo w makiecie
  (`mockups/src/modules/employees/EmployeeModals.tsx`). `listTypes` w Typach urlopów: `requestsCount` z
  `countRequestsByLeaveType`. Testy: zamknięcie z czekającym → 409 i nic nie zapisane; podgląd z liczbą; ekran z
  wyłączonym przyciskiem; `toPool` z podziałem z kolumn; `requestsCount` → `npm run check`.

- [ ] 9. **Mapa dostępu** w `SPEC-GENERAL.md` (wiersz `GET /api/my-leave/overview`, `GET/POST
  /api/my-leave/requests`, `POST /api/my-leave/requests/:id/withdraw`, employee, tylko własne); teksty
  `server.*` i `validation.*` w `my-leave.json`, `employees.server.pending_requests` w `employees.json`.
  `routeProtection.test.ts` zielony → `npm run check`.

- [ ] 10. **Ekran `MyLeavePage`** (`frontend/src/modules/my-leave/`): `my-leave.api.ts` (`useMyLeaveOverview`,
  `useMyRequests(year)`, `useCreateRequest`, `useWithdrawRequest`; po zapisie `invalidateQueries(['my-leave'])`),
  wpis w `frontend/src/core/routes/pages.ts`, komponenty `PoolCard`, `LimitsCard`, `RequestsTable` (tabela + karty),
  rok przez `useListParams(myLeaveRequestsQuerySchema, …)`, `DataState` z pustym rokiem. Testy ekranu: liczby puli
  i legendy, boks limitów znika bez typów z limitem, kolejność i statusy, „Wycofaj” tylko przy czekającym, pusty rok,
  `?year=abc` → rok otwarty → `npm run check`.

- [ ] 11. **Okno „Złóż wniosek”** (`RequestModal`, `DayStrip`): `useForm` + `zodResolver(leaveRequestSchema)`,
  `DateField` z `minDate` = dziś, „Do” dopasowuje się do „Od”, ramka z `checkLeaveRequest` (te same teksty co
  makieta), przycisk wyłączony bez `ok`, błąd serwera przy polu / w ramce, dymek po zapisie. Testy: 7 dni dla 21–31.12,
  ramki: zajęty termin, przyszły rok, limit, za mało dni, brak dni roboczych; przycisk wyłączony; wysyła tylko pola
  schematu; błąd 409 zostawia okno; `DayStrip`: Wigilia przekreślona z nazwą, termin > 45 dni bez paska →
  `npm run check`.

- [ ] 12. **Wycofanie na ekranie:** `ConfirmModal` z tekstem z liczbą dni (bez zdania o puli dla typu bez
  odejmowania), dymek, błąd zostawia okno. Testy ekranu → `npm run check`.

- [ ] 13. **Test w przeglądarce** `e2e/my-leave.spec.ts` ze scenariuszy `TESTS-1.md` (pracownik: złożenie, blokady,
  wycofanie, pusty rok; administrator: dzwonek, „Pracownicy” z czekającymi, zablokowane „Zamknij rok”, brak dostępu)
  → `npm run check`, `npm run test:e2e`.

- [ ] 14. **Przegląd kodu** całej części jednym recenzentem (lista kontrolna z `CONVENTIONS.md`), poprawki z testem,
  `npm run check`; potem etap **testy** (`abuse.md`, `browser.md`).

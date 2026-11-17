# Plan: Wnioski urlopowe

**Spec:** `SPEC.md`. **Testy ręczne:** `TESTS.md` (powstaje na etapie testy).
**Jak:** w tej rozmowie, krok po kroku na `main`: test, który nie przechodzi → kod → `npm run check` → `- [x]`
i etap w `STATUS.md` (`implementacja (krok n/16)`). Kod według `docs/CONVENTIONS.md`.

**Używam ponownie:** `ConfirmModal`, `PageHeader`, `DataState`, `EmptyState`, `ListPagination`, `DateText`,
`ButtonIcon`, `NoAccess` (common); `useListParams` (core, zakładka, rok, typ, szukanie i strona w adresie); `notify`,
`apiErrorMessage`, `fieldError` (core); `text` (`fields.ts`), `listQuerySchema`, `currentYear`, `todayIsoDate`,
`getHoliday`, `isWeekend`, `dayjs`, `formatDate` (`@app/shared`); `withTransaction`, `logActivity`/`diffChanges`,
`idParam`, `reply`, `fail`, `notFound`, `validateBody`, `validateQuery`, `mountModule`, `PAGE_SIZE`; `notifyUsers`;
`getPoolUsage` (Pracownicy), `listLeaveTypes` (Typy urlopów); `buildLeaveRequestPdf`, `renderPdf`; wzór „tabela
+ karty” i okna z Moich urlopów; kolumny wniosku `REQUEST_COLUMNS`/`toRequest` z `my-leave.queries.ts` (powiązanie
ze specu: ta sama tabela).
**Wydzielam:**
- Znacznik statusu z kolorami (`STATUS_COLOR`), termin „od – do” (`Dates`) i opis podziału dni (`splitText`)
  z `my-leave/components/RequestsTable.tsx` → `frontend/src/common/LeaveRequestParts.tsx` (`LeaveStatusBadge`,
  `LeaveDates`, `leaveSplitText`), z testem; podmiana w Moich urlopach (krok 1).
- Pobranie wniosku do PDF i zamiana wiersza na dane dokumentu z `my-leave.service.ts`/`my-leave.queries.ts` →
  `backend/src/pdf/leaveRequestPdfData.ts` (`findRequestForPdf(db, id, userId?)`, `toPdfData(row)`), z testem;
  podmiana w Moich urlopach (krok 2).
- `ConfirmModal`: parametr `confirmColor` (front i makiety), z testem (krok 1).
- Pasek dni: `DayStrip` z Moich urlopów i nowy `TeamStrip` robią co innego (jeden wiersz dni bez osób / tabela osób
  × dni), wspólna jest tylko komórka dnia wolnego (kilka linii): zostają osobno („Bez wydzielania na siłę”).

## Uwaga przy przeglądzie (Review Focus)

1. Dwóch administratorów decyduje naraz o tym samym wniosku: jeden zapis, drugi 409 `already_decided`
   z `decidedByName`; nigdy dwa wpisy w historii ani dwa powiadomienia (krok 8).
2. Pracownik wycofuje wniosek, gdy administrator ma otwarte szczegóły: „Zatwierdź”/„Odrzuć” → 409 `already_decided`
   ze `status: 'withdrawn'`, dymek „Pracownik wycofał ten wniosek.”, odświeżenie (kroki 8, 13).
3. „Zamknij rok” po zatwierdzeniu: anulowanie → 409 `year_closed`, a przycisk „Anuluj urlop” znika (`canCancel`
   false) (kroki 7, 8, 11).
4. Powód z samych spacji („   ”) albo 2 znaki po przycięciu → 400 pod polem `reason`; 500 znaków przechodzi, 501 nie
   (kroki 5, 13).
5. Adres `/admin/leave-requests/abc`, `/0`, `/999999`: API 404 (`idParam`), ekran pokazuje listę i dymek „Nie ma
   takiego wniosku.”, bez białego ekranu; `?status=xyz`, `?year=abc` w adresie → domyślne wartości (kroki 5, 9, 12).

## Kroki

- [x] 0. **Szkielet testów** (`it.todo`, po jednym na wymaganie ze specu): `shared/src/schemas/__tests__/leaveRequests.test.ts`,
  `backend/src/modules/leave-requests/__tests__/` (`leave-requests.queries.test.ts`, `leave-requests.service.test.ts`,
  `leave-requests.routes.test.ts`), `frontend/src/modules/leave-requests/__tests__/` (`LeaveRequestsPage.test.tsx`,
  `leave-requests.api.test.tsx`), `…/components/__tests__/` (`DetailsDrawer.test.tsx`, `TeamStrip.test.tsx`,
  `DecisionModals.test.tsx`), `e2e/leave-requests.spec.ts` (scenariusze z „Moduł działa, gdy” w `SPEC.md`).
  Testy zmian w zrobionych modułach (Moje urlopy, Powiadomienia, trasy, `ConfirmModal`) od razu prawdziwe w swoich
  krokach (test zasad nie pozwala na `it.todo` w zrobionym module) → `npm run check`.

- [x] 1. **Wspólne klocki frontu:**
  - `frontend/src/common/LeaveRequestParts.tsx`: `LEAVE_STATUS_COLOR: Record<LeaveRequestStatus, string>` (z
    `DESIGN.md`: yellow, green, red, gray, red), `LeaveStatusBadge({ status })` (`Badge variant="light"`,
    `miw="max-content"`, tekst `my-leave:status.<status>`), `LeaveDates({ from, to })` (jeden dzień bez „–”),
    `leaveSplitText(t, r: Pick<…, 'deductsPool' | 'daysFromCarried' | 'daysFromAnnual' | 'poolYear'>)`. Test
    `common/__tests__/LeaveRequestParts.test.tsx`: kolor `cancelled` = red, „26.11.2026 – 27.11.2026”, jeden dzień
    „09.10.2026”, „4 z zaległego i 2 z puli 2026”, „nie odejmuje z puli”. Podmiana w `my-leave/components/
    RequestsTable.tsx` (testy Moich urlopów zielone bez zmian).
  - `ConfirmModal`: `confirmColor?: MantineColor` (pierwszeństwo przed `danger`); test „confirmColor green colours
    the confirm button”; to samo w `mockups/src/common/ConfirmModal.tsx` z testem; okno zatwierdzenia w makiecie
    dostaje `confirmColor="green"` → `npm run check`.

- [x] 2. **Wspólne dane PDF:** `backend/src/pdf/leaveRequestPdfData.ts`: `findRequestForPdf(db, id: number, userId?:
  number): Promise<PdfRequestRow | null>` (bez `userId` dowolny wniosek; z nim tylko własny) i `toPdfData(row):
  LeaveRequestPdfData`. Test `pdf/__tests__/leaveRequestPdfData.test.ts` (z `userId` cudzy → null; bez → wiersz;
  `toPdfData` zamienia daty na ISO). `my-leave.service.getRequestPdf` używa obu; `findOwnRequestForPdf` znika;
  testy PDF Moich urlopów zielone → `npm run check`.

- [x] 3. **Trasy podstron:** `NavItem.detailPath?: boolean` w `shared/src/navigation.ts`; `buildRoutes` dla takiej
  pozycji dodaje trasę `${path}/:id` z tą samą stroną (i `NoAccess` dla roli bez dostępu). `leave-requests`
  w `navigation.config.ts` dostaje `detailPath: true`. Testy w `core/routes/__tests__/buildRoutes.test.tsx`:
  `/admin/leave-requests/24` → strona wniosków (admin), `NoAccess` (pracownik); pozycja bez `detailPath` nie ma
  trasy `/:id`. Podświetlenie menu na podstronie: istniejący test `NavMenu` → `npm run check`.

- [x] 4. **Migracja i zmiany w Moich urlopach i Powiadomieniach:**
  - `backend/migrations/018_leave_requests_decision_reason.sql`: `ALTER TABLE leave_requests RENAME COLUMN
    reject_reason TO decision_reason;` → `npm run migrate`. Test w `my-leave.migration.test.ts`: plik 018 zmienia
    nazwę kolumny.
  - `rejectReason` → `decisionReason` w `my-leave.queries.ts`, `shared/src/schemas/myLeave.ts`,
    `my-leave/components/RequestsTable.tsx` i testach (test: anulowany wniosek pokazuje powód).
  - `my-leave.service.ts`: link powiadomień `leave_request_new` i `leave_request_withdrawn` =
    `/admin/leave-requests/${id}` (test w `my-leave.service.test.ts`); `LEAVE_REQUESTS_LINK` znika.
  - `notifications.json`: `leave_cancelled.detail` = „{{leaveType}}, {{dateFrom}} – {{dateTo}}. Powód: {{reason}}”;
    `sendTestNotifications.ts` podaje `reason`; test tekstu w testach powiadomień → `npm run check`.

- [x] 5. **`shared`:** `shared/src/constants/leaveRequests.ts`: `LEAVE_DECISION_REASON_MIN = 3`,
  `LEAVE_DECISION_REASON_MAX = 500`, `LEAVE_REQUESTS_MESSAGES` (`leave-requests.server.already_decided`,
  `…not_approved`, `…year_closed`, `leave-requests.validation.reason_min`), `LEAVE_REQUEST_FILTERS =
  [...LEAVE_REQUEST_STATUSES, 'all']`. `shared/src/schemas/leaveRequests.ts`: `leaveDecisionReasonSchema`
  (`{ reason: text(500).min(3, …reason_min) }`), `leaveRequestsListQuerySchema` (`listQuerySchema(['created_at'])`
  + `status` (`catch('pending')`), `year` (`coerce`, 2000–2100, `catch(undefined)`), `leaveTypeId` (`coerce`,
  dodatni, opcjonalny, `catch(undefined)`)), typy `LeaveRequestListItem`, `LeaveRequestDetails`,
  `LeaveRequestsListResponse` (pola jak w `SPEC.md`, „API”). Testy: powód `"   "`, `"ab"`, `" abc "` → `"abc"`,
  500 / 501 znaków; `status=xyz` → `pending`, `year=abc` → brak, `leaveTypeId=-1` → brak; eksport w `index.ts` →
  `npm run check`.
  _Uwaga:_ jedyna „kolumna sortowania” w `listQuerySchema` to stała `'default'` (kolejność ustala serwer według zakładki, odpowiedź 7a).

- [x] 6. **Zapytania** `backend/src/modules/leave-requests/leave-requests.queries.ts` (testy na bazie, wzór
  `my-leave.queries.test.ts`):
  - `listRequests(db, f: { status, year, leaveTypeId, search, page }): Promise<{ rows, total }>`: z `users`
    (`employee_name`, `archived_at`) i `leave_types`; `status ≠ pending` → filtr `pool_year = year`; szukanie
    `u.name LIKE ?`; kolejność: `pending` → `created_at ASC, id ASC`, inne → `date_from DESC, id DESC`; `LIMIT`
    `PAGE_SIZE`. Testy: każdy filtr, obie kolejności, strona 2.
  - `pendingSummary(db): Promise<{ count, oldestAt }>`, `listRequestYears(db): Promise<number[]>`.
  - `findRequest(db, id, { lock })` (z `FOR UPDATE` przy `lock`), `findOpenPools(db, userIds): Promise<Map<userId,
    PoolRow>>`, `isPoolOpen(db, userId, year)`.
  - `listOverlapping(db, { userId, dateFrom, dateTo }): Promise<{ employeeName, dateFrom, dateTo, status }[]>`:
    inne osoby, `status IN ('pending','approved')`, `date_from <= dateTo AND date_to >= dateFrom`. Test: wspólny
    jeden dzień na brzegu wchodzi, wycofany/odrzucony nie, własny nie.
  - `setDecision(db, id, { from: status, to: status, actor, reason }): Promise<number>` (`UPDATE … WHERE id = ? AND
    status = ?`, ustawia `decided_by`, `decided_by_name`, `decided_at = NOW()`, `decision_reason`; zwraca liczbę
    zmienionych) → `npm run check`.
  _Uwaga:_ `findOpenPools` i `isPoolOpen` są w `leave-requests.queries.ts` (zapytania tylko tego modułu); typ `PoolRow` z Pracowników.

- [x] 7. **Usługa: lista i szczegóły** (`leave-requests.service.ts`): `listLeaveRequests(query)` (pozycje z
  `poolLeft` z `findOpenPools` + `getPoolUsage`, `canCancel` = `approved` i pula `pool_year` otwarta, `employeeArchived`,
  `pendingCount`, `oldestPendingAt`, `years` (+ bieżący rok), `leaveTypes` z `listLeaveTypes`);
  `getLeaveRequest(id)`: 404 albo `LeaveRequestDetails` (`pool` roku wniosku, gdy otwarta; `others` tylko przy
  `pending`/`approved`). Testy: „Zostało w puli” Jana = 19 z 30 przy danych jak w makiecie, brak puli → `null`,
  rok zamknięty → `canCancel` false, `others` dla 21–24.12 = Tomasz 21–22.12 → `npm run check`.

- [x] 8. **Usługa: decyzje** (`approveRequest(id, actor)`, `rejectRequest(id, reason, actor)`,
  `cancelRequest(id, reason, actor)`), każda w `withTransaction`: `findRequest(…, { lock: true })` → 404; zły status
  → 409 `already_decided` z `{ status, decidedByName }` (anulowanie: nie `approved` → 409 `not_approved`); anulowanie
  przy zamkniętej puli → 409 `year_closed`; `setDecision` (0 → 409 `already_decided`); `logActivity` (`status` i
  `decision_reason`); `notifyUsers` (`leave_approved` / `leave_rejected` z `reason` / `leave_cancelled` z `reason`,
  link `/admin/my-leave?year=<pool_year>`). Testy: każda przejściowa para statusów, dwa równoległe `approveRequest`
  (`Promise.all`) → jeden `{ ok }`, jeden 409, jeden wpis historii, jedno powiadomienie; wycofany w międzyczasie →
  409 `status: 'withdrawn'`; wniosek osoby w archiwum → można zatwierdzić; pula po odrzuceniu i anulowaniu wraca
  (`getPoolUsage`) → `npm run check`.
  _Uwaga:_ pole z aktualnym statusem wniosku w błędzie 409 nazywa się `current` (`status` to już kod HTTP); anulowanie wniosku już anulowanego → `already_decided`, innego niezatwierdzonego → `not_approved`.

- [x] 9. **Trasy** `leave-requests.routes.ts` i `mountModule(api, 'leave-requests', leaveRequestsRoutes)` w
  `app.ts`: `GET /` (`validateQuery`), `GET /:id`, `POST /:id/approve`, `POST /:id/reject` i `/:id/cancel`
  (`validateBody(leaveDecisionReasonSchema)`), `GET /:id/pdf` (`findRequestForPdf(db, id)`, tylko `approved`, inaczej
  409 `not_approved`; nagłówki jak w Moich urlopach). Testy: 401, 403 (pracownik), 404 dla `abc`/`0`/`999999`,
  400 bez powodu, PDF `application/pdf` + `inline`. Wiersz w „Mapie dostępu” `SPEC-GENERAL.md` → `npm run check`.
  _Uwaga:_ nagłówki PDF wydzielone do `backend/src/pdf/sendInlinePdf.ts` (używają obie trasy PDF); PDF administratora w `getLeaveRequestPdf` usługi.

- [ ] 10. **Hooki** `frontend/src/modules/leave-requests/leave-requests.api.ts`: `useLeaveRequests(query)`,
  `useLeaveRequest(id | null)`, `useApproveRequest()`, `useRejectRequest()`, `useCancelRequest()` (po sukcesie
  i po 409 odświeżają listę, szczegóły i licznik powiadomień), `leaveRequestPdfUrl(id)`. Testy (wzór
  `my-leave.api.test.tsx`): adresy, odświeżenie po sukcesie i po 409 → `npm run check`.

- [ ] 11. **Ekran listy** `LeaveRequestsPage.tsx` (+ `components/LeaveRequestsTable.tsx`, `…Cards.tsx`,
  `…Filters.tsx`), wpis w `core/routes/pages.ts`: nagłówek z podsumowaniem, zakładki (telefon: `Select`), filtry
  w adresie (`useListParams(leaveRequestsListQuerySchema, …)`), tabela/karty z kolumnami i akcjami ze specu,
  „Anuluj urlop” tylko przy `canCancel`, „PDF” otwiera `leaveRequestPdfUrl` w nowej karcie, puste stany, `DataState`,
  `ListPagination`. Testy: domyślnie „Czekają (3)”, zmiana zakładki pokazuje rok, kliknięcie wiersza → adres
  `/admin/leave-requests/24` z zachowanymi filtrami, „termin już minął”, „w archiwum”, puste stany → `npm run check`.

- [ ] 12. **Szczegóły** `components/DetailsDrawer.tsx` i `components/TeamStrip.tsx`: `Drawer` otwarty, gdy w adresie
  jest `:id` (`useParams`); zamknięcie wraca na listę z tymi samymi parametrami; 404 → dymek „Nie ma takiego
  wniosku.” i lista. `TeamStrip` jak w makiecie (do 31 dni, dłuższy: lista osób z datami; święta z `getHoliday`,
  weekendy przekreślone, legenda, „W tym terminie nikt inny nie ma urlopu.”). Testy: pasek dla 21–24.12 (24.12
  przekreślony, Tomasz zielony 21–22), boks puli i zdanie „Po zatwierdzeniu zostanie 15 dni…”, przyciski zależne od
  statusu, zły numer w adresie → lista i dymek → `npm run check`.

- [ ] 13. **Okna** `components/DecisionModals.tsx`: `ApproveModal` (`ConfirmModal` z `confirmColor="green"`, zdanie
  „W tym czasie urlop ma też: …” z zatwierdzonych `others`, żółta ramka przy minionym terminie), `RejectModal`
  i `CancelModal` (pole powodu z `leaveDecisionReasonSchema`, błąd pod polem, `fieldError` dla 400 z serwera, żółta
  ramka przy zaczętym urlopie, zdanie o puli). Po sukcesie: dymek, zamknięcie okna i szczegółów; 409
  `already_decided`: dymek („rozpatrzył już …” albo „Pracownik wycofał ten wniosek.”), zamknięcie, odświeżenie;
  inny błąd: dymek, okno otwarte. Testy dla każdego z tych przypadków → `npm run check`.

- [ ] 14. **Makieta i dane testowe:** w makiecie przycisk w oknie zatwierdzenia zielony (krok 1). `seedE2e.ts`: dla
  e2e potrzebny wniosek czekający konta e2e pracownika (przez API w teście, jak w `my-leave.spec.ts`); usunięcie
  wniosków kont tymczasowych już jest. `npm run my-leave:approve-test` zostaje (szybkie zatwierdzenie do prób
  ręcznych) → `npm run check`.

- [ ] 15. **E2e** `e2e/leave-requests.spec.ts`: pracownik składa wniosek → administrator otwiera
  `/admin/leave-requests/<id>`, widzi pasek i pulę, zatwierdza w oknie → status „Zatwierdzony”, pracownik ma
  powiadomienie; anulowanie z powodem → pracownik widzi powód w „Moich urlopach”; odrzucenie bez powodu → błąd pod
  polem; pracownik na `/admin/leave-requests` → brak dostępu. `npm run test:e2e` zielone.

- [ ] 16. **Przegląd kodu** całego modułu (jeden recenzent, lista kontrolna z `CONVENTIONS.md`), poprawki z testami,
  bez `it.todo` w folderach modułu → `npm run check`, `npm run test:e2e`.

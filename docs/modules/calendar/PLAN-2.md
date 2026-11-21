# Plan: Kalendarz, część 2: Liczenie dni i zatwierdzanie

**Podstawa:** `SPEC-2.md`, `SPEC.md`, makiety `mockups/src/modules/leave-types/` (pola części 2 są) i
`mockups/src/modules/calendar/`.

**Używam ponownie:** `checkLeaveRequest` (shared, dostaje sposób liczenia i zatwierdzanie), `countWorkingDays`,
`calendarSegments` (shared, już przyjmuje `dayCount`), `LEAVE_DAY_COUNTS` (shared, jest z części 1), `toIsoDate`,
`todayIsoDate`, `dayjs` (shared); `notifyAdmins` (notifications), `emailAdminsAboutNewRequest` i szablon
`newLeaveRequest` (email, nowa wersja w tym samym szablonie), `DetailsDrawer`, `DecisionModals`, `ConfirmModal`
(common); `logActivity`, `diffChanges`, `withTransaction` (db); trasa `cancel` Wniosków urlopowych bez zmian.

**Wydzielam:** liczba dni z jednostką jest dziś w czterech kopiach (`my-leave.json` `days_*` i `check_days_*`,
`leave-requests.json` `days_*`, `calendar.json` `days_value_working_*` / `days_value_calendar_*`) i wszędzie zakłada
dni robocze → jeden zestaw `leave_days.working_*` / `leave_days.calendar_*` w `shared/locales/pl/common.json` i funkcja
`leaveDaysText(t, days, dayCount)` w `shared/src/leaveDays.ts`; podmiana w Moich urlopach, Wnioskach urlopowych,
szczegółach i oknach decyzji (common), Pulpicie, Kalendarzu, PDF, a w makietach tak samo (`mockups/`). Stare klucze
usunięte.

- [x] 0. Szkielet testów `it.todo` z `SPEC-2.md` i `TESTS-2.md`. Testy dopisków do zrobionych modułów w plikach `.todo`
  w folderze Kalendarza (miejsce docelowe w pierwszej linii):
  `backend/src/modules/calendar/__tests__/leave-types-2.todo.test.ts` (pola `dayCount`, `requiresApproval`: zapis,
  lista, historia, zła wartość → 400), `…/my-leave-2.todo.test.ts` (złożenie kalendarzowe, bez zatwierdzania, 7 dni
  wstecz, 8 dni wstecz → 400, rok zamknięty, nakładanie, powiadomienie i e-mail, wycofanie: przed pierwszym dniem,
  w dniu złożenia, później → 409, zwykły zatwierdzony → 409, cudzy → 404), `…/leave-requests-2.todo.test.ts`
  (zatwierdzenie i odrzucenie automatycznego → 409, anulowanie działa, `dayCount`/`autoApproved` w odpowiedzi),
  `shared/src/__tests__/leaveRequestCheck-2.todo.test.ts` → docelowo `shared/src/__tests__/leaveRequestCheck.test.ts`,
  `frontend/src/modules/calendar/__tests__/done-modules-2.todo.test.tsx` (formularz typu, okno wniosku, tabela,
  szczegóły, powiadomienie); `e2e/calendar.spec.ts` (scenariusze `TESTS-2.md`) → `npm run check`
- [x] 1. Wydzielenie `leaveDaysText` (lista „Wydzielam”) + test w `shared/src/__tests__/leaveDays.test.ts` (1, 2, 5,
  22 dni roboczych; 1, 7, 14 dni kalendarzowych; brak `dayCount` = robocze), podmiana wszystkich kopii we froncie,
  w PDF i w makietach, usunięcie starych kluczy → `npx tsc -p mockups`, `npm run check`
- [x] 2. Makiety: Moje urlopy (okno wniosku: podpowiedzi typu kalendarzowego i bez zatwierdzania, „Od” 7 dni wstecz,
  pasek dni, przycisk „Zgłoś”, dymek; tabela: kolumna „Dni”, „Wycofaj” przy zatwierdzonym automatycznie; nowy typ
  „Chorobowe” w danych), Wnioski urlopowe i wspólny `LeaveRequestDrawer` („Zatwierdzony automatycznie (typ bez
  zatwierdzania)”), Typy urlopów (nowe teksty podpowiedzi i ostrzeżenia), E-mail (stan „Zgłoszona nieobecność”) →
  `npx tsc -p mockups`, `npm run check`
- [x] 3. Stałe i schematy: `NO_APPROVAL_BACKDATE_DAYS = 7` w `shared/src/constants/myLeave.ts`;
  `leaveTypeSchema` + `dayCount: z.enum(LEAVE_DAY_COUNTS)`, `requiresApproval: z.boolean`; `LeaveTypeItem`
  i `SelectableLeaveType` z `dayCount`, `requiresApproval`; wniosek (`MyLeaveRequest`, wiersz i szczegóły Wniosków,
  `CalendarAbsence`, wnioski na Pulpicie) z `dayCount`, `autoApproved`, a `MyLeaveRequest` z `canWithdraw`. Testy
  schematu: obie wartości, `'hours'` → błąd, brak → błąd → `npm run check`
- [x] 4. Migracje `031_leave_types_day_count.sql`, `032_leave_types_requires_approval.sql`,
  `033_leave_requests_day_count.sql` (z komentarzem kolumny `working_days`), `034_leave_requests_auto_approved.sql`,
  `035_leave_types_sick_seed.sql` („Chorobowe”: `calendar`, bez zatwierdzania, nie odejmuje, bez limitu, `grape`,
  ostatnia pozycja; `INSERT … SELECT … WHERE NOT EXISTS` po nazwie, także ukrytego) + test migracji (drugie
  uruchomienie nic nie dodaje, typ o tej nazwie zostaje bez zmian) → `npm run migrate`, `npm run check`
- [x] 5. Typy urlopów, serwer: zapytania i serwis zapisują i zwracają `day_count`, `requires_approval`; historia
  zmian ma oba pola przed → po; `findSelectableLeaveType` i `listSelectableLeaveTypes` je zwracają. Testy tras
  (zapis, lista, 400) w `backend/src/modules/leave-types/__tests__/` → `npm run check`
- [x] 6. Typy urlopów, ekran: kolumny „Liczenie dni” i „Zatwierdzanie” (tabela i karty), w oknie `Radio.Group`
  „Liczenie dni” i `Switch` „Wymaga zatwierdzenia” jak w makiecie (nowy typ: robocze, włączony), nowe teksty
  podpowiedzi i ostrzeżenia. Porównane z: `LeaveTypeModals` (makieta) → ta sama rama okna, tylko nowe pola. Testy
  ekranu → `npm run check`
- [x] 7. `checkLeaveRequest` (shared): typ dostaje `dayCount`, `requiresApproval`; najwcześniejsza data „Od” =
  dziś, a bez zatwierdzania dziś − `NO_APPROVAL_BACKDATE_DAYS` (funkcja `earliestLeaveStart(type, today)` w tym samym
  pliku, używa jej też okno wniosku); dni = `countWorkingDays` albo liczba wszystkich dni; `no_working_days` tylko
  przy roboczych; wynik `ok` ma `dayCount`. Testy: 7 dni wstecz ok, 8 → `past_date`, z zatwierdzaniem wczoraj →
  `past_date`, piątek–poniedziałek kalendarzowo = 4, sobota–niedziela kalendarzowo = 2 (nie `no_working_days`), limit
  14 dni kalendarzowych: 14 ok, 15 → `limit_exceeded`, pula odejmuje dni kalendarzowe, rok zamknięty przy dacie
  wstecz → `year_closed` → `npm run check`
- [x] 8. Moje urlopy, złożenie (serwer): `createRequest` zapisuje `day_count` z typu; typ bez zatwierdzania →
  `status = 'approved'`, `auto_approved = 1`, `decided_at = NOW()`; powiadomienie `leave_absence_reported`
  (nowy rodzaj w `shared/src/constants/notifications.ts`, parametry z `dayCount`) zamiast `leave_request_new`;
  `leave_request_new` też dostaje `dayCount`; e-mail z polem `autoApproved` i `dayCount` (wersja „Zgłoszona
  nieobecność”: temat, nagłówek, wstęp, bez „Zostanie po zatwierdzeniu”). Historia: `status`, `auto_approved`. Testy
  w `backend/src/modules/my-leave/__tests__/` i `backend/src/email/__tests__/` (treść obu wersji, wersja tekstowa) →
  `npm run check`
- [x] 9. Moje urlopy, wycofanie (serwer): `canWithdrawRequest(r, today)` w `shared/src/leaveRequestCheck.ts`:
  `pending` → tak; `approved` z `autoApproved` → `dateFrom ≥ today` albo `toIsoDate(createdAt) === today`; reszta →
  nie. `withdrawRequest` używa jej pod blokadą wiersza (warunek także w `UPDATE`: dwa wycofania naraz → jedno),
  komunikat 409 „Tego wniosku nie możesz już wycofać”; lista wniosków zwraca `canWithdraw`. Testy: każdy przypadek
  z tabeli, dwa naraz, cudzy → 404 → `npm run check`
- [x] 10. Moje urlopy, ekran: okno wniosku (podpowiedzi typu, `DateField` „Od” z `minDate = earliestLeaveStart`,
  pasek dni: przy kalendarzowym każdy dzień się liczy, wynik z `leaveDaysText`, przycisk „Zgłoś” i dymek
  „Zgłoszono. Administrator dostał powiadomienie.” przy typie bez zatwierdzania), tabela: kolumna „Dni”, „Wycofaj”
  według `canWithdraw`. Testy ekranu → `npm run check`
- [x] 11. Wnioski urlopowe, Kalendarz, Pulpit, PDF, powiadomienia: zapytania zwracają `day_count`, `auto_approved`;
  szczegóły wniosku (common) i PDF: „Zatwierdzony automatycznie (typ bez zatwierdzania)” zamiast osoby; Kalendarz
  rysuje `calendarSegments(…, a.dayCount)`; tekst powiadomień `leave_absence_reported` i `leave_request_new` z
  jednostką (stare powiadomienia bez `dayCount` = robocze). Testy: approve/reject automatycznego → 409
  `already_decided`, cancel → ok i dni wracają, pasek kalendarzowy ciągły przez weekend, PDF z nowym wierszem →
  `npm run check`
- [x] 12. Dokumenty: `SPEC-GENERAL.md` (słownik „Dni wniosku”, tabele `leave_types`/`leave_requests`, zasady
  powiadomień i e-maili: „Zgłoszona nieobecność”), `DESIGN.md` bez zmian; `README.md` bez zmian (nowych poleceń
  nie ma) → `npm run check`
- [x] 13. Test e2e w `e2e/calendar.spec.ts` ze scenariuszy `TESTS-2.md` (tymczasowy pracownik, typ „Chorobowe”:
  zgłoszenie 2 dni wstecz, status „Zatwierdzony”, powiadomienie u administratora, ciągły pasek w kalendarzu,
  wycofanie; typ kalendarzowy z zatwierdzaniem: liczba dni z weekendem) → `npm run test:e2e`
- [ ] 14. Przegląd kodu całej części (jeden recenzent, lista kontrolna z `CONVENTIONS.md`), poprawki z testem,
  żadnego `it.todo` → `npm run check`

## Na co uważać (przegląd)

- Godzina 23:30 i 0:30: „dziś” zawsze w strefie aplikacji (`todayIsoDate`, `toIsoDate`), także przy wycofaniu
  w dniu złożenia.
- Typ zmieniony z roboczego na kalendarzowy, gdy są już wnioski: stare liczą się i rysują po staremu (`day_count`
  z wniosku, nigdy z typu).
- Typ bez zatwierdzania, który odejmuje dni z puli: brak dni nadal blokuje, a zatwierdzony od razu zmniejsza pulę.
- Wniosek automatyczny nie pojawia się w „Czekają” ani w boksie „do rozpatrzenia” na Pulpicie.
- Data wstecz na przełomie roku: grudzień zamknięty → `year_closed`, a nie zapis w nowym roku.

## Ustalenia w trakcie budowy

- Kroki 3–9 zrobione jednym ciągiem: nowe pola w typach danych wymagały od razu zmian w zapytaniach, ekranie Typów
  urlopów i danych testowych, inaczej `npm run check` nie byłby zielony między krokami.
- Pulpit pokazuje liczbę dni z jednostką („2 dni robocze” zamiast „2 dni”), jak reszta aplikacji (wspólne
  `leaveDaysText`).
- Kolumna „Dni robocze” we wszystkich listach i na wydruku nazywa się „Dni”, a wartość ma jednostkę.
- Historia zmian złożenia wniosku dopisuje `day_count` tylko przy dniach kalendarzowych, a `status`
  i `auto_approved` tylko przy zatwierdzeniu automatycznym (zwykły wniosek bez zmian).
- Wycofanie zwraca nowy komunikat `cannot_withdraw` („Tego wniosku nie możesz już wycofać…”) zamiast `not_pending`.
- Ikona powiadomienia „Zgłoszona nieobecność”: termometr, zielona (wniosek jest już zatwierdzony).
- Pole „Od” w oknie wniosku nie pozwala wpisać dnia sprzed najwcześniejszej daty, a gdy serwer mimo to odmówi,
  ramka przy typie bez zatwierdzania mówi „Ten typ możesz zacząć najwcześniej 7 dni przed dziś”.
- PDF wniosku zatwierdzonego automatycznie: w „Decyzja” jest „Zatwierdzony automatycznie (typ bez zatwierdzania)”
  i chwila zgłoszenia.
- Dymek w kalendarzu pokazuje tylko typ (jak w części 1); liczba dni z jednostką jest w panelu szczegółów.

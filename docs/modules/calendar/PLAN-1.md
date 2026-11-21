# Plan: Kalendarz, część 1: Kalendarz

**Podstawa:** `SPEC-1.md`, `SPEC.md`, makieta `mockups/src/modules/calendar/`.

**Używam ponownie:** `SideDrawer`, `DataState`, `EmptyState`, `PageHeader`, `PersonAvatar`, `InfoCard`, `ButtonIcon`,
`DateText`, `ConfirmModal`, `LeaveRequestParts` (common); `notify`, `apiErrorMessage` (core); `isWeekend`,
`getHoliday`, `dayjs`, `formatDate`, `todayIsoDate`, `isoDate` (shared); `listActiveUsers(db, 'employee')`
(employees.queries, po nazwisku i imieniu); trasy decyzji `POST /api/leave-requests/:id/approve|reject|cancel`.

**Wydzielam:** szczegóły wniosku z decyzjami z modułu Wnioski urlopowe → wspólne, bo kalendarz otwiera ten sam
panel: `DetailsDrawer`, `DecisionModals` (Zatwierdź, Odrzuć, Anuluj), `TeamStrip` i `isLate` →
`frontend/src/common/leave-request/`; hooki `useLeaveRequest`, `useApproveRequest`, `useRejectRequest`,
`useCancelRequest` i `leaveRequestPdfUrl` → `frontend/src/core/leaveRequestDecisions.ts` (decyzja odświeża też
kalendarz i Pulpit). W makietach: ten sam panel → `mockups/src/common/LeaveRequestDrawer.tsx` dla makiety Kalendarza
(makiety zrobionego modułu Wnioski urlopowe nie ruszam).

**Uwaga (odchylenie od makiety, do pokazania użytkownikowi):** panel po kliknięciu paska to pełne szczegóły wniosku
z Wniosków urlopowych (pula osoby, „Kto jeszcze ma wtedy wolne”, „Zatwierdź” / „Odrzuć” przy czekającym, „Anuluj
urlop” i „PDF” przy zatwierdzonym), a nie uproszczony panel z makiety. Przycisk „Otwórz wniosek” odpada, bo panel
pokazuje już wszystko. Jedna wersja szczegółów w całej aplikacji, a nie dwie.

- [x] 0. Szkielet testów `it.todo` z wymagań `SPEC-1.md` i `TESTS-1.md`:
  `backend/src/modules/calendar/__tests__/calendar.routes.test.ts` (dane, zakres `from` + 60, domyślnie dziś, zła
  data → 400, tylko `pending`/`approved` nachodzące na zakres, osoby bez archiwum i bez administratorów, 401, 403),
  `shared/src/schemas/__tests__/calendar.test.ts` (`from`: brak, poprawna, `2026-02-30`, `1999-12-31`, `2100-01-01`),
  `shared/src/__tests__/calendarSegments.test.ts` (podział paska), `frontend/src/modules/calendar/__tests__/*`
  (ekran, siatka, filtry, „Dziś nie ma”, puste stany), `e2e/calendar.spec.ts`; testy dopisków do zrobionych modułów
  w `backend/src/modules/calendar/__tests__/leave-types.todo.test.ts` i
  `frontend/src/modules/calendar/__tests__/done-modules.todo.test.tsx` (miejsca docelowe w pierwszej linii)
  → `npm run check`
- [x] 1. Wydzielenie szczegółów wniosku z decyzjami (lista „Wydzielam”) + testy przeniesione razem z kodem, Wnioski
  urlopowe korzystają ze wspólnych; `useDecision` odświeża `['leave-requests']`, `['employees']`, `['calendar']`,
  `['dashboard']`; nowy parametr `showInCalendar` (przycisk „Pokaż w kalendarzu”, krok 9).
  Porównane z: `DetailsDrawer` (leave-requests), `SideDrawer` (common), szczegóły zadania (tasks) → rama zostaje
  `SideDrawer`, wspólna jest cała treść szczegółów wniosku → `npm run check`
- [x] 2. Makiety: `mockups/src/common/LeaveRequestDrawer.tsx` (treść jak `DetailsDrawer` z makiety Wniosków), makieta
  Kalendarza używa go zamiast własnego panelu → `npx tsc -p mockups`, `npm run check`
- [x] 3. Kolor typu urlopu: `LEAVE_TYPE_COLORS` w `shared/src/constants/leaveTypes.ts`, pole `color` w schemacie typu
  (`z.enum`) + testy schematu (każdy z 6, `yellow` → błąd, brak → błąd) → `npm run check`
- [x] 4. Migracje `029_leave_types_color.sql` (kolumna) i `030_leave_types_color_seed.sql` (kolory typów startowych
  po nazwie) → `npm run migrate`; `leave-types.queries.ts` czyta i zapisuje `color`; testy tras typów: zapis koloru,
  kolor spoza listy → 400, wpis w historii zmian z `color` przed → po → `npm run check`
- [x] 5. Typy urlopów na froncie: kwadracik koloru przy nazwie (tabela i karty), „Kolor w kalendarzu” w oknie
  (6 kwadratów, wybrany z ptaszkiem, nowy = zielony) + testy (wybór koloru wysyła `color`, kwadracik w wierszu).
  Porównane z: `ColorSwatch` nieużywany dotąd w `frontend/src` i `mockups/src` (poza makietami Kalendarza i Typów)
  → nowy klocek `common/ColorSwatchPicker.tsx` (front i makiety) z `value`, `onChange`, `colors` → `npm run check`
- [ ] 6. Backend kalendarza: `calendarQuerySchema` (`from: optionalField(isoDate)` w zakresie 2000–2099) + testy;
  `listCalendarAbsences(db, from, to)` w `leave-requests.queries.ts` (typ, kolor, status, daty, dni, komentarz,
  daty złożenia i decyzji; tylko `pending`/`approved`, osoby bez archiwum) + test w docelowym pliku leave-requests;
  `calendar.service.ts` (zakres, dziś, osoby z `listActiveUsers(db, 'employee')`, wnioski tylko tych osób),
  `calendar.routes.ts` z `validateQuery`, `mountModule(api, 'calendar', calendarRoutes)`; wiersz w „Mapie dostępu”
  `SPEC-GENERAL.md`; testy tras (dane, 400, 401, 403) → `npm run check`
- [ ] 7. Podział paska na kawałki: `calendarSegments(from, to, days, dayCount)` w `shared/src/calendar.ts` (dni
  robocze: kawałki bez weekendów i świąt, przerwy jako „linia”, przerwa na brzegu zakresu pomijana; dni
  kalendarzowe: jeden kawałek; przycięcie do zakresu) + testy (urlop przez weekend, przez Wigilię i święta,
  zaczyna się przed zakresem, kończy po nim, jeden dzień) → `npm run check`
- [ ] 8. Ekran Kalendarz: `calendar.api.ts` (`useCalendar(from)`), `CalendarPage.tsx` (nagłówek z podsumowaniem,
  „Dziś nie ma”, wyszukiwarka, filtry kolorów, pasek zakresu ze strzałkami i „Dziś”, `?from=` w adresie, legenda,
  puste stany), `components/CalendarGrid.tsx` (siatka z makiety: miesiące, dni, kreski, weekendy i święta z nazwą
  w dymku, dziś, kolumna osób przyklejona, paski z opisem na środku i dymkiem, klik i Enter otwierają wspólny panel
  szczegółów), wpis w `pages.ts` + testy ekranu (dane, ładowanie, błąd, brak pracowników, brak wyników wyszukiwania,
  filtr chowa paski, strzałki zmieniają `from`, „Dziś” wyszarzony na dziś, klik w pasek otwiera szczegóły).
  Porównane z: `LeaveStrip` (common; komórki dni do 31 dni, bez pasków i bez przewijania z przyklejoną kolumną)
  → inna rama, zostaje osobno; `SearchField` (common) → używam go do wyszukiwarki; filtry: `Chip` dotąd tylko
  w makiecie Kalendarza → w module → `npm run check`
- [ ] 9. Powiązania: Pulpit, boks „Nieobecności na 2 tygodnie” → przycisk „Otwórz kalendarz” (`CALENDAR_PATH`);
  szczegóły wniosku (wspólny panel, poza kalendarzem) → „Pokaż w kalendarzu” (`/admin/calendar?from=<od>`) przy
  czekającym i zatwierdzonym + testy w plikach docelowych (dashboard, common/leave-request) → `npm run check`
- [ ] 10. `DESIGN.md`: wzorzec „Kalendarz zespołu” opisuje własną siatkę (dziś + 60 dni, kolor typu, czeka = jasny
  z przerywaną ramką, przerwy w dniach roboczych, kreski między dniami); `SPEC-GENERAL.md` „Mapa dostępu” sprawdzona;
  `TESTS-1.md` uzupełniony → `npm run check`
- [ ] 11. Test e2e `e2e/calendar.spec.ts` ze scenariuszy `TESTS-1.md` (administrator: kalendarz, wniosek e2e
  w zakresie, filtr, wyszukiwanie, panel z decyzją, „Pokaż w kalendarzu”; pracownik: brak pozycji w menu i 403 na
  adresie API); sprzątanie danych `E2E` w `global-teardown.ts`, jeśli test je tworzy → `npm run check`

# Plan: Typy urlopów

> Wykonanie: w tej rozmowie, krok po kroku (`superpowers:executing-plans` + `superpowers:test-driven-development`),
> na gałęzi `main`. Każdy krok: test, który nie przechodzi → kod → `npm run check` → odhaczenie `- [x]`.

**Cel:** słownik typów urlopów dla administratora: lista z kolejnością (strzałki), dodawanie, edycja, ukrywanie
i przywracanie; tabela `leave_types` z 5 typami na start; funkcje dla modułu „Moje urlopy”.

**Architektura:** backend `modules/leave-types/`: `leave-types.routes.ts` (trasy, `validateBody`),
`leave-types.queries.ts` (SQL na `leave_types`), `leave-types.service.ts` (nazwa zajęta, pozycja, przesuwanie, ostatni
widoczny; zapisy wielowierszowe w `withTransaction`). Wspólne `idParam`, `reply`, `ServiceError`, `Result`, `fail`
przeniesione z Pracowników do `backend/src/middleware/routeHelpers.ts`. Podpięcie `mountModule(api, 'leave-types',
leaveTypesRoutes)`. Front `modules/leave-types/`: `LeaveTypesPage.tsx`, `components/` (tabela, karty, okna),
`leave-types.api.ts`. Testy backendu z podmienionym `pool`/zapytaniami (jak w Pracownikach), całość z bazą w e2e.

**Spec:** `docs/modules/leave-types/SPEC.md` · `docs/CONVENTIONS.md` · makieta `mockups/src/modules/leave-types/`

## Zasady całego planu

- Teksty tylko w `shared/locales/pl/leave-types.json` (klucze już są z makiety; brakujące dopisujesz tam), kod po
  angielsku. Klucze błędów serwera: `leave-types.server.name_taken`, `name_taken_hidden`, `last_visible`,
  `already_hidden`, `not_hidden`.
- Stałe w `shared/src/constants/leaveTypes.ts`: `LEAVE_TYPE_NAME_MAX = 40`, `LEAVE_TYPE_LIMIT_MIN = 1`,
  `LEAVE_TYPE_LIMIT_MAX = 365`, `LEAVE_TYPE_MESSAGES` (klucze wyżej), eksport w `constants/index.ts`.
- Typy urlopów są poza historią zmian: bez `logActivity`.
- Funkcje tylko jako stałe ze strzałką; testy w folderach `__tests__`; testy zasad niezmienione, `// rule-ok:` tylko
  z konkretnym powodem.

## Na co uważać (testy dopisane w krokach)

1. Nazwa „ na żądanie ” przy istniejącym „Na żądanie” → 409 `name_taken` (obcięte spacje, bez rozróżniania wielkości
   liter), także przy ukrytym → `name_taken_hidden` z `hiddenType` (krok 3).
2. Edycja „Wypoczynkowy” → „wypoczynkowy” (zmiana tylko wielkości liter) zapisuje się, bo sprawdzanie pomija sam
   edytowany typ (krok 3).
3. Dwa jednoczesne „Ukryj” przy dwóch widocznych typach → jedno 200, drugie 409 `last_visible` (blokada `FOR UPDATE`
   w transakcji; krok 4).
4. Przesuwanie po ukryciu typu ze środka (pozycje 1, 3, 4) → „wyżej” przy pozycji 3 zamienia z pozycją 1, nie szuka
   pozycji 2 (krok 4).
5. Edycja: wyczyszczony limit zapisuje `NULL` („bez limitu”), a 0 i 366 dają błąd pod polem (kroki 1 i 6).

---

- [x] **0. Szkielet testów.** `it.todo` dla każdego wymagania z kroków 1–7 (nazwy jak niżej) w:
  `shared/src/schemas/__tests__/leaveTypes.test.ts`,
  `backend/src/modules/leave-types/__tests__/leave-types.queries.test.ts`,
  `backend/src/modules/leave-types/__tests__/leave-types.service.test.ts`,
  `backend/src/modules/leave-types/__tests__/leave-types.routes.test.ts`,
  `backend/src/middleware/__tests__/routeHelpers.test.ts`,
  `frontend/src/modules/leave-types/__tests__/LeaveTypesPage.test.tsx`,
  `frontend/src/modules/leave-types/components/__tests__/LeaveTypeFormModal.test.tsx`,
  `e2e/leave-types.spec.ts` (`test.fixme`). → `npm run check`

- [x] **1. Stałe i schematy.** `shared/src/constants/leaveTypes.ts` (wartości wyżej). `shared/src/schemas/leaveTypes.ts`:
  `leaveTypeSchema = z.object({ name: personName(LEAVE_TYPE_NAME_MAX), deductsPool: z.boolean(), yearlyLimit:
  optionalField(wholeNumber(LEAVE_TYPE_LIMIT_MIN, LEAVE_TYPE_LIMIT_MAX)) })`, `leaveTypeMoveSchema = z.object({
  direction: z.enum(['up', 'down']) })`; typy `LeaveTypeInput`, `LeaveTypeData`, `LeaveTypeItem = { id: number; name:
  string; deductsPool: boolean; yearlyLimit: number | null; hidden: boolean; requestsCount: number }`,
  `LeaveTypesListResponse = { items: LeaveTypeItem[] }`, `SelectableLeaveType = Pick<LeaveTypeItem, 'id' | 'name' |
  'deductsPool' | 'yearlyLimit'>`; eksport w `shared/src/index.ts`. Testy: nazwa 1/2/40/41 znaków, „ Szkoleniowy ”
  → „Szkoleniowy”, pusta → `validation.required`; limit `''`/`undefined` → `null`, 1 i 365 ok, 0, 366, 2.5 → błąd,
  `'4'` → 4; `deductsPool` brak → błąd; `direction: 'left'` → błąd.

- [x] **2. Migracje i zapytania.** `backend/migrations/008_leave_types.sql` (kolumny ze specu, `UNIQUE KEY
  uq_leave_types_name (name)`, `INDEX (hidden_at, position)`), `009_leave_types_seed.sql` (5 typów ze specu) →
  `npm run migrate`. `leave-types.queries.ts` (każda funkcja z `db: Db` jak w Pracownikach):
  `listLeaveTypes(db): Promise<LeaveTypeRow[]>` (widoczne `ORDER BY position`, potem ukryte `ORDER BY name`),
  `findLeaveType(db, id)`, `findByName(db, name, exceptId: number | null): Promise<{ id; name; hidden } | null>`,
  `maxPosition(db): Promise<number>` (0 przy pustej tabeli), `insertLeaveType(db, data, position): Promise<number>`,
  `updateLeaveType(db, id, data)`, `lockVisible(db): Promise<{ id; position }[]>` (`FOR UPDATE`, według `position`),
  `setPosition(db, id, position)`, `setHidden(db, id)`, `setVisible(db, id, position)`,
  `listSelectableLeaveTypes(db = pool): Promise<SelectableLeaveType[]>`, `findSelectableLeaveType(id, db = pool)`
  (ukryty → `null`). Testy (podmieniony `db`): każde SQL z `?`; `listLeaveTypes` zamienia wiersze na `LeaveTypeItem`
  z `requestsCount: 0`; `findSelectableLeaveType` dla ukrytego → `null`; `lockVisible` ma `FOR UPDATE`.

- [x] **3. Wspólne pomocniki, lista, dodawanie, edycja.**
  - `backend/src/middleware/routeHelpers.ts`: `idParam(res, raw): number | null`, `reply<T>(res, result: Result<T>,
    status = 200)`, `ServiceError`, `Result<T>`, `fail(status, message, extra?)` przeniesione z Pracowników (`extra`
    obejmuje `archivedUser` i `hiddenType`); Pracownicy importują stąd. Testy: `idParam('0'|'-1'|'abc'|'1.5')` →
    404, `'7'` → 7; `reply` z błędem → `sendError` z polami i dodatkami; testy Pracowników dalej zielone.
  - `leave-types.service.ts`: `listTypes(): Promise<LeaveTypesListResponse>`, `createType(input):
    Promise<Result<{ id: number }>>` (nazwa zajęta → 409 `fields.name`; nowy na `maxPosition + 1`),
    `updateType(id, input): Promise<Result>` (brak → 404). Konflikt nazwy: widoczny → `name_taken`; ukryty →
    `name_taken_hidden` + `hiddenType: { id, name }`; `ER_DUP_ENTRY` z bazy → 409 `name_taken`.
  - Trasy: `GET /`, `POST /` (201), `PUT /:id`; `mountModule(api, 'leave-types', leaveTypesRoutes)` w `app.ts`;
    wiersz w Mapie dostępu w `SPEC-GENERAL.md`. Testy: lista w kolejności; dodanie → pozycja 6; „ na żądanie ” przy
    „Na żądanie” → 409 `name_taken`; nazwa ukrytego → `name_taken_hidden` z `hiddenType`; edycja „wypoczynkowy” tego
    samego typu → 200; edycja nieistniejącego → 404; `ER_DUP_ENTRY` → 409; 401 bez logowania, 403 dla `employee`.

- [x] **4. Przesuwanie, ukrywanie, przywracanie.** `moveType(id, direction): Promise<Result>`, `hideType(id)`,
  `unhideType(id)`, każde w `withTransaction`. Trasy `POST /:id/move` (`validateBody(leaveTypeMoveSchema)`),
  `POST /:id/hide`, `POST /:id/unhide` (dwie ostatnie bez danych wejściowych: `// rule-ok: bez danych wejściowych,
  tylko numer z adresu`, jak w Pracownikach). Zasady: move zamienia `position` z sąsiadem z `lockVisible` (nie
  `position ± 1`); brzeg listy → 200 bez zapisu; ukryty lub brak → 404. Hide: brak → 404; już ukryty → 409
  `already_hidden`; jedyny w `lockVisible` → 409 `last_visible`. Unhide: brak → 404; widoczny → 409 `not_hidden`;
  pozycja `maxPosition + 1`. Testy: każdy przypadek; pozycje 1, 3, 4 → „wyżej” przy 3 zamienia z 1; dwa „Ukryj”
  jedno po drugim przy dwóch widocznych → 200, potem 409 `last_visible` (blokada sprawdzona przez `FOR UPDATE`
  w zapytaniu); przywrócony ląduje na końcu.

- [x] **5. Front: dane i lista.** `leave-types.api.ts`: `useLeaveTypes()`, `useCreateLeaveType()`,
  `useUpdateLeaveType()`, `useMoveLeaveType()`, `useHideLeaveType()`, `useUnhideLeaveType()` (po sukcesie
  `invalidateQueries(['leave-types'])`). `LeaveTypesPage.tsx` (wpis `'leave-types'` w `pages.ts`),
  `components/LeaveTypesTable.tsx`, `components/LeaveTypeCards.tsx` (`hiddenFrom="sm"`) jak w makiecie, `DataState`
  z tekstem pustej listy i przyciskiem. Testy: podsumowanie „W formularzu wniosku: 5. Ukryte: 1.”; przełącznik
  „Pokaż ukryte (1)” wyłączony po wejściu, po włączeniu ukryty typ ze znacznikiem i bez strzałek; brak przełącznika
  przy 0 ukrytych; „Przesuń wyżej” wyłączone przy pierwszym, „Przesuń niżej” przy ostatnim, kliknięcie woła
  `move` z `up`/`down`; „4 dni na osobę”, „bez limitu”, „odejmuje”/„nie odejmuje”; „Ukryj” wyłączone przy jedynym
  widocznym z dymkiem `hide_last`; „Przywróć” woła `unhide` i pokazuje dymek `unhidden_done`; pracownik pod adresem
  → brak dostępu.

- [x] **6. Front: okna.** `components/LeaveTypeFormModal.tsx` (`useForm` + `zodResolver(leaveTypeSchema)`),
  `components/HideLeaveTypeModal.tsx`. Testy: dodawanie z włączonym „Odejmuje dni z puli”; pusta nazwa → „To pole
  jest wymagane.”; limit 0 i 366 → błąd pod polem; wyczyszczony limit wysyła `yearlyLimit: null`; edycja typu
  z `requestsCount: 3` → żółta ramka z liczbą, przy 0 bez ramki; 409 `name_taken` → błąd pod nazwą; 409
  `name_taken_hidden` → link „Przywróć go”, kliknięcie → `unhide`, zamknięcie okna i dymek; sukces → dymek
  `added`/`saved` i zamknięcie; okno ukrycia z nazwą i liczbą wniosków, „Ukryj” → dymek `hidden_done`.

- [x] **7. Dokumenty i testy w przeglądarce.** `TESTS.md` (scenariusze administratora; pracownik nie ma pozycji
  „Typy urlopów”, adres → brak dostępu). `e2e/leave-types.spec.ts`: admin dodaje typ `E2E <znacznik czasu>`,
  edytuje limit, przesuwa wyżej, ukrywa, widzi go po „Pokaż ukryte”, przywraca; dodanie tej samej nazwy → błąd;
  pracownik → brak dostępu. Seed e2e usuwa typy `E2E %` (bez wniosków to bezpieczne). → `npm run check`,
  `npm run test:e2e`.

- [ ] **8. Przegląd kodu** (jeden recenzent, lista kontrolna z `CONVENTIONS.md`), poprawki z testami.

## Rozstrzygnięcia w trakcie budowy

- Krok 2: lista kolumn wpisana wprost w każde zapytanie (test zasad nie przepuszcza `${…}` w SQL, nawet stałej).
- Krok 3: `ServiceError` w `routeHelpers.ts` ma dowolne dodatkowe dane (`archivedUser`, `hiddenType`), a `reply` przekazuje je wszystkie do `sendError`. Dodawanie typu w `withTransaction`, `maxPosition` z `FOR UPDATE`, żeby dwa nowe typy dodane w tej samej chwili nie dostały tej samej pozycji. Testy tras podmieniają usługę modułu (reguły sprawdzają testy usługi).
- Kroki 5–6 zrobione razem (ekran używa okien). Pole „Limit dni w roku” ma `clampBehavior="none"`: domyślnie Mantine po cichu poprawiał 0 na 1 i kasował błąd pod polem. Formularz wysyła wartości jak w Pracownikach (pusty limit jako `''`), serwer zamienia je schematem na `null`. Brak dostępu pracownika pod adresem sprawdza wspólne prowadzenie tras i test e2e (krok 7), nie test ekranu.
- Krok 7: wspólne kroki testów w przeglądarce (`logIn`, `logOut`, `addEmployee`, nowe `logInWithOwnPassword`) przeniesione do `e2e/helpers.ts`; testy Pracowników importują je stamtąd. Seed e2e (`removeTemporaryData`) usuwa też typy `E2E %`.

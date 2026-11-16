# Plan: Typy umów

> Wykonanie: w tej rozmowie, krok po kroku (`superpowers:executing-plans` + `superpowers:test-driven-development`),
> na gałęzi `main`. Każdy krok: test, który nie przechodzi → kod → `npm run check` → odhaczenie `- [x]`.

**Cel:** słownik typów umów dla administratora (lista z kolejnością strzałkami, dodawanie, zmiana nazwy, ukrywanie,
przywracanie; tabela `contract_types` z 4 typami na start) i przejście pola „Rodzaj umowy” u pracownika ze stałej
listy (`users.contract_type` ENUM) na typy z tabeli (`users.contract_type_id`).

**Architektura:** backend `modules/contract-types/` na wzór `modules/leave-types/`: `contract-types.routes.ts`,
`contract-types.queries.ts`, `contract-types.service.ts`; wspólne `idParam`, `reply`, `fail`, `Result` z
`backend/src/middleware/routeHelpers.ts`. Podpięcie `mountModule(api, 'contract-types', contractTypesRoutes)`.
Pracownicy wołają funkcje z `contract-types.queries.ts` (sekcja „Powiązania” specu) i mają własną trasę
`GET /api/employees/contract-types`. Front `modules/contract-types/`: `ContractTypesPage.tsx`, `components/`,
`contract-types.api.ts`; front Pracowników ma własny hook do listy typów.

**Spec:** `docs/modules/contract-types/SPEC.md` · `docs/CONVENTIONS.md` · makieta `mockups/src/modules/contract-types/`

## Zasady całego planu

- Teksty tylko w `shared/locales/pl/contract-types.json` i `employees.json`, kod po angielsku. Klucze błędów:
  `contract-types.server.name_taken` („Typ o tej nazwie już jest.”), `name_taken_hidden` („Typ o tej nazwie już
  jest, ukryty.”), `already_hidden` („Ten typ jest już ukryty. Odśwież stronę.”), `not_hidden` („Ten typ jest już do
  wyboru u pracownika. Odśwież stronę.”), `employees.server.contract_type_unavailable` („Tego typu umowy nie można
  już wybrać. Odśwież stronę.”).
- Stałe w `shared/src/constants/contractTypes.ts`: `CONTRACT_TYPE_NAME_MAX = 60`, `CONTRACT_TYPE_MESSAGES` (klucze
  wyżej), eksport w `constants/index.ts`.
- Słownik typów jest poza historią zmian (bez `logActivity` w module); historia konta pracownika zapisuje nazwę typu.
- Funkcje tylko jako stałe ze strzałką; testy w folderach `__tests__`; testy zasad niezmienione; nie importujesz
  z folderu innego modułu na froncie.

## Na co uważać (testy dopisane w krokach)

1. Edycja pracownika z ukrytym typem bez zmiany umowy (np. zmiana samego e-maila) zapisuje się, a wybranie ukrytego
   typu u innej osoby daje 400 `contract_type_unavailable` (krok 5).
2. „ umowa zlecenie ” przy istniejącym „Umowa zlecenie” → 409 `name_taken`; przy ukrytym → `name_taken_hidden`
   z `hiddenType`; zmiana tylko wielkości liter tego samego typu zapisuje się (krok 3).
3. Migracja przepisuje wszystkie 4 stare wartości i zostawia `NULL` jako `NULL` (krok 2, test na bazie w e2e/seed:
   sprawdzenie po `npm run migrate`, że liczba osób z umową się nie zmieniła).
4. Przesuwanie po ukryciu typu ze środka (pozycje 1, 3, 4) → „wyżej” przy 3 zamienia z 1 (krok 4).
5. Wszystkie typy ukryte → okno pracownika pokazuje pustą listę z tekstem `contract_types_empty`, zapis bez umowy
   działa (kroki 4 i 7).

---

- [x] **0. Szkielet testów.** `it.todo` dla każdego wymagania z kroków 1–8 w:
  `shared/src/schemas/__tests__/contractTypes.test.ts`,
  `backend/src/modules/contract-types/__tests__/contract-types.queries.test.ts`,
  `backend/src/modules/contract-types/__tests__/contract-types.service.test.ts`,
  `backend/src/modules/contract-types/__tests__/contract-types.routes.test.ts`,
  `frontend/src/modules/contract-types/__tests__/ContractTypesPage.test.tsx`,
  `frontend/src/modules/contract-types/components/__tests__/ContractTypeFormModal.test.tsx`,
  (Pracownicy są `zrobiony`, więc test zasad nie pozwala na `it.todo` w ich testach: wymagania z kroków 5 i 7
  dopisuję tam od razu jako prawdziwe testy),
  `e2e/contract-types.spec.ts` (`test.fixme`). → `npm run check`

- [x] **1. Stałe i schematy.** `shared/src/constants/contractTypes.ts` (wartości wyżej).
  `shared/src/schemas/contractTypes.ts`: `contractTypeSchema = z.object({ name: personName(CONTRACT_TYPE_NAME_MAX) })`,
  `contractTypeMoveSchema = z.object({ direction: z.enum(['up', 'down']) })`; typy `ContractTypeInput`,
  `ContractTypeItem = { id: number; name: string; hidden: boolean; employeesCount: number }`,
  `ContractTypesListResponse = { items: ContractTypeItem[] }`, `SelectableContractType = { id: number; name: string }`;
  eksport w `shared/src/index.ts`. Testy: nazwa 1/2/60/61 znaków, „ B2B ” → „B2B”, pusta → `validation.required`;
  `direction: 'left'` → błąd.

- [x] **2. Migracje i zapytania.** `backend/migrations/012_contract_types.sql`, `013_contract_types_seed.sql`,
  `014_users_contract_type_id.sql` (FK `ON DELETE RESTRICT`), `015_users_contract_type_copy.sql`
  (`UPDATE users u JOIN contract_types c ON c.name = CASE u.contract_type … END SET u.contract_type_id = c.id`),
  `016_users_drop_contract_type.sql` → `npm run migrate`; sprawdzenie: liczba osób z umową przed i po taka sama.
  `contract-types.queries.ts` (każda z `db: Db`): `listContractTypes(db)` (widoczne `ORDER BY position`, potem ukryte
  `ORDER BY name`, z `employeesCount` przez `LEFT JOIN users … GROUP BY`), `findContractType(db, id): Promise<{ id;
  name; hidden } | null>`, `findByName(db, name, exceptId)`, `maxPosition(db)` (`FOR UPDATE`), `insertContractType`,
  `updateContractType`, `lockVisible(db)` (`FOR UPDATE`), `setPosition`, `setHidden`, `setVisible(db, id, position)`,
  `listSelectableContractTypes(db = pool): Promise<SelectableContractType[]>`. Testy (podmieniony `db`): SQL z `?`;
  `listContractTypes` zamienia wiersze na `ContractTypeItem`; `lockVisible` i `maxPosition` mają `FOR UPDATE`;
  `listSelectableContractTypes` ma `hidden_at IS NULL`.

- [x] **3. Lista, dodawanie, edycja.** `contract-types.service.ts`: `listTypes()`, `createType(input):
  Promise<Result<{ id: number }>>` (w `withTransaction`, nowy na `maxPosition + 1`), `updateType(id, input):
  Promise<Result>` (brak → 404). Konflikt nazwy: widoczny → 409 `fields.name` = `name_taken`; ukryty →
  `name_taken_hidden` + `hiddenType: { id, name }`; `ER_DUP_ENTRY` → 409 `name_taken`. Trasy `GET /`, `POST /` (201),
  `PUT /:id`; `mountModule(api, 'contract-types', contractTypesRoutes)` w `app.ts`; wiersze w Mapie dostępu w
  `SPEC-GENERAL.md`. Testy: lista; dodanie → pozycja 5; „ umowa zlecenie ” → 409 `name_taken`; nazwa ukrytego →
  `name_taken_hidden` z `hiddenType`; „b2b” przy edycji „B2B” → 200; brak → 404; `ER_DUP_ENTRY` → 409; 401, 403.

- [x] **4. Przesuwanie, ukrywanie, przywracanie.** `moveType(id, direction)`, `hideType(id)`, `unhideType(id)` w
  `withTransaction`. Trasy `POST /:id/move` (`validateBody(contractTypeMoveSchema)`), `POST /:id/hide`,
  `POST /:id/unhide` (`// rule-ok: bez danych wejściowych, tylko numer z adresu`). Move: zamiana z sąsiadem z
  `lockVisible`; brzeg → 200 bez zapisu; ukryty / brak → 404. Hide: brak → 404; ukryty → 409 `already_hidden`;
  ostatni widoczny **też** da się ukryć. Unhide: brak → 404; widoczny → 409 `not_hidden`; pozycja `maxPosition + 1`.
  Testy: każdy przypadek; pozycje 1, 3, 4 → „wyżej” przy 3 zamienia z 1; ukrycie jedynego widocznego → 200.

- [x] **5. Pracownicy: backend.** Schemat Pracowników: `contractType` → `contractTypeId:
  optionalField(wholeNumber(1, 2_147_483_647))`; `EmployeeItem.contractType: { id: number; name: string; hidden:
  boolean } | null`; usunięte `CONTRACT_TYPES`, `ContractType`, `CONTRACT_TYPE_LABELS` i `employees.contract_types.*`.
  `employees.queries.ts`: lista i odczyt z `LEFT JOIN contract_types`; zapis `contract_type_id`. Usługa: przed zapisem
  `findContractType`; dopuszczony widoczny albo równy obecnemu `contract_type_id` tej osoby; inaczej 400
  `fields.contractTypeId` = `employees.server.contract_type_unavailable` (nieistniejący też). Historia konta:
  `contract_type` = nazwa typu (przed i po). Trasa `GET /api/employees/contract-types` →
  `{ items: listSelectableContractTypes() }`; wiersz w Mapie dostępu. Testy: dodanie z widocznym → 201; z ukrytym →
  400; z nieistniejącym → 400; edycja osoby z ukrytym typem bez zmiany → 200; zmiana na inny ukryty → 400; `null` →
  zapis bez umowy; historia z nazwami „Umowa o pracę” → „B2B”; lista ma `contractType.name` i `hidden`; nowa trasa
  zwraca widoczne w kolejności, 401, 403.

- [x] **6. Front: Typy umów.** `contract-types.api.ts`: `useContractTypes()`, `useCreateContractType()`,
  `useUpdateContractType()`, `useMoveContractType()`, `useHideContractType()`, `useUnhideContractType()` (po sukcesie
  `invalidateQueries(['contract-types'])` i `['employees']`). `ContractTypesPage.tsx` (wpis w `pages.ts`),
  `components/ContractTypesTable.tsx`, `ContractTypeCards.tsx`, `ContractTypeFormModal.tsx` (`zodResolver(
  contractTypeSchema)`), `HideContractTypeModal.tsx`, jak w makiecie; `DataState` z tekstem `empty` i przyciskiem.
  Przycisk „Przywróć” zablokowany do odpowiedzi serwera. Testy: podsumowanie „Do wyboru u pracownika: 4. Ukryte: 1.”;
  „Pokaż ukryte (1)” wyłączony po wejściu, po włączeniu ukryty ze znacznikiem bez strzałek; brak przełącznika przy 0;
  strzałki wyłączone na brzegach i wołają `move`; „4 pracowników”, „nikt”; „Przywróć” → dymek `unhidden_done`;
  pusta nazwa → „To pole jest wymagane.”; edycja typu z `employeesCount: 4` → żółta ramka, przy 0 bez; 409
  `name_taken` → błąd pod polem; `name_taken_hidden` → link „Przywróć go” → `unhide`, zamknięcie, dymek; okno
  ukrycia z liczbą (przy 0 bez zdania o pracownikach) → dymek `hidden_done`.

- [x] **7. Front: Pracownicy.** Hook `useContractTypeOptions()` w `employees.api.ts` (`GET /api/employees/contract-types`).
  `EmployeeFormModal.tsx`: `Select` z typami; obecny ukryty typ osoby dopisany na końcu z „(ukryty)”; pusta lista →
  `nothingFoundMessage` = `employees.contract_types_empty`; wysyła `contractTypeId` (liczba albo `''`).
  `EmployeesTable.tsx` (i karta): `contractType.name` albo szare „brak”. Testy: opcje w kolejności z API; osoba
  z ukrytym typem ma go wybranego z „(ukryty)”, inna osoba go nie widzi; wyczyszczenie wysyła pustą umowę; kolumna
  „Umowa” z nazwą; 400 `contract_type_unavailable` → błąd pod polem.

- [x] **8. Dokumenty i testy w przeglądarce.** `TESTS.md` (scenariusze administratora; pracownik nie ma pozycji, adres
  → brak dostępu). `e2e/contract-types.spec.ts`: admin dodaje typ `E2E <znacznik czasu>`, zmienia nazwę, przesuwa
  wyżej, wybiera go u pracownika, ukrywa (pracownik go zachowuje, nowy pracownik go nie widzi), przywraca; ta sama
  nazwa → błąd; pracownik → brak dostępu. Seed e2e (`removeTemporaryData`) najpierw zeruje `contract_type_id`
  u kont z typem `E2E %`, potem usuwa te typy. Makieta Pracowników bez zmian (moduł zamknięty). `SPEC.md` Pracowników:
  dopisek o zmianie pola. → `npm run check`, `npm run test:e2e`.

- [x] **9. Przegląd kodu** (jeden recenzent, lista kontrolna z `CONVENTIONS.md`), poprawki z testami.

## Rozstrzygnięcia w trakcie budowy

- Krok 0: bez `it.todo` w testach Pracowników (moduł `zrobiony`, test zasad); ich testy powstają od razu w krokach 5 i 7.
- Kroki 5 i 7 zrobione razem: usunięcie `CONTRACT_TYPES` ze `shared` od razu psuje front i makietę Pracowników, więc
  `npm run check` jest zielony dopiero z obiema zmianami.
- Makieta Pracowników (moduł zamknięty) dostała tylko podmianę stałej listy na nazwy typów w `data.ts`
  (`CONTRACT_TYPE_NAMES`); wygląd bez zmian. Inaczej makiety by się nie budowały.
- Pole „Rodzaj umowy”: przycisk czyszczenia ma etykietę „Wyczyść” (`employees.contract_type_clear`), żeby czytnik ekranu
  i test go znajdowały.
- Przegląd kodu (bez błędów krytycznych), poprawione z testami: zapis pracownika odświeża też Typy umów (liczba
  „Pracownicy” bez 30 s opóźnienia); gdy wszystkie typy są ukryte, lista od razu je pokazuje; błąd wczytania typów
  w oknie pracownika pod polem (`employees.contract_types_error`); typ czytany przy zapisie pracownika z `FOR SHARE`
  (równoczesne „Ukryj” czeka); mocniejszy test „bez (ukryty)” u osoby z widocznym typem.
- Stare wpisy historii mają w `contract_type` kody (`employment`), nowe nazwy typów; ekran „Historia zmian” (moduł 11)
  ma pokazywać wartość tak, jak jest, bez tłumaczenia.
- Testy w przeglądarce: zaraz po ukryciu typu okno pracownika z tym typem się wysypywało (lista typów z pamięci miała
  jeszcze ten typ, a „własny ukryty” dopisywał go drugi raz). Poprawione z testem: własny ukryty dopisany tylko, gdy
  go nie ma na liście.

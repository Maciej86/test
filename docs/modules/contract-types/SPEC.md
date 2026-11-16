# Spec: Typy umów

**Data:** 2026-11-16 · **Status:** do akceptacji
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-16: 1a, 2a, 3a, 4a, 5 ok), `docs/IDEAS.md` (1a 2a 3a: tylko
administrator, „Ustawienia”, dodaj / zmień nazwę / ukryj), `SPEC-GENERAL.md`, makieta `mockups/src/modules/contract-types/`

## Cel

Administrator prowadzi listę typów umów zamiast stałych czterech rodzajów umowy w module Pracownicy. Dodaje typ,
zmienia mu nazwę, ustawia kolejność strzałkami i ukrywa typ, którego już nie chce. W oknie pracownika pole „Rodzaj
umowy” pokazuje widoczne typy w tej kolejności. Pracownicy, którzy mają ukryty typ, go zachowują. Moduł działa, gdy
administrator doda, zmieni, przesunie, ukryje i przywróci typ, nowy typ da się wybrać u pracownika, a dotychczasowe
umowy pracowników zostały bez zmian.

Typ umowy to **tylko nazwa** (pytanie 4a): nie wpływa na pulę urlopu ani na inne moduły.

## Ekrany

### Lista typów `/admin/contract-types` (admin)

Pozycja menu: „Ustawienia → Typy umów” (ikona `file-signature`). Układ jak w makiecie (bez paska „Pokaż stan”):
- Nagłówek „Typy umów”, pod nim „Do wyboru u pracownika: N. Ukryte: M.”.
- Po prawej: przełącznik „Pokaż ukryte (M)” (wyłączony po wejściu; nie ma go, gdy M = 0) i przycisk „Dodaj typ umowy”.
- Tabela (komputer) / karty (telefon, `hiddenFrom="sm"`), kolumny: strzałki kolejności, Nazwa, Pracownicy („4
  pracowników”, przy 0 szare „nikt”; liczą się także osoby w archiwum, pytanie 3a), akcje „Edytuj” i „Ukryj” (ukryty
  typ: „Przywróć”).
- Kolejność: widoczne według `position`, potem (przy „Pokaż ukryte”) ukryte alfabetycznie, przygaszone, ze
  znacznikiem „ukryty” i dopiskiem „Nie da się go wybrać u pracownika”. Ukryte nie mają strzałek.
- Strzałki (pytanie 2a): „Przesuń wyżej” wyłączona przy pierwszym widocznym, „Przesuń niżej” przy ostatnim.
  Kliknięcie zamienia typ z sąsiadem i odświeża listę (bez dymka).
- „Przywróć” od razu przywraca typ (bez okna), dymek „Typ jest znowu do wyboru u pracownika”. Typ trafia na koniec
  widocznych.
- Można ukryć wszystkie typy: rodzaj umowy jest nieobowiązkowy, więc pracownika da się zapisać i bez niego. **[decyzja
  AI]** (inaczej niż w Typach urlopów, gdzie bez typu nie da się złożyć wniosku).
- Ładowanie i błąd przez `DataState`; pusta lista: „Nie ma jeszcze typów umów. Dodaj pierwszy, a potem wybierzesz go
  w oknie pracownika.” z przyciskiem „Dodaj typ umowy”.
- Pracownik nie ma tej pozycji w menu; wejście pod adres → ekran „brak dostępu” (jak w innych modułach admina).

### Okno „Dodaj typ umowy” / „Edytuj typ „<nazwa>”” (admin)

- Jedno pole: Nazwa (podpowiedź „Tak zobaczysz ją w oknie pracownika i na liście pracowników, np. Umowa zlecenie”).
- Edycja typu, który ma ≥ 1 pracownik: żółta ramka nad polem „Ten typ ma N pracowników. Nowa nazwa pokaże się także
  u nich.”.
- Nazwa zajęta przez widoczny typ → pod polem „Typ o tej nazwie już jest.”; przez ukryty → „Typ „Umowa o staż” już
  jest, ukryty. Przywróć go” (link przywraca ukryty typ, zamyka okno, dymek jak przy „Przywróć”).
- „Zapisz” → dymek „Dodano typ umowy” / „Zapisano zmiany”, okno się zamyka. Błąd serwera → `notify.error`.
- Nowy typ trafia na koniec widocznych.

### Okno „Ukryć typ „<nazwa>”?” (admin)

Tekst: „Zniknie z listy do wyboru w oknie pracownika. N pracowników z tą umową ją zachowa. Typ możesz później
przywrócić.” (przy 0 bez zdania o pracownikach). Przyciski „Anuluj” i „Ukryj” (`EyeOff`). Dymek „Typ ukryty”.

### Zmiany w module Pracownicy (pytanie 1a)

- Okno dodaj / edytuj: pole „Rodzaj umowy” (`Select`, z „x” do wyczyszczenia) ma widoczne typy w kolejności
  `position`. Gdy edytowany pracownik ma ukryty typ, ten typ jest na końcu listy z dopiskiem „(ukryty)” i zostaje
  wybrany; po zmianie na inny nie da się do niego wrócić (po zapisie). Brak widocznych typów → pusta lista z tekstem
  „Brak typów umów. Dodasz je w Ustawieniach → Typy umów.”.
- Lista pracowników, kolumna „Umowa”: nazwa typu (także ukrytego, bez dopisku); brak → szare „brak” jak dotąd.
- Historia zmian konta zapisuje **nazwę** typu (`contract_type`: „Umowa zlecenie”), żeby wpis był czytelny także po
  zmianie nazwy albo ukryciu typu. **[decyzja AI]**

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Typ umowy | Nazwa | tak | 2–60 znaków | obcięte spacje; niepowtarzalna także wśród ukrytych, bez względu na wielkość liter (Umowa zlecenie) | `personName(CONTRACT_TYPE_NAME_MAX)` (jak w Typach urlopów) |
| Pracownik | Rodzaj umowy | nie | — | numer typu albo puste (`NULL`) | `optionalField(wholeNumber(1, 2_147_483_647))` (dodatnia liczba całkowita) |

## Dane

### Migracje

| Plik | Zmiana |
|---|---|
| `012_contract_types.sql` | tabela `contract_types`: `id INT UNSIGNED AUTO_INCREMENT`, `name VARCHAR(60) NOT NULL`, `position INT UNSIGNED NOT NULL`, `hidden_at DATETIME NULL`, `created_at`, `updated_at`; `UNIQUE KEY uq_contract_types_name (name)` (`utf8mb4_polish_ci` nie rozróżnia wielkości liter) |
| `013_contract_types_seed.sql` | cztery typy na start: 1 Umowa o pracę, 2 Umowa zlecenie, 3 Umowa o dzieło, 4 B2B (`position` 1–4) |
| `014_users_contract_type_id.sql` | `users.contract_type_id INT UNSIGNED NULL`, klucz obcy do `contract_types(id)` `ON DELETE RESTRICT` |
| `015_users_contract_type_copy.sql` | przepisanie dotychczasowych umów: `employment` → Umowa o pracę, `mandate` → Umowa zlecenie, `specific_work` → Umowa o dzieło, `b2b` → B2B (po nazwie z seedu) |
| `016_users_drop_contract_type.sql` | usunięcie starej kolumny `users.contract_type` (ENUM) |

### Relacje

| Rodzic | Dziecko (kolumna) | Przy usunięciu rodzica | Dlaczego |
|---|---|---|---|
| `contract_types` | `users.contract_type_id` | RESTRICT | typów się nie usuwa, tylko ukrywa; zabezpieczenie, żeby pracownik nie stracił umowy |

### Ukrywanie, nie usuwanie

Typów się nie usuwa (`IDEAS.md`). Ukrycie: `hidden_at = NOW()`. Przywrócenie: `hidden_at = NULL`,
`position = MAX(position) + 1`. Pracownik z ukrytym typem go zachowuje (1a).

### Historia zmian

Słownik typów umów jest poza zakresem historii (jak Typy urlopów). Zmiana umowy u pracownika jest w historii konta
(sekcja „Zmiany w module Pracownicy”).

## API

Moduł podpięty `mountModule(api, 'contract-types', contractTypesRoutes)` (rola `admin` z nawigacji).

| Metoda i adres | Kto | Dane wejściowe | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/contract-types` | admin | — | `{ items: ContractTypeItem[] }`: widoczne według `position`, potem ukryte według nazwy | — |
| `POST /api/contract-types` | admin | `contractTypeSchema` | `{ id }` 201 | 400 pola; 409 `fields.name` = `contract-types.server.name_taken` albo `contract-types.server.name_taken_hidden` (+ `hiddenType: { id, name }`) |
| `PUT /api/contract-types/:id` | admin | `contractTypeSchema` | `{ ok }` | 400; 404; 409 jak wyżej (pomija sam edytowany typ) |
| `POST /api/contract-types/:id/move` | admin | `{ direction: 'up' \| 'down' }` | `{ ok }` | 400; 404 brak albo ukryty; na brzegu listy nic się nie zmienia (200) |
| `POST /api/contract-types/:id/hide` | admin | — | `{ ok }` | 404; 409 `contract-types.server.already_hidden` |
| `POST /api/contract-types/:id/unhide` | admin | — | `{ ok }` | 404; 409 `contract-types.server.not_hidden` |
| `GET /api/employees/contract-types` | admin | — | `{ items: { id, name }[] }`: widoczne według `position` | — |

`ContractTypeItem`: `id, name, hidden (boolean), employeesCount`.

Zmiany w `/api/employees`: pole `contractTypeId` (liczba albo `null`) zastępuje `contractType`; element listy ma
`contractType: { id, name, hidden } | null`.

**Zasady serwera:**
- `position` liczy serwer: nowy i przywrócony typ na koniec; „move” zamienia `position` z sąsiednim widocznym typem
  w jednej transakcji (`withTransaction`).
- Niepowtarzalność nazwy: zapytanie przed zapisem (rozróżnia widoczny i ukryty) i unikalny indeks jako zabezpieczenie
  (`ER_DUP_ENTRY` → 409 `name_taken`).
- Zapis pracownika (`POST`/`PUT /api/employees`): `contractTypeId` musi wskazywać widoczny typ **albo** typ, który ten
  pracownik już ma (ukryty zostaje, 1a). Inaczej 400 `fields.contractTypeId` = `employees.server.contract_type_unavailable`
  („Tego typu umowy nie można już wybrać. Odśwież stronę.”). Nieistniejący numer → ten sam błąd.
- Numer z adresu tylko przez `idParam` (`routeHelpers.ts`).

Nowe wiersze w „Mapie dostępu” w `SPEC-GENERAL.md`: `/admin/contract-types`, `GET/POST /api/contract-types`,
`PUT /api/contract-types/:id`, `POST /api/contract-types/:id/move`, `/:id/hide`, `/:id/unhide` (admin) oraz
`GET /api/employees/contract-types` (admin). Każda trasa ma testy 401 i 403.

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| employees | lista do pola „Rodzaj umowy” (widoczne typy) | `listSelectableContractTypes()` w `contract-types.queries.ts` | `id, name` |
| employees | sprawdzenie typu przy zapisie pracownika | `findContractType(id)` (zwraca też `hidden`) | — |
| employees → contract-types | kolumna „Pracownicy” i liczba w oknach | `countEmployeesByContractType()` w `employees.queries.ts` | liczby |
| employees | nazwa typu na liście pracowników, także ukrytego | JOIN po `contract_type_id` w zapytaniu listy | `name`, `hidden` |

Front Pracowników nie importuje z folderu `contract-types`: ma własny hook do `GET /api/employees/contract-types`.
Stałe `CONTRACT_TYPES`, `CONTRACT_TYPE_LABELS` (`shared/src/constants/employees.ts`) i teksty
`employees.contract_types.*` znikają.

## Teksty

`shared/locales/pl/contract-types.json` (już z makiety): `title`, `summary`, `show_hidden`, kolumny `col_*`,
`hidden_badge`, `hidden_hint`, `employees_count_*`, `no_employees`, akcje (`edit`, `hide`, `unhide`, `move_up`,
`move_down`), okna (`edit_title`, `field_*`, `used_warning_*`, `hide_title`, `hide_text_*`), dymki (`added`, `saved`,
`hidden_done`, `unhidden_done`), `empty`, nowa sekcja `server` (`name_taken`, `name_taken_hidden`, `already_hidden`,
`not_hidden`). W `employees.json`: `hidden_suffix` („(ukryty)”), `contract_types_empty`, `server.contract_type_unavailable`.
Klucze `mockup_*` i `employee_*` zostają tylko dla makiety.

## Poza zakresem

- Usuwanie typów na stałe, historia zmian słownika typów.
- Inne ustawienia typu, np. „Daje prawo do urlopu” (4b): w razie potrzeby nowy pomysł w `docs/IDEAS.md`.
- Filtr listy pracowników po typie umowy.

# Spec: Typy urlopów

**Data:** 2026-11-16 · **Status:** do akceptacji
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-16: 1a, 2a, 3a, 4a, 5a, 6a, 7a, 8 ok), `SPEC-GENERAL.md`,
makieta `mockups/src/modules/leave-types/`

## Cel

Administrator prowadzi słownik typów urlopów: nazwa, czy typ odejmuje dni z puli i opcjonalny roczny limit dni na
osobę. Ustawia kolejność, w jakiej pracownik zobaczy typy w formularzu wniosku (moduł „Moje urlopy”). Typ, którego już
nie chce, ukrywa: znika z nowych wniosków, a złożone zostają bez zmian. Moduł działa, gdy administrator doda, zmieni,
przesunie, ukryje i przywróci typ, a lista zgadza się z makietą.

Moduł tylko **przechowuje** zasady typu. Liczenie dni i pilnowanie limitu przy składaniu wniosku robi „Moje urlopy”
(sekcja „Powiązania”).

## Ekrany

### Lista typów `/admin/leave-types` (admin)

Układ jak w makiecie (bez panelu pytań i paska „Pokaż stan”):
- Nagłówek „Typy urlopów”, pod nim „W formularzu wniosku: N. Ukryte: M.”.
- Po prawej: przełącznik „Pokaż ukryte (M)” (wyłączony po wejściu; nie ma go, gdy M = 0) i przycisk „Dodaj typ urlopu”.
- Tabela (komputer) / karty (telefon, `hiddenFrom="sm"`), kolumny: strzałki kolejności, Nazwa, Dni z puli (znacznik
  `navy` „odejmuje” / `gray` „nie odejmuje”), Limit w roku („4 dni na osobę” / szare „bez limitu”), Wnioski (liczba),
  akcje „Edytuj” i „Ukryj” (ukryty typ: „Przywróć”).
- Kolejność: widoczne według `position`, potem (przy „Pokaż ukryte”) ukryte alfabetycznie, przygaszone, ze
  znacznikiem „ukryty” i dopiskiem „Nie ma go w formularzu nowego wniosku”. Ukryte nie mają strzałek.
- Strzałki: „Przesuń wyżej” wyłączona przy pierwszym widocznym, „Przesuń niżej” przy ostatnim. Kliknięcie zamienia
  typ z sąsiadem i odświeża listę (bez dymka; zmianę widać od razu).
- „Ukryj” przy jedynym widocznym typie wyłączone, z dymkiem „To ostatni typ w formularzu wniosku. Najpierw dodaj
  albo przywróć inny.” **[decyzja AI]**
- „Przywróć” od razu przywraca typ (bez okna; łatwo odwrócić), dymek „Typ jest znowu w formularzu wniosku”. Typ trafia
  na koniec widocznych.
- Ładowanie i błąd przez `DataState`. Pustej listy w praktyce nie ma (migracja wpisuje 5 typów), ale `DataState` ma
  tekst „Nie ma jeszcze typów urlopów. Dodaj pierwszy.” z przyciskiem „Dodaj typ urlopu”.
- Pracownik nie ma tej pozycji w menu; wejście pod adres → ekran „brak dostępu” (jak w innych modułach admina).

### Okno „Dodaj typ urlopu” / „Edytuj typ „<nazwa>”” (admin)

- Pola: Nazwa (podpowiedź „Tak zobaczy ją pracownik w formularzu wniosku, np. Na żądanie”), przełącznik „Odejmuje dni
  z puli” (podpowiedź o puli, przy dodawaniu włączony), „Limit dni w roku” (`NumberInput`, przyrostek „ dni”,
  podpowiedź „Nieobowiązkowy…”; puste = bez limitu).
- Edycja typu, który jest w ≥ 1 wniosku: żółta ramka nad polami: „Ten typ jest w N wnioskach. Nowa nazwa pokaże się
  także w nich. Zmiana „Odejmuje dni z puli” i limitu dotyczy tylko nowych wniosków.” (pytanie 2a).
- Nazwa zajęta przez widoczny typ → pod polem „Typ o tej nazwie już jest.”; przez ukryty → „Typ „Szkoleniowy” już
  jest, ukryty. Przywróć go” (link przywraca ukryty typ, zamyka okno, dymek jak przy „Przywróć”).
- „Zapisz” → dymek „Dodano typ urlopu” / „Zapisano zmiany”, okno się zamyka. Błąd serwera → `notify.error`.
- Nowy typ trafia na koniec widocznych.

### Okno „Ukryć typ „<nazwa>”?” (admin)

Tekst: „Zniknie z formularza nowego wniosku. N wniosków z tym typem zostaje bez zmian. Typ możesz później
przywrócić.” Przyciski „Anuluj” i „Ukryj” (`EyeOff`). Po ukryciu dymek „Typ ukryty”.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Typ urlopu | Nazwa | tak | 2–40 znaków | obcięte spacje; niepowtarzalna także wśród ukrytych, bez względu na wielkość liter (Na żądanie) | `personName(LEAVE_TYPE_NAME_MAX)` (2–max, puste → wymagane) |
| Typ urlopu | Odejmuje dni z puli | tak | tak / nie | przełącznik, przy dodawaniu włączony | `z.boolean()` |
| Typ urlopu | Limit dni w roku | nie | 1–365 | liczba całkowita; puste = `NULL` (bez limitu) | `optionalField(wholeNumber(1, 365))` |

`personName` ma nazwę od imion, ale robi dokładnie to, czego trzeba (2–max znaków, komunikaty `too_short`,
`too_long`, `required`); nie piszemy drugiego takiego pola. **[decyzja AI]**

## Dane

### Migracja `008_leave_types.sql`

`leave_types`: `id INT UNSIGNED AUTO_INCREMENT`, `name VARCHAR(40) NOT NULL`, `deducts_pool BOOLEAN NOT NULL DEFAULT
TRUE`, `yearly_limit SMALLINT UNSIGNED NULL`, `position INT UNSIGNED NOT NULL`, `hidden_at DATETIME NULL`,
`created_at`, `updated_at`; `UNIQUE KEY uq_leave_types_name (name)`. Porównanie `utf8mb4_polish_ci` nie rozróżnia
wielkości liter, więc indeks pilnuje też „szkoleniowy” = „Szkoleniowy”. Kolumna `position` doszła względem zarysu
w `SPEC-GENERAL.md` (pytanie 5a).

Relacji w tym module nie ma. `leave_requests.leave_type_id → leave_types` z `ON DELETE RESTRICT` doda „Moje urlopy”
(już ustalone w `SPEC-GENERAL.md`).

### Migracja `009_leave_types_seed.sql` (dane na start)

| position | name | deducts_pool | yearly_limit |
|---|---|---|---|
| 1 | Wypoczynkowy | TRUE | NULL |
| 2 | Na żądanie | TRUE | 4 |
| 3 | Okolicznościowy | FALSE | NULL |
| 4 | Bezpłatny | FALSE | NULL |
| 5 | Opieka nad dzieckiem | FALSE | 2 |

To propozycja, nie pełna lista: administrator zmienia ją na ekranie. **[decyzja AI]** (limity jak w Kodeksie pracy:
4 dni na żądanie, 2 dni opieki).

### Ukrywanie, nie usuwanie

Typów się nie usuwa (pytanie 4a, `SPEC-GENERAL.md`). Ukrycie: `hidden_at = NOW()`. Przywrócenie: `hidden_at = NULL`,
`position = MAX(position) + 1`. Zawsze zostaje co najmniej jeden widoczny typ.

### Historia zmian

Typy urlopów są poza zakresem historii w `SPEC-GENERAL.md`: brak wpisów. **[decyzja AI]** Gdyby miały być, to
zmiana zakresu w specu ogólnym.

## API

Moduł podpięty `mountModule(api, 'leave-types', leaveTypesRoutes)` (rola `admin` z nawigacji).

| Metoda i adres | Kto | Dane wejściowe | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/leave-types` | admin | — | `{ items: LeaveTypeItem[] }`: widoczne według `position`, potem ukryte według nazwy | — |
| `POST /api/leave-types` | admin | `leaveTypeSchema` | `{ id }` 201 | 400 pola; 409 `fields.name` = `leave-types.server.name_taken` albo `leave-types.server.name_taken_hidden` (+ `hiddenType: { id, name }`) |
| `PUT /api/leave-types/:id` | admin | `leaveTypeSchema` | `{ ok }` | 400; 404; 409 jak wyżej (pomija sam edytowany typ) |
| `POST /api/leave-types/:id/move` | admin | `leaveTypeMoveSchema`: `{ direction: 'up' \| 'down' }` | `{ ok }` | 400; 404 brak albo ukryty; na brzegu listy nic się nie zmienia (200) |
| `POST /api/leave-types/:id/hide` | admin | — | `{ ok }` | 404; 409 `leave-types.server.already_hidden`; 409 `leave-types.server.last_visible` |
| `POST /api/leave-types/:id/unhide` | admin | — | `{ ok }` | 404; 409 `leave-types.server.not_hidden` |

`LeaveTypeItem`: `id, name, deductsPool, yearlyLimit (number | null), hidden (boolean), requestsCount`.

**Zasady serwera** (wartości z serwera, nie z żądania):
- `position` liczy serwer: nowy i przywrócony typ na koniec; „move” zamienia `position` z sąsiednim widocznym typem
  w jednej transakcji (`withTransaction`).
- Niepowtarzalność nazwy: zapytanie przed zapisem (żeby rozróżnić widoczny i ukryty) i unikalny indeks jako
  zabezpieczenie (`ER_DUP_ENTRY` → 409 `name_taken`).
- „Ostatni widoczny”: sprawdzenie i ukrycie w jednej transakcji z `SELECT … FOR UPDATE` na widocznych, żeby dwa
  równoczesne „Ukryj” nie schowały wszystkich.
- Numer z adresu: dodatnia liczba całkowita, inaczej 404 (pomocnik `idParam` przeniesiony z modułu Pracownicy do
  wspólnego `backend/src/middleware/routeHelpers.ts` razem z `reply`; Pracownicy przechodzą na wspólny).

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| my-leave | formularz wniosku pracownika: lista widocznych typów w kolejności `position` | `listSelectableLeaveTypes()` w `leave-types.queries.ts` | `id, name, deductsPool, yearlyLimit` |
| my-leave | przy składaniu wniosku: zasady wybranego typu (tylko widoczny) | `findSelectableLeaveType(id)` | jak wyżej |
| my-leave → leave-types | kolumna „Wnioski” i liczba w oknach (pytanie 7a) | `countRequestsByLeaveType()` doda „Moje urlopy” | liczby |
| leave-requests, my-leave | nazwa typu przy wniosku, także ukrytego | JOIN po `leave_type_id` w ich zapytaniach list (sama nazwa) | `name` |

Do czasu modułu „Moje urlopy” tabeli wniosków nie ma, więc `requestsCount` = 0 i okno edycji nie pokazuje żółtej
ramki. Plan „Moich urlopów” ma krok: `countRequestsByLeaveType()` + podpięcie w `GET /api/leave-types` z testem.

Zasady dla „Moich urlopów” (zapisane tu, bo wynikają z odpowiedzi w tym module):
- Seed testów w przeglądarce usuwa typy `E2E %` (`removeTemporaryData` w `backend/src/scripts/seedE2e.ts`). Gdy powstanie `leave_requests` z `ON DELETE RESTRICT`, seed musi najpierw usunąć wnioski z tymi typami (albo testy nie składają wniosków na typy `E2E`).
- Limit w roku (1a): osobno dla każdej osoby, w dniach roboczych, w roku kalendarzowym; wliczają się wnioski
  czekające i zatwierdzone tego typu.
- Zmiana „Odejmuje dni z puli” i limitu (2a) dotyczy tylko nowych wniosków: złożony wniosek ma już zapisane
  `days_from_carried` / `days_from_annual` i nie jest przeliczany.

## Teksty

`shared/locales/pl/leave-types.json` (już z makiety): `title`, `summary`, `show_hidden`, kolumny `col_*`,
`deducts_yes/no`, `hidden_badge`, `hidden_hint`, `limit_days_*`, `no_limit`, `requests_count_*`, akcje (`edit`,
`hide`, `unhide`, `move_up`, `move_down`), okna (`edit_title`, `field_*`, `used_warning_*`, `hide_title`,
`hide_text_*`, `hide_last`), dymki (`added`, `saved`, `hidden_done`, `unhidden_done`), `empty`, sekcja `server`
(`name_taken`, `name_taken_hidden`, `last_visible`, `already_hidden`, `not_hidden`). Klucze `mockup_*` zostają tylko
dla makiety.

## Poza zakresem

- Usuwanie typów na stałe (4b), opis typu dla pracownika (6b), historia zmian typów.
- Inne właściwości typu (kolor w kalendarzu, wymagany załącznik): w razie potrzeby nowy pomysł w `docs/IDEAS.md`.
- Liczenie dni i pilnowanie limitu przy wniosku: moduł „Moje urlopy”.

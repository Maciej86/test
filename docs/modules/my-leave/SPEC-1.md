# Spec: Moje urlopy, część 1: Wnioski i pula

**Data:** 2026-11-17 · **Status:** zaakceptowany przez użytkownika 2026-11-17
**Podstawa:** `SPEC.md` (ogólny, zasady obu części), `QUESTIONS.md` (1a–9a, zasady pól ok), makieta
`mockups/src/modules/my-leave/`

## Cel

Pracownik widzi swoją pulę i limity, składa wniosek z podglądem dni, przegląda swoje wnioski po latach i wycofuje
czekający. Administrator dostaje powiadomienie i e-mail; „Pracownicy” i „Typy urlopów” pokazują prawdziwe liczby
zamiast zer. Bez przycisku „PDF” (część 2).

## Ekrany

### „Moje urlopy” `/admin/my-leave` (employee)

Układ jak w makiecie (bez paska „Pokaż stan”):
- `PageHeader`: tytuł „Moje urlopy”, pod nim „Składasz tu wnioski urlopowe i sprawdzasz, ile dni Ci zostało.”, po
  prawej „Złóż wniosek” (główny, ikona `add`).
- Siatka `Grid` (komputer 8 + 4, telefon jedna kolumna):
  - **„Urlop w <rok otwarty>”** (`InfoCard`, wzorzec „Karta z liczbą”): duża liczba = zostało (pula + zaległe −
    zatwierdzone − czekające; 0 na czerwono), obok „dni do wykorzystania (z <pula + zaległe>)”; pasek z czterech
    części (wykorzystane `dark.4`, czeka na decyzję `yellow.6`, zostało z zaległego `navy.3`, zostało z puli rocznej
    `navy.6`) z legendą liczb; pod spodem „Pula na rok: 26 dni, zaległy urlop z 2025: 4 dni. Zaległy urlop schodzi
    pierwszy.”
  - **„Limity w <rok>”**: każdy widoczny typ z limitem: nazwa, „1 z 4 dni”, cienki pasek; dopisek „Liczą się wnioski
    zatwierdzone i czekające na decyzję.” Brak typów z limitem → boksu nie ma, a karta puli zajmuje całą szerokość.
- „Moje wnioski” (nagłówek) i po prawej wybór roku (`Select`): lata, w których osoba ma wnioski, plus rok otwarty;
  domyślnie rok otwarty; rok siedzi w adresie (`?year=2025`), więc odświeżenie pokazuje ten sam widok.
- Tabela (komputer) / karty (telefon, `hiddenFrom="sm"`). Kolumny: Termin (pogrubiony, jeden dzień bez „–”; pod spodem
  komentarz przygaszony, 2 linie), Typ urlopu, Dni robocze (liczba; pod spodem „4 z zaległego, 2 z puli 2026” albo
  „nie odejmuje z puli”; przy odrzuconym, wycofanym i anulowanym „nie liczą się do puli”), Status (znacznik w kolorach
  z `DESIGN.md`, pod spodem „Anna Nowak, 02.06.2026” przy decyzji i powód w cudzysłowie), Złożony (data), akcja
  „Wycofaj” (`subtle`, czerwony, ikona `cancel`) tylko przy „Czeka na decyzję”.
- Kolejność: czekające na górze, potem od najnowszego terminu. Bez stronicowania **[decyzja AI]**: osoba ma kilkanaście
  wniosków w roku.
- Pusty rok: `DataState` z ikoną, „W tym roku nie masz jeszcze wniosków. Złóż pierwszy, gdy zaplanujesz urlop.”
  i przyciskiem „Złóż wniosek”.

### Okno „Złóż wniosek” (`Modal size="lg"`)

- Typ urlopu (`Select`, widoczne typy w kolejności, domyślnie pierwszy); pod polem „Odejmuje dni z puli” / „Nie
  odejmuje dni z puli”, a przy limicie „, w 2026 wykorzystano 1 z 4 dni”.
- Od, Do (`DateField`, dwie kolumny, na telefonie jedna pod drugą). Kalendarz nie pozwala wybrać dnia przed dziś;
  „Do” nie wcześniej niż „Od”. Wybranie „Od” późniejszego niż „Do” (albo puste „Do”) ustawia „Do” = „Od”.
- Pasek dni terminu (do 45 dni): dzień roboczy jasny, weekend i święto przekreślone, w dymku nazwa święta.
- Ramka z wynikiem, liczona na bieżąco z danych ekranu (`countWorkingDays`, pula, limity, własne wnioski):
  „7 dni roboczych” + „7 z puli na 2026. Po zatwierdzeniu zostanie Ci 12.” (typ bez odejmowania: „Ten typ nie odejmuje
  dni z puli.”), albo czerwona ramka z powodem i radą: brak dni roboczych, za mało dni, limit typu, termin zajęty
  (z datami tamtego wniosku), żółta: przyszły rok / rok zamknięty. „Złóż wniosek” wyłączony, dopóki ramka nie jest
  niebieska.
- Komentarz dla administratora (`Textarea`, nieobowiązkowy, do 500 znaków, podpowiedź „Nieobowiązkowy, np. powód
  albo kontakt w razie pilnej sprawy.”).
- Przyciski: „Anuluj” (`default`, `cancel`) i „Złóż wniosek” (główny, ikona `send`). Po zapisie: zamknięcie, dymek
  „Wniosek złożony. Administrator dostał powiadomienie.”, odświeżenie puli i listy (rok wniosku).
- Błąd z serwera (np. ktoś złożył drugi wniosek w innej karcie): przy polu albo w ramce okna, okno zostaje otwarte.

### Okno „Wycofać wniosek?”

`ConfirmModal` (z `common/`): „Wypoczynkowy, 26.11.2026 – 27.11.2026 (2 dni robocze).” i „Administrator nie będzie go
już rozpatrywał, a 2 zarezerwowane dni wrócą do puli. Wycofanego wniosku nie da się przywrócić.” (typ bez
odejmowania: bez zdania o puli). Przyciski „Zostaw” i „Wycofaj” (czerwony). Dymek „Wniosek wycofany. Dni wróciły do
puli.” (bez zdania o puli, gdy typ nie odejmuje). Błąd zostawia okno otwarte.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Wniosek | Typ urlopu | tak | widoczny typ | numer typu | `z.number().int().positive()` (istnienie i widoczność sprawdza serwer) |
| Wniosek | Od | tak | najwcześniej dziś (serwer) | RRRR-MM-DD (21.12.2026 na ekranie) | `isoDate` |
| Wniosek | Do | tak | ≥ Od, ten sam rok co Od | RRRR-MM-DD | `isoDate` + `refine` w schemacie |
| Wniosek | Komentarz | nie | 0–500 znaków | tekst | `optionalField(text(LEAVE_REQUEST_COMMENT_MAX))` |

„Od” przed dziś sprawdza serwer (dziś według `todayIsoDate()` serwera), błąd przy polu `dateFrom`
(`my-leave.validation.past_date`). Kolejność dat i ten sam rok sprawdza schemat (front i serwer), błąd przy `dateTo`.

## Dane

### Migracja `017_leave_requests.sql`

| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` | |
| `user_id` | `INT UNSIGNED NOT NULL` | FK `users`, `ON DELETE RESTRICT` |
| `leave_type_id` | `INT UNSIGNED NOT NULL` | FK `leave_types`, `ON DELETE RESTRICT` |
| `date_from`, `date_to` | `DATE NOT NULL` | |
| `working_days` | `SMALLINT UNSIGNED NOT NULL` | liczy serwer |
| `days_from_carried`, `days_from_annual` | `SMALLINT UNSIGNED NOT NULL DEFAULT 0` | liczy serwer; typ bez odejmowania: 0 i 0 |
| `pool_year` | `SMALLINT UNSIGNED NOT NULL` | rok otwarty osoby w chwili złożenia |
| `comment` | `VARCHAR(500) NULL` | |
| `status` | `ENUM('pending','approved','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'pending'` | |
| `reject_reason` | `VARCHAR(500) NULL` | moduł 9 |
| `decided_by` | `INT UNSIGNED NULL` | FK `users`, `ON DELETE SET NULL`; moduł 9 |
| `decided_by_name` | `VARCHAR(141) NULL` | kopia imienia i nazwiska |
| `decided_at` | `DATETIME NULL` | |
| `created_at`, `updated_at` | jak w `CONVENTIONS.md` | |

Indeksy: (`user_id`, `pool_year`), (`user_id`, `date_from`), (`leave_type_id`), (`status`). Testy: usunięcie
użytkownika z wnioskiem → błąd (RESTRICT); usunięcie typu z wnioskiem → błąd; usunięcie osoby z `decided_by` → NULL.

Dane testowe przeglądarki (`backend/src/scripts/seedE2e.ts`): przed usunięciem kont `E2E%` i typów `E2E %` usuwa ich
wnioski; przed testami czyści wnioski konta e2e pracownika.

### Historia zmian

| Zdarzenie | `entityType` | `action` | Zmiany |
|---|---|---|---|
| złożenie | `leave_requests` | `create` | typ, daty, dni robocze, podział |
| wycofanie | `leave_requests` | `status` | `status`: pending → withdrawn |

## API

Moduł `mountModule(api, 'my-leave', myLeaveRoutes)` (rola z nawigacji: `employee`). Każde zapytanie z `req.user.id`.

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/my-leave/overview` | employee | — | `MyLeaveOverview` | 404, gdy osoba nie ma puli otwartej |
| `GET /api/my-leave/requests?year=2026` | employee | `myLeaveRequestsQuerySchema` (`year` 2000–2100, domyślnie rok otwarty) | `{ year, items: MyLeaveRequest[] }` | 400 |
| `POST /api/my-leave/requests` | employee | `leaveRequestSchema` | 201 `MyLeaveRequest` | 400 (pola, `past_date`, typ ukryty lub brak → pole `leaveTypeId`); 409 `no_working_days`, `pool_not_ready`, `year_closed`, `overlap`, `not_enough_days`, `limit_exceeded` |
| `POST /api/my-leave/requests/:id/withdraw` | employee | — | `{ ok }` | 404 (cudzy albo brak); 409 `not_pending` |

- `MyLeaveOverview`: `{ pool: { year, annualDays, carriedDays, usedCarried, usedAnnual, pendingDays, leftDays,
  leftCarriedDays }, types: [{ id, name, deductsPool, yearlyLimit, usedOfLimit }], years: number[],
  busy: [{ dateFrom, dateTo }] }` (`busy` = własne wnioski czekające i zatwierdzone roku otwartego, do podglądu
  „termin zajęty” na ekranie).
- `MyLeaveRequest`: `{ id, leaveTypeName, dateFrom, dateTo, workingDays, daysFromCarried, daysFromAnnual, poolYear,
  comment, status, rejectReason, decidedByName, decidedAt, createdAt }`.
- Błąd 409 niesie dane do komunikatu (`fail(409, klucz, { left, pending, limit, used, year, … })`).
- Wartości liczone przez serwer: `working_days`, `days_from_carried`, `days_from_annual`, `pool_year`, `status`,
  `user_id` (z `req.user`), daty utworzenia.

Dopisać do „Mapy dostępu” w `SPEC-GENERAL.md` (wiersz z trasami, `mountModule(api, 'my-leave', …)`, tylko własne).

## Zmiany w zrobionych modułach (z testem)

- **Pracownicy:** `getPoolUsage` liczy z wniosków (`sumPoolUsage`: zatwierdzone i czekające dni oraz zatwierdzone dni
  z zaległego, z zapisanych kolumn); `toPool` bierze „zostało z zaległego” z tych kolumn zamiast `min(used, carried)`;
  nowa `getOpenPool`. „Zamknij rok”: `pendingRequests` = liczba czekających wniosków zamykanego roku; gdy > 0, żółta
  ramka „Najpierw rozpatrz <N> wniosków czekających na decyzję. Wtedy zamkniesz rok.” (zamiast obecnego tekstu
  `close_year_pending`), przycisk „Zamknij rok” wyłączony, a `POST /api/employees/close-year` → 409
  `employees.pending_requests` (sprawdzenie w transakcji). Testy: zamknięcie z czekającym wnioskiem → 409; po
  wycofaniu → zamyka.
- **Typy urlopów:** `requestsCount` z `countRequestsByLeaveType()` (kolumna „Wnioski”, żółta ramka w oknie edycji).
- Ekrany tych modułów pokazują liczby, które dotąd były zerami. Jedyna zmiana wyglądu to tekst ramki i wyłączony
  przycisk w „Zamknij rok”: także w makiecie Pracowników (`EmployeeModals.tsx`).

## Teksty

`shared/locales/pl/my-leave.json` (już z makiety): `title`, `summary`, `new_request`, `pool_*`, `legend_*`, `limits_*`,
`history`, `year`, `col_*`, `days_*`, `split_*`, `status.*`, `withdraw*`, `empty`, `field_*`, `type_*`,
`error_order`, `strip_*`, `check_*`, `submitted`, `keep`; nowe: sekcje `server` (`no_pool`, `no_working_days`,
`pool_not_ready`, `year_closed`, `overlap`, `not_enough_days`, `limit_exceeded`, `not_pending`) i `validation`
(`past_date`, `dates_order`, `same_year`). Klucze `mockup_*` i `print_*` zostają dla makiety (`print_*` użyje część 2).

## Poza zakresem części 1

Przycisk „PDF” i trasa PDF (część 2). Reszta jak w `SPEC.md`, „Poza zakresem”.

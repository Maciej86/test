# Spec: Pracownicy

**Data:** 2026-11-15 · **Status:** do akceptacji
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-15: wszystkie polecane, zasady pól „ok”, zmiana okna „Zamknij rok”),
`SPEC-GENERAL.md`, makieta `mockups/src/modules/employees/`

## Cel

Administrator zakłada i prowadzi konta osób w firmie: dane, rola, hasło tymczasowe i pula dni urlopu na rok. Raz
w roku przyciskiem „Zamknij rok” przenosi niewykorzystane dni na następny rok jako zaległy urlop i ustala nowe pule.
Konto osoby, która odeszła, przenosi do archiwum (logowanie przestaje działać od razu, dane zostają). Moduł tworzy
tabelę `leave_pools`, z której korzystają urlopy.

Moduł działa, gdy: administrator dodaje pracownika z hasłem tymczasowym i pulą 26 dni, a ten loguje się i musi
ustawić własne hasło; „Ustaw hasło” daje nowe hasło tymczasowe; zmiana roli działa od następnego kliknięcia tej
osoby; „Zamknij rok 2026” tworzy pule na 2027 z zaległymi dniami; konto w archiwum nie może się zalogować; login
zajęty przez konto w archiwum podpowiada przywrócenie.

## Ekrany

### Lista pracowników `/admin/employees` (admin)

Układ z makiety (`EmployeesMockup.tsx`, bez paska „Pokaż stan”):
- Nagłówek „Pracownicy”, pod nim „Osób z kontem: 6, w tym administratorów: 1” (tylko konta spoza archiwum).
  Po prawej „Zamknij rok 2026” (`default`, ikona `CalendarCheck`) i „Dodaj pracownika” (główny, `Plus`).
- Pod nagłówkiem: wyszukiwarka (imię, nazwisko, login), filtr roli („Wszystkie role”, Pracownik, Administrator),
  kolejność („Nazwisko A–Z”, „Najmniej dni zostało”), po prawej legenda kolorów paska. Wszystko w adresie
  (`?search=…&role=…&sort=…&dir=…&page=…`).
- Tabela (komputer): Pracownik (imię i nazwisko pogrubione, „(to Ty)” przy własnym koncie, pod spodem login),
  Rola (znacznik: Administrator `navy`, Pracownik `gray`), Zatrudniony od (`DateText`), Umowa („brak” przygaszone; zmiana 2026-11-16), „Urlop w 2026” (pasek puli), E-mail do powiadomień
  („brak” przygaszone), akcje: Edytuj, Ustaw hasło, Do archiwum (czerwone; przy własnym koncie wyłączone z dymkiem
  „Własnego konta nie przeniesiesz do archiwum.”).
- Telefon (poniżej `sm`): karty z tymi samymi danymi i przyciskami.
- **Pasek puli:** duża liczba „zostało”, obok „z 30 dni zostało” (0 → czerwone „0 pula wykorzystana”), pasek z trzech
  części: wykorzystane (`dark.4`), zostało z zaległych (`navy.3`), zostało z puli rocznej (`navy.6`); pod spodem
  dopisek „w tym 3 dni zaległe, 2 dni czekają na decyzję” (części tylko gdy > 0, odmiana liczebników). Zaległe
  schodzą pierwsze. Odejmują tylko zatwierdzone wnioski; czekające są tylko w dopisku (pytanie 1). Administrator:
  „nie dotyczy” z dymkiem „Administrator nie składa wniosków urlopowych.”
- Rok w nagłówku kolumny i w przycisku = **rok otwarty** (patrz „Dane”).
- Pusto (są tylko konta administratorów): pod tabelą ramka z ikoną, „Nie masz jeszcze pracowników”, zdanie
  zachęty i „Dodaj pracownika”. Brak wyników: „Nikt nie pasuje do „…”…” i „Wyczyść wyszukiwanie”.
- Ładowanie i błąd przez `DataState`. Stronicowanie `Pagination`, gdy osób jest więcej niż `PAGE_SIZE`.

### Okno „Dodaj pracownika” / „Edytuj: <imię>” (admin)

Pola (zasady w „Pola formularzy”): Imię i Nazwisko (dwa pola obok siebie, na telefonie jedno pod drugim; zmiana 2026-11-15), Login (podpowiedź), E-mail do powiadomień (podpowiedź), Rola,
Data zatrudnienia i Rodzaj umowy (dwa pola obok siebie, oba nieobowiązkowe; zmiana 2026-11-16)
(domyślnie Pracownik), przy dodawaniu Hasło tymczasowe z przyciskiem „Wygeneruj” (pokazuje wygenerowane hasło
jawnie, pytanie 5). Przy roli Pracownik sekcja „Pula urlopu na 2026”: Dni na rok (domyślnie 26), Zaległe z 2025
(domyślnie 0); przy roli Administrator sekcja znika (pula w bazie zostaje). Własna rola: pole wyłączone z opisem
„Własnej roli nie zmienisz.” (pytanie 6).
- Błędy pod polami. Login zajęty przez konto w archiwum: „Ten login ma konto w archiwum: Ewa Mazur.” i link
  „Przywróć konto zamiast zakładać nowe” (okno potwierdzenia, potem przywrócenie, dymek, zamknięcie okna). Login
  zajęty przez aktywne konto: „Ten login ma już inne konto.” E-mail tak samo (bez linku przy aktywnym).
- Po zapisie dymek „Dodano pracownika. Przekaż mu login i hasło tymczasowe.” / „Zapisano dane pracownika.”

### Okno „Nowe hasło: <imię>” (admin)

Tekst „Stare hasło przestanie działać od razu. Przy następnym logowaniu <imię> ustawi własne hasło.”, pole „Hasło
tymczasowe” z „Wygeneruj”, przyciski Anuluj / „Ustaw hasło” (`KeyRound`). Hasło staje się tymczasowe
(`must_change_password = 1`); osoba zalogowana przy następnym kliknięciu trafia na „Ustaw własne hasło” (działa już
z Logowania). Także dla własnego konta (wtedy administrator sam ustawia potem nowe). **[decyzja AI]**

### Okno „Zamknij rok 2026” (admin)

Tekst: „Niewykorzystane dni z 2026 przejdą na 2027 jako zaległy urlop i dodadzą się do nowej puli. Sprawdź pule na
2027 i zatwierdź. Zamknięcia nie da się cofnąć; pojedyncze pule poprawisz potem w „Edytuj”.” (pytanie 4). Żółta
ramka, gdy są wnioski czekające (od modułu „Moje urlopy”). Tabela pracowników z pulą w roku otwartym: Pracownik,
Zostało w 2026, Pula na 2027 (pole liczby, podpowiedź = pula z 2026, pytanie 3), **Razem w 2027** (zostało + pula,
liczone na bieżąco; uwaga użytkownika). Przyciski Anuluj / „Zamknij rok 2026”. Dymek „Zamknięto rok 2026. Pule na
2027 są gotowe.” Przycisk na liście jest wyłączony, gdy rok otwarty jest późniejszy niż bieżący rok kalendarzowy,
z dymkiem „Rok 2027 zamkniesz w 2027.” (patrz „Zasady serwera”).

### Okno „Przenieść do archiwum: <imię>?” (admin)

Lista: „Konto przestanie działać od razu, także jeśli ta osoba jest teraz zalogowana.”, „Wnioski urlopowe, pule dni
i historia zmian zostają.”, a gdy są: „Wnioski czekające na decyzję (2) zostaną wycofane.” (dopisze moduł „Moje
urlopy”), „Przy zadaniach (3) zostanie z dopiskiem „zarchiwizowany”.” (dopisze moduł „Zadania”). Pod spodem „Konto
przywrócisz w „Archiwum”.” Przyciski Anuluj / „Do archiwum” (czerwony). Dymek „Przeniesiono do archiwum.”

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Pracownik | Imię | tak | 2–60 znaków | — | `text(FIRST_NAME_MAX)` + min 2 |
| Pracownik | Nazwisko | tak | 2–80 znaków | np. `Nowak-Kowalska` | `text(LAST_NAME_MAX)` + min 2 |
| Pracownik | Login | tak | 3–190 znaków | bez spacji, małe litery, `jan.kowalski@firma.pl` | `login` |
| Pracownik | E-mail do powiadomień | nie | do 190 znaków | `jan.kowalski@gmail.com` | `optionalField(email)` |
| Pracownik | Rola | tak | `admin` / `employee` | domyślnie `employee` | `z.enum(ROLES)` |
| Pracownik | Data zatrudnienia | nie | istniejący dzień | kalendarz albo wpisane `01.03.2024`, zapis `RRRR-MM-DD` | `optionalField(isoDate)` (nowe) |
| Pracownik | Rodzaj umowy | nie | `employment` / `mandate` / `specific_work` / `b2b` | Umowa o pracę, Umowa zlecenie, Umowa o dzieło, B2B | `optionalField(z.enum(CONTRACT_TYPES))` |
| Pracownik (dodawanie) | Hasło tymczasowe | tak | 8–72 znaki | cyfra i znak specjalny | `newPassword` |
| Pracownik (rola Pracownik) | Dni na rok | tak | 0–60 | liczba całkowita, domyślnie 26 | `wholeNumber(0, 60)` (nowe) |
| Pracownik (rola Pracownik) | Zaległe | tak | 0–999 | liczba całkowita, domyślnie 0 | `wholeNumber(0, CARRIED_DAYS_MAX)` (nowe) |
| Nowe hasło | Hasło tymczasowe | tak | 8–72 znaki | cyfra i znak specjalny | `newPassword` |
| Zamknij rok | Pula na nowy rok (każda osoba) | tak | 0–60 | liczba całkowita | `wholeNumber(0, 60)` |

**[decyzja AI]** Zaległe do 999 (po przeglądzie kodu; wcześniej 120), nie do 60: po „Zamknij rok” zaległe mogą przekroczyć 60 (stare zaległe + niewykorzystana
pula), a „Zamknij rok” przenosi wszystkie dni bez limitu, więc po kilku latach zaległe przekraczają też 120; okno „Edytuj” musi dać się wtedy zapisać. Przy roli Administrator ukryte pola puli nie są sprawdzane. Pule są wymagane tylko przy roli Pracownik (schemat z `refine`).
Nowe pole `wholeNumber(min, max)` w `fields.ts` (z testem i kluczami `validation.whole_number`, `validation.range`).

## Dane

### Imię i nazwisko osobno (zmiana 2026-11-15, prośba użytkownika na etapie testów)

- `004_users_first_last_name.sql`: kolumny `first_name VARCHAR(60) NOT NULL DEFAULT ''`, `last_name VARCHAR(80) NOT NULL DEFAULT ''`.
- `005_users_split_name.sql`: istniejące konta: ostatni wyraz `name` → `last_name`, reszta → `first_name` (jeden wyraz → całość do nazwiska).
- `006_users_name_generated.sql`: `name` = kolumna wyliczana przez bazę `CONCAT_WS(' ', first_name, last_name)` (STORED), więc belka, historia zmian i logowanie dalej czytają `name`.
- Lista pokazuje „Imię Nazwisko”; sortowanie „Nazwisko A–Z” po `last_name`, potem `first_name`; wyszukiwanie po imieniu, nazwisku i loginie.
- `npm run admin` (moduł Logowanie) pyta osobno o imię i nazwisko; konta testowe e2e też zapisują oba pola.
- Historia zmian zapisuje `first_name` i `last_name` zamiast `name`.

### Data zatrudnienia i rodzaj umowy (zmiana 2026-11-16, prośba użytkownika)

- `011_users_employment.sql`: `users.hired_on DATE NULL`, `users.contract_type ENUM('employment','mandate','specific_work','b2b') NULL`.
- Oba pola nieobowiązkowe (obecne konta mają je puste), także dla administratora. Lista ma kolumny „Zatrudniony od” i „Umowa”
  (na telefonie jedna linijka w karcie).
- Pole daty: wspólne `DateField` (`common/`, Mantine `DateInput`, format `DD.MM.RRRR`, wpisaną datę czyta `parseTypedDate`).
- Historia zmian zapisuje `hired_on` i `contract_type` razem z innymi polami konta.

### Migracja `003_leave_pools.sql`

| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` | |
| `user_id` | `INT UNSIGNED NOT NULL` | FK `users.id` `ON DELETE CASCADE` (spec ogólny) |
| `year` | `SMALLINT UNSIGNED NOT NULL` | |
| `annual_days` | `SMALLINT UNSIGNED NOT NULL` | |
| `carried_days` | `SMALLINT UNSIGNED NOT NULL DEFAULT 0` | |
| `closed_at` | `DATETIME NULL` | ustawiane przy „Zamknij rok” |
| `created_at`, `updated_at` | | jak w zasadach |

Unikalne (`user_id`, `year`), indeks `year`. Test: usunięcie użytkownika usuwa jego pule (CASCADE).

### Rok otwarty

Najmniejszy `year` z `leave_pools` bez `closed_at`; gdy tabela jest pusta, bieżący rok kalendarzowy (strefa
`APP_TIME_ZONE`). Nowy pracownik i zmiana roli na Pracownik dostają pulę na rok otwarty. **[decyzja AI]**

### Zamknij rok Y (rok otwarty)

W jednej transakcji, dla **każdej** osoby z pulą na Y (także w archiwum, żeby po przywróceniu miała pulę): zostało =
`annual + carried − wykorzystane` (wykorzystane z funkcji modułu „Moje urlopy”, do tego czasu 0), pula Y dostaje
`closed_at`, powstaje pula Y+1: `carried_days` = zostało (pytanie 2: wszystkie niewykorzystane, także stare
zaległe), `annual_days` = liczba z okna (osoby w archiwum i osoby pominięte w żądaniu: pula z Y). Wpis w historii
dla każdej osoby (`leave_pools`, akcja `update`, zmiany „closed”, „carried_days”, „annual_days”).

### Wykorzystane i czekające dni

Ten moduł nie ma jeszcze wniosków: `getPoolUsage(userIds, year)` w `employees.service.ts` zwraca na razie 0
wykorzystanych i 0 czekających. Moduł „Moje urlopy” podmieni ją na liczenie z `leave_requests` (osobny krok jego
planu, z testem). **[decyzja AI]**

### Archiwum

`POST /:id/archive` ustawia `archived_at`, `archived_by` (konto przestaje działać od razu, bo `authenticate` czyta
bazę). `POST /:id/restore` zeruje oba. Własnego konta nie da się zarchiwizować (409). Moduł „Archiwum” pokaże listę
i użyje tej samej trasy przywracania; usuwanie na stałe zrobi moduł „Archiwum”. **[decyzja AI]** Trasa przywracania
jest tutaj, bo potrzebuje jej link „Przywróć konto zamiast zakładać nowe”.

### Historia zmian (w tej samej transakcji co zmiana)

| Zdarzenie | `entityType` | `action` | Zmiany |
|---|---|---|---|
| dodanie pracownika | `users` | `create` | first_name, last_name, login, email, role, hired_on, contract_type (bez hasła) |
| edycja danych, zmiana roli | `users` | `update` | `diffChanges` tylko zmienionych pól |
| zmiana puli w „Edytuj” | `leave_pools` | `update` / `create` | annual_days, carried_days, year |
| ustawienie hasła | `users` | `update` | `password: { before: null, after: 'reset' }` (bez hasła) **[decyzja AI]** |
| zamknięcie roku | `leave_pools` | `update` | jak wyżej |
| archiwizacja / przywrócenie | `users` | `archive` / `restore` | — |

## API

Moduł podpięty `mountModule(api, 'employees', employeesRoutes)` (rola `admin` z nawigacji).

| Metoda i adres | Kto | Dane wejściowe | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/employees` | admin | `validateQuery(employeesListQuerySchema)`: `page`, `search`, `sort` (`name`, `days_left`), `dir`, `role` | `ListResponse<EmployeeListItem>` + `openYear`, `counts: { all, admins }` | 400 zły `sort` |
| `POST /api/employees` | admin | `employeeCreateSchema` | `{ id }` 201 | 400 pola; 409 `fields.login` = `employees.login_taken` / `employees.login_taken_archived` (+ `archivedUser: { id, name }`), tak samo `email` |
| `PUT /api/employees/:id` | admin | `employeeUpdateSchema` (bez hasła) | `{ ok }` | 400; 404 brak lub w archiwum; 409 login/e-mail; 409 `employees.own_role` przy zmianie własnej roli |
| `POST /api/employees/:id/password` | admin | `employeePasswordSchema` | `{ ok }` | 400; 404 |
| `POST /api/employees/:id/archive` | admin | — | `{ ok }` | 404; 409 `employees.archive_self`; 409 już w archiwum |
| `POST /api/employees/:id/restore` | admin | — | `{ ok }` | 404; 409 nie jest w archiwum |
| `GET /api/employees/close-year` | admin | — | `{ year, nextYear, canClose, pendingRequests, rows: [{ userId, name, left, annualDays }] }` | — |
| `POST /api/employees/close-year` | admin | `closeYearSchema`: `{ year, pools: [{ userId, annualDays }] }` | `{ ok }` | 400; 409 `employees.year_not_open` (rok inny niż otwarty, np. podwójne kliknięcie); 409 `employees.year_too_early` |

`EmployeeListItem`: `id, name, login, email, role, isMe, pool: { year, annualDays, carriedDays, usedDays,
pendingDays, leftDays, leftCarriedDays } | null` (null dla administratora).

**Zasady serwera** (wartości z serwera, nie z żądania):
- „kto” i „to Ty” z `req.user`; `must_change_password = 1` przy dodaniu i „Ustaw hasło”; skrót hasła `hashPassword`.
- Login i e-mail niepowtarzalne razem z archiwum (zapytanie przed zapisem + unikalny indeks jako zabezpieczenie,
  błąd `ER_DUP_ENTRY` → 409).
- Własnej roli nie zmienisz, własnego konta nie zarchiwizujesz (zawsze zostaje co najmniej jeden administrator).
- Pule z żądania tylko przy roli Pracownik; zapis do puli roku otwartego (`INSERT … ON DUPLICATE KEY UPDATE`).
- `left`, `carried` przy zamknięciu roku i rok otwarty liczy serwer.
- Zamknąć można rok otwarty Y tylko, gdy Y ≤ bieżący rok kalendarzowy (rok 2026 w dowolnym dniu 2026, pytanie 4;
  2027 dopiero w 2027). **[decyzja AI]** `canClose = false` wyłącza przycisk z dymkiem „Rok 2027 zamkniesz
  w 2027.”
- Sortowanie `name` po nazwisku (ostatni wyraz `name`), potem po imieniu; `days_left` po `annual + carried − used`,
  administratorzy na końcu. Szukanie `LIKE ?` po `name` i `login`. Tylko konta bez `archived_at`.

## Powiązania

| Z modułem | Co | Funkcja | Pola |
|---|---|---|---|
| my-leave | pula i dni do wniosku; liczenie wykorzystanych i czekających w pasku puli i przy „Zamknij rok”; wycofanie czekających wniosków przy archiwizacji (pytanie 7) | `getOpenYear()`, `getPool(userId, year)` (tu); `getPoolUsage` podmienia my-leave; hak archiwizacji dopisuje my-leave | liczby dni |
| tasks | lista osób do przypisania (tylko spoza archiwum), dopisek „zarchiwizowany”; liczba zadań w oknie archiwizacji | `listActiveUsers()` (tu) | id, imię i nazwisko |
| archive | lista kont w archiwum, przywracanie (ta sama logika co `POST /:id/restore`), usuwanie na stałe | `restoreEmployee()` (tu) | |
| dashboard | „pozostałe dni” pracownika | `getPool` + `getPoolUsage` | liczby dni |

## Teksty

`shared/locales/pl/employees.json` (już z makiety) + klucze serwera: `login_taken`, `email_taken`,
`email_taken_archived`, `own_role`, `archive_self`, `already_archived`, `not_archived`, `year_not_open`,
`year_too_early`, `restore_confirm`, `restored`; w `validation.json`: `whole_number`, `range`, `name_too_short`.

## Poza zakresem

- Ekran kartoteki jednej osoby, pule z poprzednich lat na ekranie (pytanie 9: widać je w historii zmian).
- Filtr „bez e-maila” (pytanie 8).
- Cofanie zamknięcia roku (pytanie 4).
- Usuwanie kont na stałe i ekran archiwum (moduł Archiwum).
- Wysyłanie loginu i hasła e-mailem (administrator przekazuje je sam).
- Dodatkowe dane pracownika (stanowisko, telefon, data zatrudnienia), pula proporcjonalna dla nowych osób.

## Zmiana 2026-11-16: rodzaj umowy ze słownika

Moduł Typy umów (`docs/modules/contract-types/SPEC.md`) zastąpił stałą listę czterech rodzajów umowy:
- w bazie `users.contract_type_id` (klucz obcy do `contract_types`, `RESTRICT`) zamiast `users.contract_type` (ENUM);
  dotychczasowe umowy przepisane migracją `015`;
- pole „Rodzaj umowy” w oknie pracownika ma widoczne typy w kolejności z „Typów umów” (`GET /api/employees/contract-types`);
  pracownik z ukrytym typem go zachowuje i widzi go z dopiskiem „(ukryty)”, nikt inny nie może go wybrać
  (400 `employees.server.contract_type_unavailable`);
- lista pokazuje nazwę typu (także ukrytego), historia zmian konta zapisuje nazwę typu.

## Zmiana 2026-11-16: wspólne klocki zamiast kopii

Lista korzysta ze wspólnych klocków: `PageHeader` (nagłówek), `useListParams` (`frontend/src/core/`, parametry w adresie), `ListPagination` (stronicowanie), `EmptyState` (pusty stan) i `ConfirmModal` (okno „Do archiwum”).
„Nikt nie pasuje do …” ma teraz wygląd pustego stanu: ikona lupy, zdanie i przycisk „Wyczyść wyszukiwanie” pod nim, na środku.

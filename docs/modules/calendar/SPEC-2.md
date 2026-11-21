# Spec: Kalendarz, część 2: Liczenie dni i zatwierdzanie

**Data:** 2026-11-21 · **Status:** zaakceptowany przez użytkownika 2026-11-21
**Podstawa:** `SPEC.md` (ogólny, „Część 2 w skrócie”), `QUESTIONS.md` (odpowiedzi 4a, 5a, 6a), makieta Typów urlopów
(`mockups/src/modules/leave-types/`: kolumny i pola części 2 już są), makieta Kalendarza (`days_value_*`), speki
Moich urlopów i Wniosków urlopowych

## Cel

Typ urlopu dostaje dwa ustawienia: **Liczenie dni** (robocze albo kalendarzowe) i **Wymaga zatwierdzenia**. Dzięki
temu urlop ojcowski liczy 14 dni kalendarzowych, a chorobowe zgłoszone przez pracownika od razu jest zatwierdzone:
administrator dostaje powiadomienie i e-mail, a w kalendarzu pojawia się ciągły fioletowy pasek.

Część działa, gdy: pracownik zgłasza „Chorobowe” na 7 dni kalendarzowych (także z datą do 7 dni wstecz), wniosek od
razu ma status „Zatwierdzony”, administrator dostaje powiadomienie „Zgłoszona nieobecność” i e-mail, kalendarz
pokazuje ciągły pasek przez weekend; urlop wypoczynkowy liczy się i wygląda jak dotąd.

## Zasady

- **Wniosek zapamiętuje sposób liczenia** (`leave_requests.day_count`, kopia z typu przy złożeniu). Zmiana ustawień
  typu dotyczy tylko nowych wniosków (jak dziś „Odejmuje dni z puli” i limit). Stare wnioski dostają `working`.
- **Dni wniosku:** kolumna `working_days` zostaje i znaczy „dni wniosku” liczone sposobem wniosku (komentarz
  w migracji). Robocze: `countWorkingDays`; kalendarzowe: wszystkie dni od–do. Z tej liczby korzystają bez zmian
  limit typu, pula (gdy typ odejmuje dni), pasek dni, wydruk, e-mail, listy i Kalendarz.
- **Wymaga zatwierdzenia = tak:** wszystko jak dziś (`pending`, decyzja administratora).
- **Wymaga zatwierdzenia = nie (4a):** serwer zapisuje wniosek od razu jako `approved` z `auto_approved = 1`,
  `decided_at` = chwila złożenia, `decided_by` i `decided_by_name` puste. Te same blokady co zawsze (nakładanie się
  terminów, rok, limit, pula, gdy typ odejmuje dni). Administratorzy dostają powiadomienie nowego rodzaju
  `leave_absence_reported` i e-mail w wersji „Zgłoszona nieobecność” (bez „czeka na Twoją decyzję”).
  „Zatwierdź” / „Odrzuć” nie ma (wniosek nie czeka); próba przez API → 409 `already_decided` jak dziś.
- **Data wstecz (potwierdzone 2026-11-21):** typ bez zatwierdzania może zaczynać się do **7 dni przed dziś**
  (zwolnienie lekarskie bywa wystawiane z datą wsteczną). Typ z zatwierdzaniem: od dziś, jak dotąd. Rok zamknięty
  nadal blokuje (np. 2 stycznia nie zgłosisz chorobowego od 29 grudnia, gdy rok jest zamknięty).
- **Pomyłka (5a):** pracownik sam wycofuje wniosek bez zatwierdzania (status `withdrawn`, dni wracają, administratorzy
  dostają zwykłe „Wniosek wycofany”), dopóki `date_from ≥ dziś` **albo wniosek złożył dziś** (potwierdzone 2026-11-21) (bez tego chorobowe wpisane wstecz z błędem nie dałoby się wycofać ani przez chwilę). Później tylko
  administrator anuluje z powodem (trasa `cancel`, jak zatwierdzony urlop). Wnioski czekające wycofuje się jak dziś.
- **Nakładanie się:** chorobowe w trakcie zatwierdzonego urlopu jest zablokowane jak każdy nakładający się termin
  (komunikat „termin zajęty”). Przerwanie urlopu chorobowym: administrator anuluje urlop, pracownik zgłasza chorobowe.
  **[decyzja AI]** — automatyczne skracanie urlopu poza zakresem.
- **Typ „Chorobowe” na start:** migracja dodaje go na końcu listy (kalendarzowe, bez zatwierdzania, nie odejmuje
  dni, bez limitu, fioletowy), tylko gdy nie ma typu o tej nazwie (także ukrytego); istniejącego nie zmienia.

## Ekrany

Najpierw makiety (`mockups/`), potem aplikacja.

### Typy urlopów (administrator)

Jak w makiecie Typów urlopów:
- Tabela: kolumny „Liczenie dni” („dni robocze” / „dni kalendarzowe”) i „Zatwierdzanie” (plakietka „wymaga” /
  „bez zatwierdzenia”); na telefonie w karcie.
- Okno „Dodaj” / „Edytuj”: „Liczenie dni” (dwa przyciski wyboru z podpowiedziami z makiety, nowy typ: robocze)
  i przełącznik „Wymaga zatwierdzenia” (nowy typ: włączony).
- Teksty zmienione według `SPEC.md` („Teksty Typów urlopów do zmiany w części 2”): podpowiedź „Odejmuje dni z puli”
  („Włączone: dni wniosku zmniejszają pulę pracownika, najpierw zaległe.”), podpowiedź limitu („Ile dni w roku może
  wziąć jedna osoba, liczonych jak wyżej (robocze albo kalendarzowe). Puste = bez limitu.”), ostrzeżenie przy edycji
  („Zmiana liczenia dni, zatwierdzania, „Odejmuje dni z puli” i limitu dotyczy tylko nowych wniosków…”).

### Moje urlopy (pracownik)

- Okno „Złóż wniosek”: przy typie w dniach kalendarzowych podpowiedź pod typem „Liczone w dniach kalendarzowych:
  weekendy i święta też się liczą.”; przy typie bez zatwierdzania „Nie czeka na decyzję: od razu jest zatwierdzony,
  a administrator dostaje powiadomienie. Możesz zacząć do 7 dni wstecz.” Pole „Od” pozwala wtedy wybrać 7 dni wstecz.
- Pasek dni w oknie: przy typie kalendarzowym każdy dzień „liczy się do wniosku” (weekend i święto też).
- Wynik sprawdzenia: „7 dni kalendarzowych” zamiast „… dni roboczych”; przycisk przy typie bez zatwierdzania
  „Zgłoś” zamiast „Złóż wniosek” **[decyzja AI]**, dymek po zapisie „Zgłoszono. Administrator dostał powiadomienie.”
- Tabela wniosków: kolumna „Dni” (było „Dni robocze”) z jednostką („5 dni roboczych”, „7 dni kalendarzowych”);
  przy zatwierdzonym bez zatwierdzania przycisk „Wycofaj”, póki wolno (zasada wyżej), okno wycofania jak dziś.
- Limity typów (karta): bez zmian, jednostka limitu według typu.

### Wnioski urlopowe i Kalendarz (administrator)

- Lista: kolumna „Dni” z jednostką jak wyżej.
- Szczegóły wniosku (wspólny klocek, też w Kalendarzu): przy wniosku bez zatwierdzania zamiast „Zatwierdził(a) X”
  wiersz „Zatwierdzony automatycznie (typ bez zatwierdzania)”; „Anuluj urlop” i „PDF” jak przy zatwierdzonym.
- Kalendarz: pasek wniosku kalendarzowego ciągły (sposób z wniosku, nie z typu), w dymku i szczegółach „7 dni
  kalendarzowych”.
- Pulpit (boksy wniosków), powiadomienia, PDF i e-mail: liczba dni z jednostką wniosku.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Typ urlopu | Liczenie dni | tak | jedna z 2 | `working`, `calendar` | `z.enum(LEAVE_DAY_COUNTS)` w `leaveTypeSchema` |
| Typ urlopu | Wymaga zatwierdzenia | tak | — | tak / nie | `z.boolean` jak `deductsPool` |
| Wniosek | Od | tak | dziś (typ bez zatwierdzania: dziś − 7 dni) – 2099-12-31 | RRRR-MM-DD | bez zmian w schemacie; dolną granicę sprawdza `checkLeaveRequest` |

## Dane

| Migracja | Zmiana |
|---|---|
| `031_leave_types_day_count.sql` | `leave_types.day_count ENUM('working','calendar') NOT NULL DEFAULT 'working'` |
| `032_leave_types_requires_approval.sql` | `leave_types.requires_approval BOOLEAN NOT NULL DEFAULT TRUE` |
| `033_leave_requests_day_count.sql` | `leave_requests.day_count ENUM('working','calendar') NOT NULL DEFAULT 'working'` + komentarz kolumny `working_days` („dni wniosku liczone sposobem z day_count”) |
| `034_leave_requests_auto_approved.sql` | `leave_requests.auto_approved BOOLEAN NOT NULL DEFAULT FALSE` |
| `035_leave_types_sick_seed.sql` | typ „Chorobowe” (warunek: nie ma typu o tej nazwie) |

Nowych tabel i relacji nie ma. Historia zmian: typ urlopu zapisuje `day_count` i `requires_approval` przed → po;
złożenie wniosku bez zatwierdzania ma w zmianach `status: approved` i `auto_approved: tak`; wycofanie jak dziś.

## API

| Metoda i adres | Kto | Zmiana | Błędy |
|---|---|---|---|
| `POST /api/leave-types`, `PUT /api/leave-types/:id` | admin | pola `dayCount`, `requiresApproval` | 400 wartość spoza listy |
| `GET /api/leave-types`, `GET /api/my-leave/overview` (typy do wyboru) | admin / employee | typy mają `dayCount`, `requiresApproval` | — |
| `POST /api/my-leave/requests` | employee | serwer bierze sposób liczenia i zatwierdzanie z typu w bazie; odpowiedź ze statusem `approved` przy typie bez zatwierdzania | 400 `past_date` (granica według typu), 409 jak dziś |
| `POST /api/my-leave/requests/:id/withdraw` | employee | wycofuje także `approved` z `auto_approved` według zasady „Pomyłka” | 409 `not_pending` → nowy komunikat „Tego wniosku nie możesz już wycofać” |
| `GET /api/my-leave/requests`, `GET /api/leave-requests`, `/:id`, `GET /api/calendar`, `GET /api/dashboard` | jak dziś | wniosek ma `dayCount`, `autoApproved` (pracownik: `canWithdraw` liczy serwer) | — |

Wartości liczone przez serwer (nie brane z żądania): sposób liczenia i zatwierdzanie (z typu), liczba dni, status,
`auto_approved`, `decided_at`, czy wolno wycofać.

## Powiązania

| Z modułem | Co | Funkcja | Pola |
|---|---|---|---|
| leave-types | ustawienia typu | `leaveTypeSchema`, `findSelectableLeaveType` | `dayCount`, `requiresApproval` |
| my-leave | złożenie, sprawdzenie, wycofanie | `checkLeaveRequest` (dostaje `dayCount`, `requiresApproval`), `createRequest`, `withdrawRequest` | — |
| leave-requests, calendar, dashboard | jednostka dni, „zatwierdzony automatycznie”, pasek | wspólne `leaveDaysText` (shared) i szczegóły wniosku (common) | `dayCount`, `autoApproved` |
| notifications, email | nowy rodzaj powiadomienia i wersja e-maila | `notifyAdmins`, `emailAdminsAboutNewRequest` | jednostka dni w treści |

## Teksty

`leave-types.json` (podpowiedzi według „Ekrany”), `my-leave.json` (podpowiedzi typu, „Zgłoś”, dymek, „Dni”,
jednostki, komunikat wycofania), `leave-requests.json` („Zatwierdzony automatycznie…”, „Dni”), `notifications.json`
(`leave_absence_reported`: „Zgłoszona nieobecność: {{employee}}”, „{{leaveType}}, {{dateFrom}} – {{dateTo}}, {{days}}”;
`leave_request_new` z jednostką), `email.json` (wersja „Zgłoszona nieobecność”: temat, nagłówek, „{{employee}} zgłosił(a)
nieobecność. Jest już zatwierdzona, nie wymaga decyzji.”), `pdf` (jednostka dni).

## Poza zakresem

- Skracanie zatwierdzonego urlopu przez chorobowe, pół dnia, dni wolne firmy.
- Załącznik ze zwolnieniem lekarskim (pomysł do `IDEAS.md`, jeśli użytkownik zechce).

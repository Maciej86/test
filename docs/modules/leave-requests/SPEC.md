# Spec: Wnioski urlopowe

**Data:** 2026-11-17 · **Status:** zaakceptowany przez użytkownika 2026-11-17
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-17: 1b, 2a–8a, zasady pól ok), `SPEC-GENERAL.md`, makieta
`mockups/src/modules/leave-requests/`, `docs/modules/my-leave/SPEC.md` (te same wnioski, pula, PDF)

## Cel

Administrator rozpatruje wnioski urlopowe pracowników: zatwierdza je (z oknem potwierdzenia), odrzuca z powodem
i anuluje zatwierdzony urlop z powodem (dni wracają do puli). Przy decyzji widzi pulę osoby i to, kto jeszcze ma
wtedy wolne. Pobiera PDF zatwierdzonego wniosku. Pracownik dostaje powiadomienie o każdej decyzji.

Moduł działa, gdy: Jan Kowalski składa wniosek na 26–27.11.2026, administrator klika link w e-mailu, widzi szczegóły
wniosku z paskiem „Kto jeszcze ma wtedy wolne” (Magdalena Lewandowska 23–27.11), zatwierdza go w oknie potwierdzenia,
Jan dostaje powiadomienie „Urlop zatwierdzony”, wniosek ma status „Zatwierdzony”, a pula Jana się nie zmienia (dni
były zarezerwowane). Anulowanie tego urlopu z powodem oddaje 2 dni, a Jan widzi powód w „Moich urlopach”. Odrzucenie
bez powodu jest zablokowane przy polu i przez serwer.

Moduł jest średni (ok. 15 kroków planu) i nie ma części, które mogą dojść później (PDF już jest), więc budujemy go
w całości, bez podziału na części.

## Zasady

- **Statusy.** Ten moduł zmienia: `pending` → `approved` (zatwierdzenie), `pending` → `rejected` (odrzucenie),
  `approved` → `cancelled` (anulowanie). Każda decyzja zapisuje `decided_by`, `decided_by_name` (kopia imienia
  i nazwiska) i `decided_at`; anulowanie nadpisuje je osobą, która anulowała (kto zatwierdził, zostaje w Historii
  zmian). **[decyzja AI]**
- **Zatwierdzenie (1b):** zawsze przez okno „Zatwierdzić wniosek?” z listy i ze szczegółów. Pula się nie zmienia
  (czekające dni są już zarezerwowane, `my-leave`, 2a); serwer nie sprawdza puli ani limitu ponownie (sprawdził je
  przy złożeniu w transakcji). Wniosek z minionym terminem można zatwierdzić i odrzucić (6a); okno i szczegóły
  pokazują wtedy żółtą ramkę.
- **Odrzucenie (3a):** powód obowiązkowy, 3–500 znaków. Dni wracają do puli (wniosek przestaje się liczyć).
- **Anulowanie (4a, 5a):** tylko wniosek `approved`, którego pula (`leave_pools` osoby dla `pool_year`) nie jest
  zamknięta (`closed_at IS NULL`); inaczej 409 `year_closed`. Także urlop trwający albo miniony; okno pokazuje wtedy
  żółte ostrzeżenie. Powód obowiązkowy, 3–500 znaków. Dni wracają do puli.
- **Jeden powód na wniosek:** kolumna `reject_reason` zmienia nazwę na `decision_reason` (powód odrzucenia albo
  anulowania); „Moje urlopy” pokazują go już przy obu statusach. **[decyzja AI]**: jedna kolumna, bo wniosek ma
  najwyżej jeden powód (odrzuconego nie da się anulować).
- **Wyścig dwóch administratorów:** decyzja w transakcji z blokadą wiersza wniosku (`SELECT … FOR UPDATE`) i warunkiem
  statusu w `UPDATE`. Wniosek już rozpatrzony (albo wycofany przez pracownika) → 409 `already_decided` z
  `{ status, decidedByName }`; ekran pokazuje dymek „Ten wniosek rozpatrzył już …” (przy wycofanym: „Pracownik wycofał
  ten wniosek.”), odświeża listę i szczegóły, okno się zamyka.
- **Wnioski osób w archiwum** zostają na liście z dopiskiem „w archiwum” przy nazwisku i można je rozpatrzyć
  (zatwierdzić, odrzucić, anulować). **[decyzja AI]**: archiwum nie zmienia historii urlopów; „Do archiwum” już
  ostrzega o czekających wnioskach.
- **Powiadomienia (spec ogólny):** zatwierdzenie → `leave_approved`, odrzucenie → `leave_rejected` (z powodem),
  anulowanie → `leave_cancelled` (z powodem) do pracownika, w tej samej transakcji; link
  `/admin/my-leave?year=<pool_year>`. Bez e-maila (spec ogólny: jedyny e-mail to nowy wniosek).
- **Link do wniosku (8a):** powiadomienia administratora o nowym i wycofanym wniosku (moduł Moje urlopy) dostają
  link `/admin/leave-requests/<id>` zamiast samej listy; e-mail już go ma. Ten adres otwiera listę z otwartymi
  szczegółami wniosku. Nieistniejący numer → lista i dymek „Nie ma takiego wniosku.”.
- **Serwer liczy sam:** status, `decided_by`/`decided_by_name` (z `req.user`), `decided_at`, liczby puli, listę osób
  z urlopem w tym samym czasie.
- **Historia zmian:** każda decyzja jako `action: 'status'`, `entityType: 'leave_requests'`, zmiany `status` (i
  `decision_reason` przy odrzuceniu i anulowaniu), w tej samej transakcji.

## Ekrany

### „Wnioski urlopowe” `/admin/leave-requests` i `/admin/leave-requests/:id` (admin)

Układ jak w makiecie (bez paska „Pokaż stan”):
- `PageHeader`: „Wnioski urlopowe”, pod spodem „3 wnioski czekają na decyzję. Najdłużej czeka wniosek złożony
  13.11.2026.” albo „Żaden wniosek nie czeka na decyzję.”; bez przycisków.
- Zakładki statusów (`SegmentedControl`; na telefonie `Select`): „Czekają (3)”, Zatwierdzone, Odrzucone, Anulowane,
  Wycofane, Wszystkie. Domyślnie „Czekają” (7a).
- Filtry: wyszukiwarka po imieniu i nazwisku pracownika, rok (`Select`, tylko poza „Czekają”; lata z wnioskami,
  domyślnie bieżący rok `currentYear()`; rok = `pool_year`), typ urlopu (`Select`, wszystkie typy, także ukryte,
  „Wszystkie typy” = brak filtra). Zakładka, rok, typ, wyszukiwanie i strona siedzą w adresie (`useListParams`).
- Kolejność (7a): „Czekają”: najstarsze złożone na górze; pozostałe zakładki: od najnowszego terminu (`date_from`
  malejąco, potem numer). Bez sortowania kolumn **[decyzja AI]**: kolejność ustalona w odpowiedzi 7a wystarcza.
  25 na stronę (`ListPagination`).
- Tabela (komputer) / karty (telefon). Kolumny: Pracownik (pogrubiony, „w archiwum” przygaszone; pod spodem komentarz
  w 2 liniach), Termin (pogrubiony; jeden dzień bez „–”; znacznik „termin już minął” przy czekającym z `date_from` <
  dziś), Typ urlopu, Dni robocze (liczba; pod spodem podział jak w „Moich urlopach” albo „nie liczą się do puli”),
  Zostało w puli (dni do wykorzystania w otwartym roku osoby: pula + zaległe − zatwierdzone − czekające, „19 z 30”;
  0 na czerwono; brak puli → „brak”), Status (znacznik w kolorach z `DESIGN.md`; pod spodem kto i kiedy, powód
  w cudzysłowie), Złożony (data), akcje.
- Akcje w wierszu: czekający: „Zatwierdź” (zielony, `confirm`) i „Odrzuć” (`subtle` czerwony, `cancel`); zatwierdzony:
  „PDF” (`subtle`, `print`, otwiera PDF w nowej karcie) i „Anuluj urlop” (`subtle` czerwony, `cancel`, tylko gdy rok
  niezamknięty); pozostałe: „Szczegóły” (`details`). Kliknięcie wiersza albo karty otwiera szczegóły i zmienia adres na
  `/admin/leave-requests/<id>` (zamknięcie wraca do listy z tymi samymi filtrami).
- Puste stany (`EmptyState`): „Czekają” bez wniosków: ikona, „Wszystko rozpatrzone” i „Żaden wniosek nie czeka na
  decyzję. Nowe pojawią się tutaj, a dzwonek u góry da znać.”; brak wyników filtrów: „Brak wniosków dla wybranych
  filtrów. Zmień rok, typ albo wyszukiwanie.”. Ładowanie i błąd: `DataState`.

### Szczegóły wniosku (`Drawer` z prawej, na telefonie na cały ekran)

- Tytuł „Wniosek nr 24”; pracownik, status, termin, „Wypoczynkowy, 3 dni robocze (3 z puli 2026)”.
- Żółta ramka przy czekającym z minionym terminem (6a).
- Przy czekającym i zatwierdzonym: **„Kto jeszcze ma wtedy wolne” (2a)**: dni terminu kolumnami (do 31 dni; dłuższy
  termin: sama lista osób z datami), pierwszy wiersz to ten wniosek, potem każda inna osoba z wnioskiem
  zatwierdzonym (zielony) albo czekającym (żółty) mającym wspólny dzień; weekendy i święta przekreślone
  (`getPolishHolidays`), w dymku nazwa święta; legenda; „W tym terminie nikt inny nie ma urlopu.”, gdy nikogo.
- Przy czekającym i zatwierdzonym: boks puli roku wniosku (pasek: wykorzystane, czeka, zostało; liczby jak w kolumnie
  „Zostało w puli”); przy czekającym zdanie „Po zatwierdzeniu zostanie 15 dni. Zatwierdzenie nie zmienia tej liczby,
  bo dni są już zarezerwowane.” (typ bez odejmowania: „Ten typ urlopu nie odejmuje dni z puli.”). Gdy pula roku jest
  już zamknięta albo jej nie ma, boksu nie ma.
- Komentarz, data złożenia z godziną, decyzja („Zatwierdził(a)”, „Odrzucił(a)”, „Anulował(a)”: osoba, data
  z godziną), powód.
- Przyciski na dole: czekający: „Odrzuć” i „Zatwierdź” (zielony); zatwierdzony: „Anuluj urlop” (gdy rok niezamknięty)
  i „PDF”.

### Okna

- **„Zatwierdzić wniosek?”** (`ConfirmModal`, 1b): „Piotr Zieliński: Wypoczynkowy, 21.12.2026 – 24.12.2026 (3 dni
  robocze).”, „W tym czasie urlop ma też: Tomasz Wójcik.” (tylko zatwierdzone urlopy innych; brak → bez zdania),
  żółta ramka przy minionym terminie, „Pracownik dostanie powiadomienie o zatwierdzeniu. Gdyby to była pomyłka, urlop
  można później anulować.”; przyciski „Wróć” i „Zatwierdź”. Dymek „Wniosek zatwierdzony. Piotr Zieliński dostaje
  powiadomienie.”. `ConfirmModal` dostaje parametr koloru przycisku (`confirmColor`), żeby „Zatwierdź” był zielony
  jak na liście (`DESIGN.md`: zielony = zatwierdzenie). **[decyzja AI]**
- **„Odrzucenie wniosku”**: pracownik, typ, termin i dni; pole „Powód odrzucenia” (wymagane, podpowiedź
  z przykładem), zdanie o dniach wracających do puli (typ odejmujący); przyciski „Wróć” i „Odrzuć wniosek”
  (czerwony). Dymek „Wniosek odrzucony. Jan Kowalski dostaje powiadomienie z powodem.”.
- **„Anulowanie urlopu”**: pracownik, typ, termin i dni; żółta ramka, gdy urlop już się zaczął; „2 dni wrócą do
  puli. Jan Kowalski będzie mieć wtedy 21 dni do wykorzystania.” (typ bez odejmowania: „pula się nie zmieni”); pole
  „Powód anulowania” (wymagane); przyciski „Wróć” i „Anuluj urlop” (czerwony). Dymek „Urlop anulowany, dni wróciły
  do puli. …”.
- Wszystkie okna: błąd pola pod polem, błąd serwera w dymku, okno zostaje otwarte (wspólne zachowanie
  `ConfirmModal`); 409 `already_decided`: dymek, okno się zamyka, lista i szczegóły odświeżone.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Odrzucenie | Powód odrzucenia | tak | 3–500 znaków (po przycięciu spacji) | tekst („W tym terminie inwentaryzacja, proszę o inny termin.”) | `text(LEAVE_DECISION_REASON_MAX)` + `.min(LEAVE_DECISION_REASON_MIN, 'leave-requests.validation.reason_min')` |
| Anulowanie | Powód anulowania | tak | 3–500 znaków | tekst | to samo |

Stałe `LEAVE_DECISION_REASON_MIN = 3` i `LEAVE_DECISION_REASON_MAX = 500` w `shared/src/constants/` (obok
`LEAVE_REQUEST_COMMENT_MAX`). Jeden schemat `leaveDecisionReasonSchema` (`{ reason }`) dla obu okien, front i serwer.

## Dane

### Migracja `018_leave_requests_decision_reason.sql`

`ALTER TABLE leave_requests RENAME COLUMN reject_reason TO decision_reason;` (`VARCHAR(500) NULL` bez zmian).
W „Moich urlopach” pole API `rejectReason` → `decisionReason` (zapytania, typ `MyLeaveRequest`, ekran, testy).
Brak nowych tabel i relacji: `decided_by` (SET NULL + `decided_by_name`) jest od migracji 017. Indeks
`status` jest; nowy indeks (`status`, `created_at`) nie jest potrzebny przy tej liczbie wniosków **[decyzja AI]**.

### Historia zmian

| Zdarzenie | `entityType` | `action` | Zmiany |
|---|---|---|---|
| zatwierdzenie | `leave_requests` | `status` | `status`: pending → approved |
| odrzucenie | `leave_requests` | `status` | `status`: pending → rejected, `decision_reason` |
| anulowanie | `leave_requests` | `status` | `status`: approved → cancelled, `decision_reason` |

## API

`mountModule(api, 'leave-requests', leaveRequestsRoutes)` (rola z nawigacji: `admin`).

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/leave-requests` | admin | `leaveRequestsListQuerySchema`: `listQuerySchema` (strona, wyszukiwanie) + `status` (`pending`/…/`all`, domyślnie `pending`), `year` (2000–2100, domyślnie bieżący), `leaveTypeId` (opcjonalny) | `ListResponse<LeaveRequestListItem>` + `pendingCount`, `oldestPendingAt`, `years`, `leaveTypes` | 400 |
| `GET /api/leave-requests/:id` | admin | — | `LeaveRequestDetails` | 404 |
| `POST /api/leave-requests/:id/approve` | admin | — | `{ ok }` | 404; 409 `already_decided` |
| `POST /api/leave-requests/:id/reject` | admin | `leaveDecisionReasonSchema` | `{ ok }` | 400 (pole `reason`); 404; 409 `already_decided` |
| `POST /api/leave-requests/:id/cancel` | admin | `leaveDecisionReasonSchema` | `{ ok }` | 400; 404; 409 `not_approved`, `year_closed` |
| `GET /api/leave-requests/:id/pdf` | admin | — | PDF `inline`, `no-store` (ten sam dokument co w „Moich urlopach”) | 404; 409 `not_approved` |

- `LeaveRequestListItem`: `{ id, employeeName, employeeArchived, leaveTypeName, deductsPool, dateFrom, dateTo,
  workingDays, daysFromCarried, daysFromAnnual, poolYear, comment, status, decisionReason, decidedByName, decidedAt,
  createdAt, poolLeft: { left, total } | null, canCancel }`.
- `LeaveRequestDetails`: pola z listy + `pool: { year, annualDays, carriedDays, used, pending, left } | null` (pula
  roku wniosku, gdy otwarta) + `others: [{ employeeName, dateFrom, dateTo, status }]` (zatwierdzone i czekające innych
  osób ze wspólnym dniem; tylko przy `pending` i `approved`).
- Wartości liczone przez serwer: status, `decided_by`, `decided_by_name`, `decided_at`, `poolLeft`, `pool`, `others`,
  `canCancel`, liczba czekających.
- Każda trasa z numerem: `idParam`; każda nowa trasa ma testy 401 (bez logowania) i 403 (pracownik).

Dopisać do „Mapy dostępu” w `SPEC-GENERAL.md`: wiersz z trasami powyżej, `mountModule(api, 'leave-requests', …)`,
„nieistniejący → 404; decyzja na rozpatrzonym → 409”.

## Zmiany we wspólnym kodzie i w zrobionych modułach (z testem)

- **Trasy podstron:** pozycja nawigacji może mieć adres szczegółów (`detailPath: true` w `navigation.config.ts` →
  dodatkowa trasa `<path>/:id` z tą samą stroną i tymi samymi rolami w `buildRoutes`); menu podświetla pozycję także
  na podstronie (już działa). Test: `/admin/leave-requests/24` otwiera stronę wniosków, pracownik dostaje „brak
  dostępu”.
- **`ConfirmModal`** (front i makiety): parametr `confirmColor` (np. `green`); bez niego jak dotąd.
- **Moje urlopy:** `rejectReason` → `decisionReason`; powód widać przy odrzuconym i anulowanym (już tak wygląda
  makieta); link w powiadomieniach o nowym i wycofanym wniosku: `/admin/leave-requests/<id>`.
- **Powiadomienia:** tekst `leave_cancelled.detail`: „{{leaveType}}, {{dateFrom}} – {{dateTo}}. Powód: {{reason}}”
  (dotąd bez powodu i z „Dni wróciły do puli”, co nie pasuje do typów bez odejmowania).
- **Wspólne zamiast kopii:** znacznik statusu z kolorami, termin („od – do”, jeden dzień bez „–”) i opis podziału dni
  są dziś w `my-leave/components/RequestsTable.tsx`; przenoszę je do `frontend/src/common/` i używam w obu modułach.
  Pobieranie wniosku do PDF i zamiana wiersza na dane dokumentu przechodzą z `my-leave` do `backend/src/pdf/`
  (z parametrem „tylko osoba”), żeby obie trasy PDF używały jednego kodu. Szczegóły w planie („Używam ponownie”,
  „Wydzielam”).

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| my-leave | te same wnioski: lista, decyzje, powód w „Moich urlopach” | wspólna tabela `leave_requests`; kolumny wniosku jak w `my-leave.queries.ts` | admin: wszystkie pola |
| employees | „Zostało w puli” i boks puli | `getPoolUsage(userIds, year)` (jest), pule osób z `employees.queries.ts` | liczby |
| employees | archiwum: dopisek przy nazwisku | `users.archived_at` w zapytaniu listy | znacznik |
| leave-types | filtr typu (także ukryte) | `listLeaveTypes` z `leave-types.queries.ts` (jest) | `id, name` |
| notifications | decyzja → pracownik | `notifyUsers(conn, …)` (jest) | typ, daty, powód |
| pdf | PDF zatwierdzonego wniosku | `buildLeaveRequestPdf`, `renderPdf` (są) | jak w „Moich urlopach” |
| dashboard (moduł 14) | boks „Wnioski do rozpatrzenia” | `countPendingRequests(year)` (jest) i `pendingCount` z listy | liczba |
| activity-log (moduł 11) | wpisy decyzji | `logActivity` (jest) | — |

## Teksty

`shared/locales/pl/leave-requests.json` (z makiety): `title`, `summary_*`, `filter*`, `search`, `year`, `type*`,
`col_*`, `status.*`, `approve*`, `reject*`, `cancel*`, `pdf`, `details*`, `late*`, `split_*`, `days_*`, `pool_*`,
`strip_*`, `decided_*`, `reason*`, `*_done`, `already_decided`, `empty_*`, `no_results`; nowe: `employee_archived`,
`withdrawn_meanwhile`, `not_found`, sekcja `server` (`already_decided`, `not_approved`, `year_closed`) i
`validation` (`reason_min`). Klucze `mockup_*` i `pdf_mockup` zostają dla makiety.

## Poza zakresem

- Zatwierdzanie kilku wniosków naraz, kalendarz zespołu (pomysł w `IDEAS.md`), e-maile o decyzjach.
- Zmiana terminu wniosku przez administratora, wnioski składane w imieniu pracownika.
- Prośba pracownika o anulowanie zatwierdzonego urlopu (anuluje tylko administrator).

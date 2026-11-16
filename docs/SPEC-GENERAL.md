# Spec ogólny: Urlopy i zadania (projekt `test`)

**Data:** 2026-11-13 · **Status:** zaakceptowany przez użytkownika 2026-11-13

## 1. Cel

Wewnętrzny panel jednej firmy: pracownicy składają wnioski urlopowe, a administrator (właściciel) je zatwierdza,
odrzuca albo anuluje. Aplikacja pilnuje rocznych pul dni, razem z urlopem zaległym. Do tego wspólna tablica zadań
z trzema kolumnami, na której zadania przeciąga się między kolumnami i w obrębie kolumny. Aplikacja działa, gdy
pracownik złoży wniosek, administrator dostanie powiadomienie i e-mail, zatwierdzi wniosek, a pula pracownika
zmniejszy się o właściwą liczbę dni roboczych (najpierw z zaległego urlopu).

## 2. Słownik

| Pojęcie | Znaczenie |
|---|---|
| Administrator | właściciel firmy, rola `admin` |
| Pracownik | osoba z kontem w roli `employee` |
| Login | identyfikator logowania; wygląda jak e-mail, ale nie musi być prawdziwą skrzynką |
| E-mail do powiadomień | nieobowiązkowy prawdziwy adres; tylko na niego idą e-maile |
| Pula | liczba dni urlopu pracownika na dany rok |
| Zaległy urlop | dni niewykorzystane w poprzednim roku, przeniesione przy „Zamknij rok”; wykorzystywane najpierw |
| Typ urlopu | np. wypoczynkowy, na żądanie; ma ustawienie „odejmuje dni z puli” i opcjonalny roczny limit |
| Dni robocze | dni od–do bez sobót, niedziel i świąt (`getPolishHolidays` z `shared/src/holidays.ts`) |
| Kolumna zadania | W opracowaniu, W toku, Zrealizowane |

## 3. Części aplikacji

`AREAS = { public: false, account: false, admin: true }`. Tylko panel (`/admin`) dla obu ról. Bez strony dla
odwiedzających i bez części „konto”. `/` przekierowuje na `/login` albo na `/admin`.

## 4. Role i uprawnienia

| Czynność | admin | employee |
|---|---|---|
| Logowanie, „Moje konto” (własne hasło, e-mail do powiadomień) | ✓ | ✓ |
| Pulpit | ✓ (wnioski do rozpatrzenia, stan tablicy) | ✓ (pozostałe dni, moje zadania) |
| Złożenie wniosku urlopowego, lista własnych wniosków | — | ✓ |
| Wycofanie własnego wniosku w statusie „oczekuje” | — | ✓ |
| Lista wszystkich wniosków, zatwierdzenie, odrzucenie z powodem | ✓ | — |
| Anulowanie zatwierdzonego urlopu (dni wracają do puli) | ✓ | — |
| Wydruk / PDF wniosku zatwierdzonego | ✓ | ✓ (własny) |
| Typy urlopów (dodaj, edytuj, ukryj) | ✓ | — |
| Pracownicy: dodaj, edytuj, ustaw hasło, pule dni, „Zamknij rok”, do archiwum | ✓ | — |
| Tablica zadań: widzi wszystkie, dodaje, edytuje, przeciąga, przypisuje, usuwa (do archiwum) | ✓ | ✓ |
| Historia zmian | ✓ | — |
| Archiwum: przywróć, usuń na stałe | ✓ | — |
| Powiadomienia w aplikacji (dzwonek, własne) | ✓ | ✓ |

[decyzja AI] Administrator nie składa wniosków urlopowych (w wywiadzie urlopy dotyczą pracowników). Konto
administratora nie ma puli. Zmiana później: dodanie roli do pozycji „Moje urlopy”.

## 5. Nawigacja

Panel (`NAVIGATION` w `shared/src/navigation.config.ts`):

| Pozycja | Folder (klucz) | Adres | Kto widzi |
|---|---|---|---|
| Pulpit | dashboard | `/admin` | admin, employee |
| Moje urlopy | my-leave | `/admin/my-leave` | employee |
| Wnioski urlopowe | leave-requests | `/admin/leave-requests` | admin |
| Zadania | tasks | `/admin/tasks` | admin, employee |
| Pracownicy | employees | `/admin/employees` | admin |
| Historia zmian | activity-log | `/admin/activity-log` | admin |
| Archiwum | archive | `/admin/archive` | admin |
| Ustawienia (rozwijane, bez własnej strony; zmiana 2026-11-16) | settings | — | admin |
| ↳ Typy urlopów | leave-types | `/admin/leave-types` | admin |
| ↳ Typy umów | contract-types | `/admin/contract-types` | admin |
| Moje konto | my-account | `/admin/my-account` | admin, employee |

Bez pozycji w menu: dzwonek powiadomień w górnej belce (moduł `notifications`), ekran `/login`.

### Mapa dostępu

Wszystko, czego tu nie ma jako publiczne, wymaga logowania (tak działa szablon). Każdy moduł dopisuje swoje adresy API.

| Adres (strona albo API) | Kto ma dostęp | Uwagi |
|---|---|---|
| `/login` | każdy | jedyna strona bez logowania |
| `POST /api/auth/login` | każdy | `loginLimiter`, `validateBody`; ten sam komunikat przy złym loginie i haśle |
| `POST /api/auth/logout` | każdy | |
| `GET /api/auth/me` | zalogowany | 401 dla konta w archiwum |
| `/change-password`, `POST /api/auth/change-password` | zalogowany | tylko z hasłem tymczasowym (inaczej 409); z hasłem tymczasowym każda inna trasa za logowaniem daje 403 `server.password_change_required` |
| `/admin`, `/api/dashboard` | admin, employee | treść zależna od roli; employee tylko własne dane |
| `/admin/my-leave`, `/api/my-leave` | employee | tylko własne wnioski i pule (`req.user.id`) |
| `/admin/leave-requests`, `/api/leave-requests` | admin | |
| `/admin/tasks`, `/api/tasks` | admin, employee | wspólna tablica, każdy edytuje wszystko |
| `/admin/employees`, `/api/employees` | admin | także pule i „Zamknij rok” |
| `GET/POST /api/employees`, `PUT /api/employees/:id`, `POST /api/employees/:id/password`, `/:id/archive`, `/:id/restore`, `GET/POST /api/employees/close-year`, `GET /api/employees/contract-types` | admin | `mountModule(api, 'employees', …)`; własnej roli i własnego konta do archiwum nie (409) |
| `/admin/leave-types`, `/api/leave-types` | admin | lista typów do formularza wniosku: osobna trasa w `my-leave` |
| `GET/POST /api/leave-types`, `PUT /api/leave-types/:id`, `POST /api/leave-types/:id/move`, `/:id/hide`, `/:id/unhide` | admin | `mountModule(api, 'leave-types', …)`; ostatniego widocznego typu nie ukryjesz (409) |
| `/admin/contract-types`, `/api/contract-types` | admin | lista typów do okna pracownika: osobna trasa w `employees` |
| `GET/POST /api/contract-types`, `PUT /api/contract-types/:id`, `POST /api/contract-types/:id/move`, `/:id/hide`, `/:id/unhide` | admin | `mountModule(api, 'contract-types', …)`; można ukryć wszystkie typy (rodzaj umowy jest nieobowiązkowy) |
| `/admin/activity-log`, `/api/activity-log` | admin | |
| `/admin/archive`, `/api/archive` | admin | przywrócenie i usunięcie na stałe |
| `/admin/my-account`, `/api/my-account` | admin, employee | tylko własne konto |
| `/admin/notifications`, `GET /api/notifications`, `GET /api/notifications/summary`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` | admin, employee | `mountModule(api, 'notifications', …, ['admin', 'employee'])`; tylko własne (`req.user.id`), cudze → 404 |
| `/api/email` | — | nie powstaje: moduł E-mail nie ma tras API (wysyłka wołana z kodu serwera) |

## 6. Dane

### Tabele (zarys)

| Tabela | Najważniejsze kolumny |
|---|---|
| `users` | `name`, `login` (unikalny, małe litery), `email` NULL (unikalny, gdy podany), `password_hash`, `role`, `archived_at`, `archived_by` |
| `activity_log` | z szablonu (`backend/src/db/sql/activity_log.sql`) |
| `leave_types` | `name` (unikalna), `deducts_pool` BOOLEAN, `yearly_limit` INT NULL, `hidden_at` NULL |
| `leave_pools` | `user_id`, `year`, `annual_days`, `carried_days`, `closed_at` NULL; unikalne (`user_id`, `year`) |
| `leave_requests` | `user_id`, `leave_type_id`, `date_from`, `date_to`, `working_days`, `days_from_carried`, `days_from_annual`, `pool_year`, `comment` NULL, `status`, `reject_reason` NULL, `decided_by` NULL, `decided_by_name` NULL, `decided_at` NULL |
| `tasks` | `title`, `description` NULL, `due_date` NULL, `column_key` (`draft`/`in_progress`/`done`), `position`, `completed_at` NULL, `created_by` NULL, `created_by_name`, `archived_at`, `archived_by` |
| `task_assignees` | `task_id`, `user_id`; klucz główny (`task_id`, `user_id`) |
| `notifications` | `user_id`, `type`, `params` JSON, `link` NULL, `read_at` NULL |

Wartości liczone wyłącznie przez serwer: `working_days`, podział na `days_from_carried` i `days_from_annual`,
`status` po akcji, `position` po przeciągnięciu, `completed_at`, autor i daty.

### Relacje

| Rodzic | Dziecko (kolumna) | Przy usunięciu rodzica | Dlaczego |
|---|---|---|---|
| `users` | `users.archived_by` | SET NULL | autorstwo archiwizacji |
| `users` | `activity_log.user_id` | SET NULL (+ `user_name` w szablonie) | historia zostaje po usunięciu osoby |
| `users` | `leave_pools.user_id` | CASCADE | pula bez pracownika nie ma sensu |
| `users` | `leave_requests.user_id` | RESTRICT | nie kasujemy historii urlopów bez ostrzeżenia; **[decyzja AI]**, do potwierdzenia w makiecie modułu Archiwum |
| `users` | `leave_requests.decided_by` | SET NULL + `decided_by_name` | autorstwo decyzji |
| `leave_types` | `leave_requests.leave_type_id` | RESTRICT | typ użyty we wnioskach można tylko ukryć |
| `users` | `tasks.created_by` | SET NULL + `created_by_name` | autorstwo |
| `users` | `tasks.archived_by` | SET NULL | autorstwo archiwizacji |
| `tasks` | `task_assignees.task_id` | CASCADE | przypisanie bez zadania nie ma sensu |
| `users` | `task_assignees.user_id` | CASCADE | usunięta na stałe osoba znika z przypisań |
| `users` | `notifications.user_id` | CASCADE | powiadomienia należą do osoby |

### Archiwum

- **Pracownicy** (`users`): „Do archiwum” wyłącza logowanie od razu (`authenticate` czyta konto z bazy). Wnioski,
  pule i historia zostają. Zarchiwizowanej osoby nie da się przypisać do nowego zadania; przy starych widać dopisek
  „zarchiwizowany”. Login i e-mail obejmują archiwum: zamiast drugiego konta z tym samym loginem aplikacja proponuje
  przywrócenie.
- **Zadania** (`tasks`): „Usuń” na tablicy przenosi do archiwum.
- Przywraca i usuwa na stałe **tylko administrator**, tylko rekord z archiwum (inaczej 409 `server.archive_first`).
- **Wniosków urlopowych się nie usuwa** (statusy: wycofany, odrzucony, anulowany). Typy urlopów się ukrywa
  (`hidden_at`), nie archiwizuje.

### Historia zmian

Włączona. Zakres: wnioski urlopowe (złożenie, wycofanie, zatwierdzenie, odrzucenie, anulowanie), pule dni (zmiana,
„Zamknij rok”), zadania (utworzenie, edycja, przesunięcie, przypisanie, archiwizacja, przywrócenie, usunięcie),
pracownicy (utworzenie, zmiana roli, archiwizacja, przywrócenie). Widzi tylko administrator. Tabelę `activity_log`
doda moduł Logowanie jako migrację **zaraz po** `users` (ma klucz obcy do `users`).

## 7. Moduły i kolejność

| # | Moduł | Folder | Zależy od | Wzorce | Dlaczego w tej kolejności |
|---|---|---|---|---|---|
| 1 | Wygląd | appearance | — | — | zawsze pierwszy: odcienie ciemnego niebieskiego, tylko ciemny motyw |
| 2 | Logowanie | login | appearance | login | `users` z loginem i e-mailem do powiadomień, `activity_log`, ekran logowania, pierwszy administrator, wylogowanie po bezczynności |
| 3 | Pracownicy | employees | login | — | wnioski potrzebują pracowników i ich pul; zakładanie kont, ustawianie hasła, pule, „Zamknij rok”, archiwizacja |
| 4 | Typy urlopów | leave-types | login | — | formularz wniosku potrzebuje typów; mały moduł |
| 5 | E-mail | email | login | — | przed pierwszym modułem, który wysyła e-mail (nowy wniosek → administrator) |
| 6 | Powiadomienia | notifications | login | — | dzwonek w belce; używają go urlopy i zadania |
| 7 | Typy umów | contract-types | employees | — | dodany 2026-11-16 na prośbę użytkownika: lista typów umów prowadzona przez administratora w „Ustawieniach”, zamiast stałej listy u pracownika |
| 8 | Moje urlopy | my-leave | employees, leave-types, email, notifications | — | najważniejsze na start: składanie i wycofywanie wniosków, liczenie dni roboczych, blokada przy braku dni, wydruk |
| 9 | Wnioski urlopowe | leave-requests | my-leave | — | decyzje administratora: zatwierdź, odrzuć z powodem, anuluj, wydruk / PDF |
| 10 | Zadania | tasks | employees, notifications | — | tablica z przeciąganiem, filtr „Tylko moje”, chowanie starych zrealizowanych |
| 11 | Historia zmian | activity-log | employees, my-leave, leave-requests, tasks | — | ekran do wpisów, które zapisują wcześniejsze moduły |
| 12 | Archiwum | archive | employees, tasks | — | wspólny ekran przywracania i usuwania na stałe |
| 13 | Moje konto | my-account | login | — | zmiana własnego hasła i e-maila do powiadomień |
| 14 | Pulpit | dashboard | my-leave, leave-requests, tasks | — | zbiera liczby z urlopów i zadań, więc na końcu |
| 15 | Publikacja | deploy | wszystkie moduły | — | zawsze ostatni: OVH, domena, strona przerwy technicznej |

[decyzja AI] Urlopy (najważniejsze na start) zaczynają się od modułu 7, a nie zaraz po Logowaniu, bo wniosek potrzebuje
pracowników z pulami, typów urlopów, e-maila i powiadomień. Moduły 3–6 są małe i budują tylko to, czego urlopy
wymagają.

## 8. Zasady wspólne

- Tylko jedna firma: bez wzorca „wiele firm”. Bez „dostępu nadawanego przez administratora”.
- Tylko język polski; tylko ciemny motyw (`COLOR_SCHEME_TOGGLE = false`, `FIXED_COLOR_SCHEME = 'dark'`). Wydruk i PDF wniosku są jasne (papier).
- **Dodatki dla wszystkich ekranów:** wyszukiwarka, filtry i sortowanie na listach (pracownicy, wnioski, historia,
  archiwum); strona „nie znaleziono” i przerwa techniczna (strona przerwy w module Publikacja).
- **Dodatki w modułach:** pulpit z liczbami (dashboard), ustawienia własnego konta (my-account), eksport wniosku do
  PDF i wydruk (my-leave, leave-requests), wylogowanie po bezczynności (login).
- E-maile tylko na `users.email`, nigdy na `login`. Jedyny e-mail: nowy wniosek → administratorzy z adresem.
- Powiadomienia w aplikacji: administrator o nowym i wycofanym wniosku; pracownik o zatwierdzeniu, odrzuceniu,
  anulowaniu swojego urlopu i o przypisaniu do zadania.
- Brak plików i zestawień na start (pomysły w `docs/IDEAS.md`).

### Biblioteki

| Biblioteka | Do czego | Moduł | Zgoda |
|---|---|---|---|
| `nodemailer` | e-mail | email | lista zatwierdzona |
| `pdfmake` | PDF wniosku urlopowego | my-leave | lista zatwierdzona |
| przeciąganie kart (np. `@dnd-kit`) | tablica zadań, także na telefonie | tasks | spoza listy: zapytać w module Zadania |

## 9. Ostatnie decyzje (archiwum)

- 2026-11-16: E-mail: makieta podglądu e-maila „Nowy wniosek urlopowy” (jasna treść, wersja tekstowa, widok na telefonie); 6 pytań (w tym powrót do wniosku po zalogowaniu).
- 2026-11-16: Aktualizacja stepkit 0.1.28 → 0.1.29: test zasad pilnuje, że numer z adresu idzie tylko przez `idParam` (nigdy `Number(req.params…)`); `routeHelpers.ts`, `errors.ts` i ich testy wyrównane z szablonem.
- 2026-11-16: Moduł Typy urlopów zrobiony (potwierdzony przez użytkownika): lista z kolejnością strzałkami, dodawanie i edycja, ukrywanie i przywracanie (ostatniego widocznego nie da się ukryć), 5 typów na start; wspólne `idParam`/`reply` w `backend/src/middleware/routeHelpers.ts` (numer w adresie tylko z cyfr), wspólne kroki e2e w `e2e/helpers.ts`.
- 2026-11-16: Aktualizacja stepkit 0.1.27 → 0.1.28: wszystkie funkcje w kodzie zapisane jako stałe ze strzałką (test zasad `functions are arrow functions`).
- 2026-11-16: Typy urlopów: odpowiedzi 1a–7a, zasady pól ok (limit liczony na osobę z czekającymi, zmiana zasad tylko dla nowych wniosków, tylko ukrywanie, własna kolejność strzałkami, bez opisu, kolumna „Wnioski”).
- 2026-11-16: Typy urlopów: makieta listy (kolejność strzałkami, „Pokaż ukryte”, kolumna „Wnioski”), okna dodaj/edytuj (ostrzeżenie przy typie użytym we wnioskach) i ukryj; 8 pytań. Nowe ikony przycisków: Ukryj (`EyeOff`), Przywróć ukryty (`Undo2`).
- 2026-11-16: Aktualizacja stepkit 0.1.22 → 0.1.27: makiety otwierają panel pod `/`, skrypty kopii zapasowych poza serwerem i wdrożeń (`scripts/backup/`, `scripts/deploy.sh`), nagłówki bezpieczeństwa w Caddyfile, blokada zapisów z obcych stron, baza i phpMyAdmin tylko z tego komputera, zmiana hasła kończy inne sesje (`users.token_version`), testy w folderach `__tests__`.
- 2026-11-15: Moduł Pracownicy zrobiony (potwierdzony przez użytkownika): lista z paskiem puli, dodawanie i edycja (imię i nazwisko osobno), hasło tymczasowe, archiwum i przywracanie, „Zamknij rok” z kolumną „Razem”.
- 2026-11-15: Pracownicy: na etapie testów użytkownik chce osobnych pól „Imię” (2–60) i „Nazwisko” (2–80); `name` w bazie staje się kolumną wyliczaną, `npm run admin` pyta o oba.
- 2026-11-15: Pracownicy: zbudowane (kroki 0–12, przegląd kodu z poprawkami), testy e2e zielone; zaległe dni do 999 (zamiast 120), bo „Zamknij rok” przenosi wszystkie dni bez limitu.
- 2026-11-15: Pracownicy: makieta listy (pasek puli dni: wykorzystane, zaległe, z puli rocznej), okna: dodaj/edytuj, ustaw hasło, „Zamknij rok” z podglądem, do archiwum; 10 pytań. Nowe ikony przycisków: Ustaw hasło (`KeyRound`), Zamknij rok (`CalendarCheck`).
- 2026-11-14: Porty na komputerze: aplikacja 5180, makiety 5181, serwer 3006 (5173, 5174 i 3001 zajmują inne aplikacje); ustawione w `.env`.
- 2026-11-14: Moduł Logowanie zrobiony (potwierdzony przez użytkownika): 30 min bezczynności z ostrzeżeniem, hasło tymczasowe do zmiany, bez „Zapamiętaj mnie”, hasło z cyfrą i znakiem specjalnym, pierwszy administrator przez `npm run admin`.
- 2026-11-14: Logowanie: makieta ekranu logowania (kartka z kalendarza + formularz), stany: błąd, za dużo prób, po bezczynności, hasło tymczasowe, ostrzeżenie w panelu; 6 pytań.
- 2026-11-14: Moduł Wygląd zrobiony (potwierdzony przez użytkownika).
- 2026-11-14: Wygląd: wybrany wariant D „Nocny granat, cały ciemny”, zawsze ciemny motyw bez przełącznika; przeniesiony do `shared/src/theme.ts` i `theme.css`, opis w `docs/DESIGN.md`.
- Podgląd bazy (phpMyAdmin) na porcie 8081, bo 8080 zajmuje inny projekt.
- 2026-11-13: Plan aplikacji zaakceptowany (docs/OVERVIEW.md, docs/SPEC-GENERAL.md).

- 2026-11-14: Wygląd: użytkownikowi podoba się C, ale z ciemną treścią; dodany wariant D (cały ciemny). Wybór D zmieni ustalenie „tylko jasny motyw”.
- 2026-11-14: Wygląd: trzy warianty do porównania (A. Granat klasyczny, B. Atrament, C. Nocny granat); palety w `shared/src/theme.variants.ts`, bo test kolorów nie pozwala na kolory w `mockups/`.
- 2026-11-14: wygląd „Nocny granat”, zawsze ciemny motyw bez przełącznika (zamiast „tylko jasny”); szczegóły w `docs/DESIGN.md`.

- 2026-11-13: logowanie loginem w formie adresu e-mail, osobny nieobowiązkowy e-mail do powiadomień.
- 2026-11-13: brak dni w puli blokuje wniosek na typ odejmujący dni [decyzja AI].

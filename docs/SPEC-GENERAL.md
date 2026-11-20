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
| Projekt | np. Marketing, Produkcja, Montaż; własna tablica zadań; tworzy go administrator i wybiera pracowników, którzy go widzą (zmiana 2026-11-18) |

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
| Projekty: dodaj, edytuj, członkowie, kolejność, usuń na stałe (z zadaniami) | ✓ | — |
| Tablice zadań projektów: dodaje, edytuje, przeciąga, przypisuje, komentuje, usuwa (do archiwum) | ✓ (wszystkie projekty) | ✓ (tylko projekty, do których należy) |
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
| Zadania (rozwijane, bez własnej strony; zmiana 2026-11-18) | tasks | — | admin, employee |
| ↳ każdy projekt (pozycje z bazy, w kolejności z listy projektów) | tasks | `/admin/tasks/:projectId` | admin; employee tylko członek projektu |
| ↳ Projekty | tasks | `/admin/tasks/projects` | admin |
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
| `GET /api/my-leave/overview`, `GET/POST /api/my-leave/requests`, `POST /api/my-leave/requests/:id/withdraw` | employee | `mountModule(api, 'my-leave', …)`; każde zapytanie z `req.user.id`, cudzy wniosek → 404; administrator 403 |
| `GET /api/my-leave/requests/:id/pdf` | employee | tylko własny (cudzy → 404) i tylko zatwierdzony (inaczej 409); PDF `inline`, `no-store` |
| `/admin/leave-requests`, `/admin/leave-requests/:id`, `/api/leave-requests` | admin | adres `/:id` otwiera szczegóły wniosku (link z e-maila i z dzwonka) |
| `GET /api/leave-requests`, `GET /api/leave-requests/:id`, `POST /api/leave-requests/:id/approve`, `/:id/reject`, `/:id/cancel`, `GET /api/leave-requests/:id/pdf` | admin | `mountModule(api, 'leave-requests', …)`; kto decyduje = `req.user`; nieistniejący → 404; decyzja na rozpatrzonym → 409 `already_decided`; anulowanie w zamkniętym roku → 409 `year_closed`; PDF tylko zatwierdzonego (inaczej 409) |
| `/admin/tasks/:projectId`, `/admin/tasks/projects`, `/api/tasks` | admin, employee | tablica projektu tylko dla członków projektu i administratorów (cudzy projekt → 404); lista projektów i zmiany projektów tylko administrator |
| `GET /api/tasks/projects` | admin, employee | `mountModule(api, 'tasks', …)`; administrator wszystkie projekty, pracownik tylko swoje (warunek w SQL z `req.user`) |
| `GET /api/tasks/projects/candidates`, `POST /api/tasks/projects`, `PUT /api/tasks/projects/:id`, `POST /api/tasks/projects/:id/move`, `DELETE /api/tasks/projects/:id` | admin | `requireRole('admin')`; usunięcie na stałe tylko z dokładną nazwą (`confirmName`, inaczej 400) |
| `GET /api/tasks/projects/:id/board`, `POST /api/tasks/projects/:id/tasks` | admin, employee | tylko projekt, który osoba widzi (inaczej 404); termin nowego zadania ≥ dziś; przypisani tylko członkowie i administratorzy |
| `PUT /api/tasks/:taskId`, `POST /api/tasks/:taskId/move`, `POST /api/tasks/:taskId/archive` | admin, employee | tylko zadanie spoza archiwum z projektu, który osoba widzi (inaczej 404); pozycję i datę realizacji liczy serwer |
| `GET/POST /api/tasks/:taskId/comments`, `PUT/DELETE /api/tasks/comments/:commentId` | admin, employee | komentarze (część 2): tylko zadanie spoza archiwum z projektu, który osoba widzi (inaczej 404); autor z `req.user`; poprawia tylko autor, usuwa autor albo administrator (inaczej 403 `tasks.comment_not_author`) |
| `/admin/employees`, `/api/employees` | admin | także pule i „Zamknij rok” |
| `GET/POST /api/employees`, `PUT /api/employees/:id`, `POST /api/employees/:id/password`, `/:id/archive`, `/:id/restore`, `GET/POST /api/employees/close-year`, `GET /api/employees/contract-types` | admin | `mountModule(api, 'employees', …)`; własnej roli i własnego konta do archiwum nie (409) |
| `/admin/leave-types`, `/api/leave-types` | admin | lista typów do formularza wniosku: osobna trasa w `my-leave` |
| `GET/POST /api/leave-types`, `PUT /api/leave-types/:id`, `POST /api/leave-types/:id/move`, `/:id/hide`, `/:id/unhide` | admin | `mountModule(api, 'leave-types', …)`; ostatniego widocznego typu nie ukryjesz (409) |
| `/admin/contract-types`, `/api/contract-types` | admin | lista typów do okna pracownika: osobna trasa w `employees` |
| `GET/POST /api/contract-types`, `PUT /api/contract-types/:id`, `POST /api/contract-types/:id/move`, `/:id/hide`, `/:id/unhide` | admin | `mountModule(api, 'contract-types', …)`; można ukryć wszystkie typy (rodzaj umowy jest nieobowiązkowy) |
| `/admin/activity-log`, `/api/activity-log` | admin | |
| `/admin/archive`, `/api/archive` | admin | przywrócenie i usunięcie na stałe; adres `?tab=tasks&taskId=<id>` otwiera podgląd zadania |
| `GET /api/archive/counts`, `GET /api/archive/employees`, `POST /api/archive/employees/:id/restore`, `DELETE /api/archive/employees/:id`, `GET /api/archive/tasks`, `GET /api/archive/tasks/:id`, `POST /api/archive/tasks/:id/restore`, `DELETE /api/archive/tasks/:id` | admin | `mountModule(api, 'archive', …)`; tylko rekordy z archiwum (aktywny: podgląd 404, usunięcie 409 `server.archive_first`); konto z wnioskami urlopowymi nie do usunięcia (409); usunięcie konta tylko z dokładnym imieniem i nazwiskiem (`confirmName`, inaczej 400) |
| `/admin/my-account`, `GET /api/my-account`, `PUT /api/my-account/email`, `POST /api/my-account/password` | admin, employee | `mountModule(api, 'my-account', …)`; tylko własne konto (`req.user.id`, numer z treści żądania pomijany); zmiana hasła z obecnym, limit 10 nieudanych prób w 15 min na konto (429), nowe ciasteczko sesji, inne sesje kończą się |
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
| `projects` | `name` (unikalna), `position` (zmiana 2026-11-18; bez archiwum: projekt usuwa się na stałe) |
| `project_members` | `project_id`, `user_id`; klucz główny (`project_id`, `user_id`) |
| `tasks` | `project_id`, `title`, `description` NULL, `due_date` NULL, `column_key` (`draft`/`in_progress`/`done`), `position`, `completed_at` NULL, `created_by` NULL, `created_by_name`, `archived_at`, `archived_by` |
| `task_comments` | `task_id`, `user_id` NULL, `user_name`, `text`, `edited_at` NULL, `created_at` |
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
| `users` | `leave_requests.user_id` | RESTRICT | historia urlopów zostaje: konto z wnioskami zostaje w archiwum na zawsze (Archiwum, odpowiedź 1a) |
| `users` | `leave_requests.decided_by` | SET NULL + `decided_by_name` | autorstwo decyzji |
| `leave_types` | `leave_requests.leave_type_id` | RESTRICT | typ użyty we wnioskach można tylko ukryć |
| `users` | `tasks.created_by` | SET NULL + `created_by_name` | autorstwo |
| `users` | `tasks.archived_by` | SET NULL | autorstwo archiwizacji |
| `tasks` | `task_assignees.task_id` | CASCADE | przypisanie bez zadania nie ma sensu |
| `projects` | `tasks.project_id` | CASCADE | „Usuń projekt” usuwa na stałe razem z zadaniami (odpowiedź 13, potwierdzenie wpisaniem nazwy) |
| `projects` | `project_members.project_id` | CASCADE | członkostwo bez projektu nie ma sensu |
| `users` | `project_members.user_id` | CASCADE | usunięta na stałe osoba znika z projektów |
| `tasks` | `task_comments.task_id` | CASCADE | komentarz bez zadania nie ma sensu |
| `users` | `task_comments.user_id` | SET NULL + `user_name` | komentarz zostaje po usunięciu osoby |
| `users` | `task_assignees.user_id` | CASCADE | usunięta na stałe osoba znika z przypisań |
| `users` | `notifications.user_id` | CASCADE | powiadomienia należą do osoby |

### Archiwum

- **Pracownicy** (`users`): „Do archiwum” wyłącza logowanie od razu (`authenticate` czyta konto z bazy). Wnioski,
  pule i historia zostają. Zarchiwizowanej osoby nie da się przypisać do nowego zadania; przy starych widać dopisek
  „zarchiwizowany”. Login i e-mail obejmują archiwum: zamiast drugiego konta z tym samym loginem aplikacja proponuje
  przywrócenie.
- **Zadania** (`tasks`): „Usuń” na tablicy przenosi do archiwum. **Projekty** (`projects`) nie mają archiwum: „Usuń”
  usuwa projekt na stałe razem z zadaniami (także tymi w archiwum) i komentarzami, po wpisaniu nazwy projektu.
- Przywraca i usuwa na stałe **tylko administrator**, tylko rekord z archiwum (inaczej 409 `server.archive_first`).
- **Wniosków urlopowych się nie usuwa** (statusy: wycofany, odrzucony, anulowany). Typy urlopów się ukrywa
  (`hidden_at`), nie archiwizuje.

### Historia zmian

Włączona. Zakres: wnioski urlopowe (złożenie, wycofanie, zatwierdzenie, odrzucenie, anulowanie), pule dni (zmiana,
„Zamknij rok”), zadania (utworzenie, edycja, przesunięcie, przypisanie, archiwizacja, przywrócenie, usunięcie),
pracownicy (utworzenie, zmiana roli, archiwizacja, przywrócenie), typy urlopów i typy umów (dodanie, zmiana, ukrycie,
przywrócenie; dopisane 2026-11-20). Każdy wpis zapamiętuje nazwę i krótki opis rekordu (`entity_name`,
`entity_context`), więc zostaje czytelny po usunięciu rekordu. Wpisy trzymane zawsze. Widzi tylko administrator. Tabelę `activity_log`
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
  anulowaniu swojego urlopu i o przypisaniu do zadania; przypisane osoby o nowym komentarzu do zadania (zmiana
  2026-11-18).
- Brak plików i zestawień na start (pomysły w `docs/IDEAS.md`).

### Biblioteki

| Biblioteka | Do czego | Moduł | Zgoda |
|---|---|---|---|
| `nodemailer` | e-mail | email | lista zatwierdzona |
| `pdfmake` | PDF wniosku urlopowego | my-leave | lista zatwierdzona |
| `@dnd-kit` | przeciąganie kart na tablicy zadań, także palcem na telefonie | tasks | zgoda użytkownika 2026-11-18 (odpowiedź 8) |

## 9. Ostatnie decyzje (archiwum)

- 2026-11-20: Moduł Moje konto zrobiony (potwierdzony przez użytkownika): e-mail do powiadomień widzą obie role (pracownik z dopiskiem, że na razie nie dostaje e-maili), zmiana hasła wymaga obecnego, po zmianie inne urządzenia są wylogowane, wpisy w Historii zmian; e-mail do 190 znaków jak w Pracownikach.
- 2026-11-19: Zadania, część 2: zbudowana (kroki 0–10), przegląd kodu z poprawkami (komunikat i odświeżenie przy komentarzu do usuniętego zadania, kolejność blokad, fragment powiadomienia bez przecinania emotikon); `npm run check` i 41 testów e2e zielone.
- 2026-11-19: Zadania: spec części 2 zaakceptowany (`SPEC-2.md`: komentarze w podglądzie, poprawia autor, usuwa autor albo administrator, licznik na karcie, powiadomienie `task_comment` dla przypisanych); napisane `PLAN-2.md` (11 kroków) i `TESTS-2.md`.
- 2026-11-19: Zadania, część 1 (projekty i tablice) gotowa, potwierdzona przez użytkownika („działa”).
- 2026-11-19: Aktualizacja stepkit do 0.1.44: hasło stałych kont testowych `E2E_PASSWORD` w `.env` (losowe), sprzątanie po testach w przeglądarce (`e2e/global-teardown.ts`, `npm run cleanup:e2e -w @app/backend`) także projektów „E2E …”; konta tymczasowe zostają tam, gdzie test potrzebuje świeżego pracownika (pula, wnioski, osoby w projekcie), i znikają po testach; aktualne `docs/CONVENTIONS.md` i `docs/conventions/`. Dwa przebiegi e2e (40 testów) zielone, potem w bazie tylko stałe konta testowe.
- 2026-11-19: Zadania: znacznik „Zakończone” (prośba użytkownika): karta zostaje w kolumnie, wyszarzona, z plakietką; poprawki przeciągania zgłoszone przy testach (pętla przy nagłówku, ramka pod kursorem, kopia karty bez rozciągania i bez lotu do starej kolumny).
- 2026-11-18: Zadania, część 1: zbudowana (kroki 0–19), przegląd kodu z poprawkami (blokada projektu przy zapisach, tablica zostaje przy nieudanym odświeżeniu, zapis tylko zmienionych pól); `npm run check` i 33 testy e2e zielone.
- 2026-11-18: Zadania: spec części 1 zaakceptowany; napisane `PLAN-1.md` (20 kroków) i `TESTS-1.md`.
- 2026-11-18: Zadania: podział na 2 części zaakceptowany (1. projekty i tablice, 2. komentarze); napisane `SPEC.md` i `SPEC-1.md`; zmiana roli administrator → pracownik dopisuje go do projektów z jego otwartymi zadaniami.
- 2026-11-18: Zadania: odpowiedzi na wszystkie pytania makiety (`@dnd-kit` zatwierdzony, projekt usuwa się na stałe z zadaniami po wpisaniu nazwy, osoba usunięta z projektu znika tylko z otwartych zadań, reszta jak w rekomendacjach); panele pytań usunięte z makiety.
- 2026-11-18: Poprawka (zgłoszenie użytkownika): tabela Wniosków urlopowych i Moich urlopów nie skacze przy zmianie zakładki i roku (`keepPreviousData`).
- 2026-11-18: Zadania: zmiana zakresu na prośbę użytkownika: projekty jako podmenu „Zadań” (tworzy administrator, pracownik widzi tylko swoje), komentarze z powiadomieniem, dodawanie w oknie, podgląd z prawej 540 px, odświeżanie co 5 s (odpowiedź 7); makieta przerobiona, 15 otwartych pytań; wspólne `OrderArrows` w makietach.
- 2026-11-18: Zadania: makieta tablicy (trzy kolumny z przeciąganiem, na telefonie jedna kolumna naraz, „Tylko moje zadania”, wyszukiwarka, chowanie zrealizowanych po 30 dniach), formularz w szufladzie z prawej (dodaj i edytuj, ostrzeżenie o urlopie osoby przed terminem), usunięcie do archiwum; 9 pytań.
- 2026-11-18: Aktualizacja stepkit do 0.1.40: wspólny typ `Db` w `backend/src/db/pool.ts` zamiast kopii w modułach, nowy plik `docs/FIXES.md` na odłożone poprawki (na razie pusty: w `IDEAS.md` nie było otwartych poprawek), aktualne zasady w `docs/CONVENTIONS.md` i `docs/conventions/`.
- 2026-11-17: Moduł Wnioski urlopowe zrobiony (potwierdzony przez użytkownika: „działa”): lista z zakładkami i filtrami, szczegóły pod `/admin/leave-requests/:id` (link z e-maila i dzwonka) z paskiem „Kto jeszcze ma wtedy wolne”, zatwierdzenie w oknie potwierdzenia, odrzucenie i anulowanie z obowiązkowym powodem, PDF, powiadomienia dla pracownika.
- 2026-11-17: Wnioski urlopowe: 14 prób nadużyć (trasy i prawdziwa baza), jedna naprawiona (numer z adresu tylko z cyfr, `addressNumber` w `fields.ts`); sprawdzenie w przeglądarce (lista, szczegóły, zatwierdzenie, odrzucenie, telefon), tytuł szczegółów szeryfowy jak w makiecie; `npm run check` i 32 testy e2e zielone (pełny przebieg).
- 2026-11-17: Wnioski urlopowe: zbudowane (kroki 0–16: lista z zakładkami i filtrami, szczegóły pod `/admin/leave-requests/:id` z paskiem „Kto jeszcze ma wtedy wolne”, zatwierdzenie w oknie, odrzucenie i anulowanie z powodem, PDF, powiadomienia), przegląd kodu z poprawkami, `npm run check` i 31 testów e2e zielone. Wspólne: `LeaveRequestParts`, `SearchField`, `sendInlinePdf`, `leaveRequestPdfData`, `likePattern`, adresy podstron (`detailPath`).
- 2026-11-17: Wnioski urlopowe: spec zaakceptowany (zatwierdzenie z oknem, powód odrzucenia i anulowania obowiązkowy, `reject_reason` → `decision_reason`, adres szczegółów `/admin/leave-requests/:id`, bez podziału na części).
- 2026-11-17: Wnioski urlopowe: odpowiedzi 2a–8a, zasady pól ok (pasek z zatwierdzonymi i czekającymi, powód odrzucenia i anulowania obowiązkowy 3–500 znaków, anulowanie każdego urlopu z niezamkniętego roku, miniony termin można rozpatrzyć, na start „Czekają”, link z e-maila otwiera szczegóły).
- 2026-11-17: Wnioski urlopowe: odpowiedź 1b, zatwierdzenie z oknem potwierdzenia „Zatwierdzić wniosek?”.
- 2026-11-17: Wnioski urlopowe: makieta listy (zakładki statusów, wyszukiwarka, filtr typu i roku, kolumna „Zostało w puli”, karty na telefonie), szczegółów z prawej (pasek „Kto jeszcze ma wtedy wolne”, pula, decyzja), okien odrzucenia i anulowania z powodem; 9 pytań.
- 2026-11-17: Poprawka (z `IDEAS.md`, potwierdzona: „działa”): dokończone porządki „wspólne zamiast kopii”: `notFound` i nowe `isDuplicateEntry` (`backend/src/db/errors.ts`) w serwerze, `currentYear` w `shared`, okno „Przywrócić konto?” na `ConfirmModal`, w makietach wspólne `ConfirmModal`, `PageHeader`, `EmptyState`, `ListPagination`.
- 2026-11-17: Moduł Moje urlopy zrobiony (część 2 potwierdzona przez użytkownika: „działa”): pula i limity, składanie i wycofywanie wniosków z blokadami, powiadomienia i e-mail, PDF zatwierdzonego wniosku w nowej karcie (wspólne `backend/src/pdf/` dla modułu 9), `npm run my-leave:approve-test`.
- 2026-11-17: Moje urlopy, część 2: zbudowane (kroki 0–7: `pdfmake`, wspólne `backend/src/pdf/` z `renderPdf` i `buildLeaveRequestPdf`, trasa `GET /api/my-leave/requests/:id/pdf`, przycisk „PDF”, `npm run my-leave:approve-test`), przegląd kodu z poprawkami, 9 prób nadużyć odpartych, sprawdzenie w przeglądarce, `npm run check` i 30 testów e2e zielone.
- 2026-11-17: Moje urlopy: plan części 2 zaakceptowany (8 kroków, od szkieletu testów do przeglądu kodu).
- 2026-11-17: Moje urlopy: spec części 2 zaakceptowany (`SPEC-2.md`: przycisk „PDF” przy zatwierdzonym wniosku otwiera PDF w nowej karcie, dokument we wspólnym `backend/src/pdf/` dla modułu 9, polecenie `npm run my-leave:approve-test` do sprawdzenia przed modułem 9).
- 2026-11-17: Moje urlopy, część 1 (wnioski i pula) gotowa, potwierdzona przez użytkownika („działa”).
- 2026-11-17: Moje urlopy, część 1: próby nadużyć (11, wszystkie odparte) jako testy, sprawdzenie w przeglądarce obu ról.
- 2026-11-17: Moje urlopy, część 1: zbudowane (kroki 0–14, przegląd kodu z poprawkami: blokada przy liczeniu czekających wniosków w „Zamknij rok”, odświeżenie po odmowie serwera), `npm run check` i 27 testów e2e zielone.
- 2026-11-17: Moje urlopy: plan części 1 zaakceptowany (15 kroków, od szkieletu testów do przeglądu kodu).
- 2026-11-17: Moje urlopy: spec zaakceptowany (`SPEC.md` ogólny, `SPEC-1.md` część 1).
- 2026-11-17: Moje urlopy: moduł w dwóch częściach (1: wnioski i pula, 2: wydruk PDF); „Zamknij rok” zablokowany, dopóki są wnioski czekające z zamykanego roku (odpowiedź a).
- 2026-11-17: Moje urlopy: odpowiedzi 1a–9a, zasady pól ok (wniosek w jednym roku, przyszły rok po „Zamknij rok”; czekające rezerwują dni; od dziś; bez nakładania się; bez edycji, tylko wycofanie; PDF z podpisami; wybór roku; e-mail tylko przy nowym wniosku).
- 2026-11-17: Moje urlopy: makieta (pula roku otwartego z paskiem i limitami typów, tabela wniosków z wyborem roku, okno wniosku z paskiem dni i liczeniem na bieżąco, stany: za mało dni, limit typu, termin zajęty, przyszły rok, wycofanie, podgląd PDF); 9 pytań.
- 2026-11-18: Zadania: odpowiedzi na pytania makiety: `@dnd-kit` zatwierdzony; projekt usuwa się na stałe z zadaniami; osoba usunięta z projektu znika z otwartych zadań; reszta jak w rekomendacjach.
- 2026-11-18: Zadania: projekty (Marketing, Produkcja, Montaż…) jako podmenu „Zadań”, każde zadanie w projekcie, pracownik widzi tylko swoje projekty; komentarze z powiadomieniem dla przypisanych; dodawanie zadania w oknie, podgląd z prawej 540 px; tablica odświeża się co 5 s.
- 2026-11-16: Porządki „wspólne zamiast kopii”: `ConfirmModal`, `PageHeader`, `EmptyState`, `ListPagination` (`frontend/src/common/`) i `useListParams` (`frontend/src/core/`) w Pracownikach, Typach urlopów, Typach umów i Powiadomieniach; okno potwierdzenia przy błędzie zostaje otwarte.
- 2026-11-16: Aktualizacja stepkit 0.1.34 → 0.1.36: wspólne pole daty i grupy w menu bez własnej strony były już w projekcie; nowa zasada „Wspólne zamiast kopii” (przed planem sprawdzam, czy coś podobnego już jest, i przenoszę do wspólnego miejsca).
- 2026-11-16: Moduł Typy umów zrobiony (potwierdzony przez użytkownika): słownik typów umów w „Ustawieniach” (kolejność strzałkami, dodawanie, zmiana nazwy, ukrywanie i przywracanie, 4 typy na start), pole „Rodzaj umowy” u pracownika z typów (`users.contract_type_id`), pracownik zachowuje ukryty typ.
- 2026-11-16: Typy umów: zbudowane (kroki 0–9, przegląd kodu z poprawkami), `npm run check` i wszystkie testy e2e zielone; umowy pracowników przepisane na typy ze słownika (1 z 12 kont miało umowę, po zmianie tak samo).
- 2026-11-16: Typy umów: plan zaakceptowany (10 kroków, od szkieletu testów do przeglądu kodu).
- 2026-11-16: Typy umów: spec zaakceptowany (słownik z kolejnością i ukrywaniem, `users.contract_type_id` zamiast stałej listy, pracownik zachowuje ukryty typ).
- 2026-11-16: Typy umów: odpowiedzi 1a–4a, zasady pól ok (pracownik zachowuje ukryty typ, kolejność strzałkami, kolumna „Pracownicy”, tylko nazwa).
- 2026-11-16: Typy umów: makieta listy (kolejność strzałkami, „Pokaż ukryte”, kolumna „Pracownicy”), okna dodaj/edytuj (ostrzeżenie przy typie, który mają pracownicy) i ukryj, podgląd pola „Rodzaj umowy” w oknie pracownika; 5 pytań. Ikona menu: `file-signature`.
- 2026-11-16: Nowy moduł 7 „Typy umów” (contract-types) przed „Moimi urlopami”: administrator prowadzi listę typów umów w menu „Ustawienia”; obecne 4 rodzaje umowy staną się typami na start.
- 2026-11-16: Poprawka w Pracownikach (prośba użytkownika): nieobowiązkowe „Data zatrudnienia” i „Rodzaj umowy” (umowa o pracę, zlecenie, o dzieło, B2B) w oknach dodaj/edytuj i jako kolumny listy; wspólne pole daty `DateField`.
- 2026-11-16: Aktualizacja stepkit 0.1.33 → 0.1.34: pomysły, zmiany i błędy zgłaszane poleceniem `/stepkit:zglos` (linia w README).
- 2026-11-16: Aktualizacja stepkit 0.1.29 → 0.1.33: baza w strefie UTC (`--default-time-zone=+00:00`), wspólne `formatRelativeDateTime`/`formatRelativeDay` w `shared/src/date.ts` zamiast własnych w Powiadomieniach, README: nowa rozmowa przez `/clear`. Powrót po zalogowaniu, `timezone: 'Z'` i podświetlenie menu projekt już miał.
- 2026-11-16: Moduł Powiadomienia zrobiony (potwierdzony przez użytkownika): dzwonek w belce (okienko na komputerze, panel na cały ekran na telefonie), strona `/admin/notifications`, `notifyUsers`/`notifyAdmins` dla urlopów i zadań, `npm run notifications:test`; poprawka: godziny z bazy czytane w UTC (`timezone: 'Z'`).
- 2026-11-16: Powiadomienia: spec zaakceptowany (dzwonek, strona „wszystkie”, `notifyUsers`/`notifyAdmins` dla kolejnych modułów, `npm run notifications:test`).
- 2026-11-16: Powiadomienia: odpowiedzi 1a–6a (strona „wszystkie”, przeczytane po kliknięciu, odświeżanie co minutę, przeczytane usuwane po 90 dniach, każdy administrator osobno, teksty ok).
- 2026-11-16: Powiadomienia: makieta dzwonka w belce (licznik nieprzeczytanych, 8 ostatnich, „Oznacz wszystkie jako przeczytane”) i strony „wszystkie” (grupy po dniach, filtr „Nieprzeczytane”); 6 pytań.
- 2026-11-16: Moduł E-mail zrobiony (potwierdzony przez użytkownika): e-mail „Nowy wniosek urlopowy” do administratorów z e-mailem (`emailAdminsAboutNewRequest`, woła go „Moje urlopy” bez czekania), skrzynka testowa Mailpit (port 8026), `npm run email:test`, po zalogowaniu powrót na otwierany adres w panelu (`?next=`, `safeNextPath`).
- 2026-11-16: Skrzynka testowa Mailpit na porcie 8026 (`MAILPIT_PORT` w `.env`), bo 8025 zajmuje inny projekt.
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

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
| Typy urlopów | leave-types | `/admin/leave-types` | admin |
| Historia zmian | activity-log | `/admin/activity-log` | admin |
| Archiwum | archive | `/admin/archive` | admin |
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
| `/admin`, `/api/dashboard` | admin, employee | treść zależna od roli; employee tylko własne dane |
| `/admin/my-leave`, `/api/my-leave` | employee | tylko własne wnioski i pule (`req.user.id`) |
| `/admin/leave-requests`, `/api/leave-requests` | admin | |
| `/admin/tasks`, `/api/tasks` | admin, employee | wspólna tablica, każdy edytuje wszystko |
| `/admin/employees`, `/api/employees` | admin | także pule i „Zamknij rok” |
| `/admin/leave-types`, `/api/leave-types` | admin | lista typów do formularza wniosku: osobna trasa w `my-leave` |
| `/admin/activity-log`, `/api/activity-log` | admin | |
| `/admin/archive`, `/api/archive` | admin | przywrócenie i usunięcie na stałe |
| `/admin/my-account`, `/api/my-account` | admin, employee | tylko własne konto |
| `/api/notifications` | admin, employee | `mountModule(api, 'notifications', …, ['admin', 'employee'])`; tylko własne |
| `/api/email` (jeśli powstanie) | admin | `mountModule(api, 'email', …, ['admin'])` |

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
| 1 | Wygląd | appearance | — | — | zawsze pierwszy: odcienie ciemnego niebieskiego, tylko jasny motyw |
| 2 | Logowanie | login | appearance | login | `users` z loginem i e-mailem do powiadomień, `activity_log`, ekran logowania, pierwszy administrator, wylogowanie po bezczynności |
| 3 | Pracownicy | employees | login | — | wnioski potrzebują pracowników i ich pul; zakładanie kont, ustawianie hasła, pule, „Zamknij rok”, archiwizacja |
| 4 | Typy urlopów | leave-types | login | — | formularz wniosku potrzebuje typów; mały moduł |
| 5 | E-mail | email | login | — | przed pierwszym modułem, który wysyła e-mail (nowy wniosek → administrator) |
| 6 | Powiadomienia | notifications | login | — | dzwonek w belce; używają go urlopy i zadania |
| 7 | Moje urlopy | my-leave | employees, leave-types, email, notifications | — | najważniejsze na start: składanie i wycofywanie wniosków, liczenie dni roboczych, blokada przy braku dni, wydruk |
| 8 | Wnioski urlopowe | leave-requests | my-leave | — | decyzje administratora: zatwierdź, odrzuć z powodem, anuluj, wydruk / PDF |
| 9 | Zadania | tasks | employees, notifications | — | tablica z przeciąganiem, filtr „Tylko moje”, chowanie starych zrealizowanych |
| 10 | Historia zmian | activity-log | employees, my-leave, leave-requests, tasks | — | ekran do wpisów, które zapisują wcześniejsze moduły |
| 11 | Archiwum | archive | employees, tasks | — | wspólny ekran przywracania i usuwania na stałe |
| 12 | Moje konto | my-account | login | — | zmiana własnego hasła i e-maila do powiadomień |
| 13 | Pulpit | dashboard | my-leave, leave-requests, tasks | — | zbiera liczby z urlopów i zadań, więc na końcu |
| 14 | Publikacja | deploy | wszystkie moduły | — | zawsze ostatni: OVH, domena, strona przerwy technicznej |

[decyzja AI] Urlopy (najważniejsze na start) zaczynają się od modułu 7, a nie zaraz po Logowaniu, bo wniosek potrzebuje
pracowników z pulami, typów urlopów, e-maila i powiadomień. Moduły 3–6 są małe i budują tylko to, czego urlopy
wymagają.

## 8. Zasady wspólne

- Tylko jedna firma: bez wzorca „wiele firm”. Bez „dostępu nadawanego przez administratora”.
- Tylko język polski; tylko jasny motyw (`COLOR_SCHEME_TOGGLE = false`).
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

- 2026-11-13: logowanie loginem w formie adresu e-mail, osobny nieobowiązkowy e-mail do powiadomień.
- 2026-11-13: brak dni w puli blokuje wniosek na typ odejmujący dni [decyzja AI].

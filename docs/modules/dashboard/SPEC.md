# Spec: Pulpit

**Data:** 2026-11-20 · **Status:** zaakceptowany 2026-11-20
**Podstawa:** `QUESTIONS.md` (odpowiedzi 1a–7a), `SPEC-GENERAL.md`, makieta
`mockups/src/modules/dashboard/DashboardMockup.tsx`

## Cel

Po zalogowaniu każda osoba od razu widzi, co jest do zrobienia. Administrator: wnioski czekające na decyzję, kto
będzie nieobecny w najbliższych 2 tygodniach, stan tablic projektów i zadania po terminie. Pracownik: ile dni urlopu
mu zostało, co z jego wnioskami i jakie zadania na niego czekają. Pulpit tylko pokazuje i prowadzi dalej; żadnej
akcji (zatwierdzenia, przeciągania) nie robi się na nim.

Moduł działa, gdy: pracownik złoży wniosek, a administrator po wejściu na Pulpit widzi go w „Wnioskach do
rozpatrzenia” i na pasku nieobecności (żółty), kliknięcie otwiera szczegóły wniosku; po zatwierdzeniu pracownik widzi
na swoim Pulpicie mniejszą liczbę dni i ten urlop jako najbliższy zatwierdzony.

## Ekrany

### Pulpit (`/admin`, administrator i pracownik)

Pozycja „Pulpit” w menu już jest. Nagłówek `PageHeader`: „Pulpit” i linijka „Dziś piątek, 20.11.2026” (dzień tygodnia
małą literą i `formatDate`, dzień w strefie `Europe/Warsaw`). Boksy `InfoCard` w siatce `Grid` (na telefonie jedna
kolumna). Ładowanie i błąd pobierania: `DataState` dla całego ekranu (jedno zapytanie). Dane odświeżają się przy
każdym wejściu na Pulpit i po powrocie do karty przeglądarki (domyślne zachowanie TanStack Query). **[decyzja AI]**

Wspólne zasady boksów z listą:
- Boks pokazuje najwyżej 5 pozycji (`DASHBOARD_BOX_LIMIT = 5` w `shared/src/constants/dashboard.ts`). Wnioski: link
  „Wszystkie wnioski” zawsze, liczba w znaczniku obok tytułu. Zadania: pod listą „i jeszcze N zadań”, gdy jest więcej.
- Cały wiersz jest linkiem (klawiatura: Tab i Enter).
- Termin zadania jak na karcie zadania: po czasie `red.4`, dziś i jutro `yellow.4` z napisem „dziś” / „jutro”, bez
  terminu szare „bez terminu”, inny dzień `DateText`.

#### Administrator (górny rząd: wnioski 5/12 i nieobecności 7/12; dolny: stan tablic 7/12 i moje zadania 5/12)

**Wnioski do rozpatrzenia** (odpowiedź 2a). Tytuł z żółtym znacznikiem liczby wszystkich czekających (bez znacznika,
gdy 0). Wnioski o statusie „czeka na decyzję” z każdego roku, od najwcześniejszego początku urlopu (przy równym:
wcześniej złożony). Wiersz: imię i nazwisko (pogrubione), „typ, od – do”, pod spodem szare „złożony DD.MM.RRRR,
zaczyna się za N dni”; po prawej znacznik z liczbą dni roboczych (`working_days`). Gdy do początku zostało 7 dni lub
mniej, „zaczyna się …” jest żółte i pogrubione. Gdy początek jest dziś: „zaczyna się dziś”, jutro: „zaczyna się
jutro”, już minął: „termin już się zaczął” (też żółte). **[decyzja AI: teksty dla dziś i minionego terminu]**
Kliknięcie: szczegóły wniosku `/admin/leave-requests/:id`. Na dole link „Wszystkie wnioski” (`/admin/leave-requests`).
Pusto: „Wszystkie wnioski są rozpatrzone. Nowy wniosek pojawi się tutaj i w dzwonku.”

**Nieobecności w najbliższych 2 tygodniach** (odpowiedź 1a). Nad paskiem: „Dziś nie ma: <imiona po przecinku>” (osoby
z urlopem **zatwierdzonym** obejmującym dziś) albo „Dziś wszyscy są w pracy.” Pasek dzień po dniu: dziś i 13 kolejnych
dni (`DASHBOARD_ABSENCE_DAYS = 14`), nagłówek dni (skrót dnia tygodnia, numer; dziś podkreślone `navy.4`), wiersz dla
każdej osoby z wnioskiem zatwierdzonym (zielony `green.9`) albo czekającym (żółty `yellow.8`), który zahacza o ten
okres; weekendy i święta przekreślone linią przerywaną, dymek z nazwą święta. Osoby w kolejności pierwszego dnia
nieobecności, potem po nazwisku. Konta w archiwum pomijane. Legenda pod paskiem. Na wąskim ekranie pasek przewija się
w bok. Pusto: „W najbliższych 2 tygodniach nikt nie ma urlopu.” Rama ta sama co „Kto jeszcze ma wtedy wolne”
w szczegółach wniosku: wspólny klocek (plan, „Wydzielam”).

**Stan tablic** (odpowiedź 3a). Tabela (`Table.ScrollContainer`): Projekt (link do tablicy `/admin/tasks/:id`),
W opracowaniu, W toku, Po terminie (czerwone i pogrubione, gdy > 0; szare 0), Zrealizowane (30 dni). Projekty
w kolejności z menu „Zadania”. Liczone tylko zadania spoza archiwum. „Po terminie” = termin wcześniejszy niż dziś
i kolumna inna niż „Zrealizowane” (te zadania liczą się też w swojej kolumnie). „Zrealizowane (30 dni)” = data
realizacji w ostatnich `TASK_HIDE_DONE_AFTER_DAYS` dniach. Pod tabelą „Zadania po terminie”: najwyżej 5 zadań ze
wszystkich projektów, od najstarszego terminu; wiersz jak w „Moich zadaniach” plus kółka przypisanych osób
(`PersonAvatar` z dymkiem; konto w archiwum szare). Pusto (nie ma projektów): „Nie ma jeszcze projektów. Dodaj
pierwszy na liście projektów.” Brak zadań po terminie: „Żadne zadanie nie jest po terminie.” Link na dole „Projekty”
(`/admin/tasks/projects`).

**Moje zadania** (odpowiedzi 4a, 5a): jak u pracownika, niżej.

#### Pracownik (górny rząd: pula 7/12 i moje wnioski 5/12; dolny: moje zadania na całą szerokość)

Pracownik nie widzi nieobecności innych osób (odpowiedź 7a): odpowiedź serwera dla pracownika nie ma takich danych.

**Urlop w <rok>**: ta sama karta co na ekranie Moje urlopy (duża liczba dni do wykorzystania, pasek z czterema
częściami, legenda), wspólny klocek (plan, „Wydzielam”); pod nią przycisk „Złóż wniosek” (ikona `add`), który prowadzi
na `/admin/my-leave`. Pula roku otwartego. Pracownik bez puli: zamiast liczby zdanie „Pula dni nie jest jeszcze
ustalona. Zapytaj administratora.” i bez przycisku. **[decyzja AI]**

**Moje wnioski**: „Czeka na decyzję”: wszystkie własne wnioski w tym statusie, od najwcześniejszego początku („typ,
od – do”, żółty znacznik „Czeka na decyzję”); pusto: „Żaden wniosek nie czeka na decyzję.” Pod kreską „Najbliższy
zatwierdzony urlop”: zatwierdzony wniosek z końcem dziś albo później, o najwcześniejszym początku (trwający też się
liczy), ze znacznikiem liczby dni (`green`); brak: „Nie masz zaplanowanego urlopu.” Link „Moje urlopy”.

**Moje zadania** (obie role). Zadania przypisane do mnie, w kolumnie „W opracowaniu” albo „W toku”, spoza archiwum,
z projektów, które widzę (pracownik: tylko projekty, do których należy; administrator: wszystkie). Kolejność: najpierw
po terminie, potem według terminu, bez terminu na końcu (przy równym: projekt w kolejności z menu, potem pozycja na
tablicy). Wiersz: tytuł (najwyżej 2 linie), znacznik projektu, nazwa kolumny, termin po prawej. Kliknięcie: tablica
projektu z otwartym podglądem zadania (`taskBoardPath(projectId, taskId)`, odpowiedź 6a; tablica już to umie). Pusto:
„Nie masz przypisanych zadań w toku ani w opracowaniu.”

### Pola formularzy

Brak: Pulpit nie ma formularzy.

## Dane

Bez nowych tabel i migracji. Pulpit czyta dane innych modułów wyłącznie ich funkcjami (sekcja „Powiązania”).
Bez wpisów w Historii zmian (nic nie zmienia).

## API

| Metoda i adres | Kto | Dane wejściowe | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/dashboard` | admin, employee | brak | administrator: `{ role: 'admin', today, pending: { items, total }, absences, projects, overdue: { items, total }, myTasks: { items, total } }`; pracownik: `{ role: 'employee', today, pool \| null, myPending, nextLeave \| null, myTasks: { items, total } }` | 401 bez logowania; 403 z hasłem tymczasowym |

- Moduł podpięty `mountModule(api, 'dashboard', dashboardRoutes)`; role z pozycji „Pulpit” w nawigacji (obie).
- Kim jest osoba i jaką ma rolę: tylko `req.user`. Pracownik dostaje wyłącznie własne dane (`req.user.id`), bez
  `pending`, `absences`, `projects` i `overdue`.
- Liczy serwer: „dziś” (`todayIsoDate()` w strefie aplikacji), wszystkie liczby, kolejność, przycięcie list do 5
  i `total`, „po terminie”.
- Typy odpowiedzi w `shared/src/schemas/dashboard.ts` (jak w innych modułach: typy TypeScript, bez zod, bo Pulpit nic nie przyjmuje), unia rozróżniana polem `role`.

## Powiązania

| Z modułem | Co Pulpit pokazuje stamtąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| leave-requests | wnioski czekające (admin) | nowa `listPendingForDashboard(db, limit)` w `leave-requests.queries.ts` | id, imię i nazwisko, typ, daty, dni robocze, data złożenia; `total` |
| leave-requests | nieobecności 14 dni (admin) | nowa `listAbsences(db, from, to)` (osoby spoza archiwum, wnioski zatwierdzone i czekające) | imię i nazwisko, daty, status; bez typu, powodu, komentarza |
| my-leave | pula pracownika | `getMyLeaveOverview(userId)` (jest), tylko `pool` | liczby dni |
| my-leave | moje czekające i najbliższy zatwierdzony | nowa `listUpcomingOwn(db, userId, today)` w `my-leave.queries.ts` | typ, daty, dni robocze |
| tasks | stan tablic, zadania po terminie (admin) | nowe `projectTaskCounts(db, today, doneSince)` i `listOverdueTasks(db, today, limit)` w `tasks.queries.ts` | liczby; tytuł, projekt, kolumna, termin, przypisani (imię, archiwum) |
| tasks | moje zadania (obie role) | nowa `listMyOpenTasks(db, viewer, today, limit)` w `tasks.queries.ts` (widoczność jak `findVisibleProject`) | tytuł, projekt, kolumna, termin |

Moduły zrobione dostają tylko nowe funkcje odczytu z testami; ich ekrany i trasy się nie zmieniają.

## Teksty

`shared/locales/pl/dashboard.json` (już z makiety): `title`, `today`, `days_*`, `more_*`, `pending.*`
(`starts_in_*`, dopisać `starts_today`, `started`), `absence.*`, `projects.*`, `overdue.*`, `my_tasks.*`, `column.*`,
`pool.*` (dopisać `no_pool`), `my_requests.*`. Klucze `ready`, `start_card` i `mockup_*` znikają z aplikacji
(`mockup_*` zostają dla makiety). Teksty karty puli przenoszą się razem z klockiem do `common` (wspólne klucze
w `common.json`), żeby Moje urlopy i Pulpit miały te same.

## Poza zakresem

- Akcje na Pulpicie (zatwierdzanie wniosku, zmiana kolumny zadania).
- Ustawianie, które boksy widać, i ich kolejności.
- Odświeżanie na żywo bez wejścia na stronę (WebSocket).
- Nieobecności zespołu dla pracownika (odpowiedź 7a), zestawienia i wykresy (pomysły w `IDEAS.md`).

# Spec: Zadania, część 1: Projekty i tablice

**Data:** 2026-11-18 · **Status:** do akceptacji
**Podstawa:** `SPEC.md` (ogólny), `QUESTIONS.md`, `SPEC-GENERAL.md`, makieta `mockups/src/modules/tasks/`

## Cel

Administrator zakłada projekty i wybiera ich członków. Członkowie i administratorzy prowadzą zadania na tablicy
projektu: dodają, zmieniają, przeciągają, przypisują osoby i usuwają do archiwum. Przypisana osoba dostaje
powiadomienie, a tablica sama odświeża zmiany innych co 5 sekund.

## Ekrany

### Menu „Zadania” (obie role)

- Grupa „Zadania” (ikona `square-kanban`) bez własnej strony. Pod nią projekty widoczne dla zalogowanej osoby
  (ikona `folder`, nazwa projektu, kolejność z listy projektów), a dla administratora na końcu „Projekty” (ikona
  `folder-cog`).
- Pracownik bez żadnego projektu nie widzi grupy „Zadania”.
- Pozycje projektów przychodzą z serwera (`GET /api/tasks/projects`) i odświeżają się po każdej zmianie projektów
  oraz po powrocie do karty przeglądarki. Usunięty projekt albo usunięcie z projektu: pozycja znika najpóźniej przy
  następnym odświeżeniu, a otwarta tablica pokazuje „Nie masz dostępu do tego projektu albo projekt został usunięty”
  z przyciskiem powrotu na Pulpit. **[decyzja AI]**

### Tablica projektu `/admin/tasks/:projectId` (admin; pracownik tylko członek)

Układ jak w makiecie (stan „tablica”):
- **Nagłówek:** nazwa projektu, pod nią „N zadań w opracowaniu i w toku, M po terminie” (bez zadań: „Na tablicy nie
  ma jeszcze zadań”). Po prawej kółka z inicjałami osób, które widzą projekt (administratorzy i członkowie; po
  najechaniu lista nazwisk), przycisk „Edytuj projekt” (tylko administrator, otwiera okno projektu) i „Dodaj
  zadanie”.
- **Pasek:** wyszukiwarka (tytuł i opis, bez wielkości liter) i przełącznik „Tylko moje zadania” (przypisane do
  mnie, odpowiedź 4a). Oba w adresie (`?search=…&mine=true`), więc odświeżenie strony je zachowuje. Filtrowanie robi
  ekran na danych tablicy (tablica nie ma stron). **[decyzja AI]**
- **Trzy kolumny** (`Paper withBorder`, wzorzec „Kolumny tablicy” z `DESIGN.md`): nagłówek z nazwą i liczbą kart
  (przy filtrze „pasujące / wszystkie”), karty w kolejności z serwera. Pusta kolumna: „Przeciągnij tu kartę.”, przy
  filtrze „Brak pasujących zadań.”
- **Karta:** tytuł, do 2 linii opisu (w zrealizowanych bez opisu, tytuł przygaszony), termin (po czasie czerwony
  `red.4`, dziś albo jutro żółty `yellow.4`, z podpowiedzią po najechaniu), w zrealizowanych „Zrealizowane
  DD.MM.RRRR”, kółka przypisanych osób (najwyżej 3 i „+N”; osoba w archiwum szara; żółta kropka = urlop przed
  terminem), „Nikt nie jest przypisany” przy braku osób, niebieski pasek po lewej przy zadaniu przypisanym do mnie,
  menu „⋮”: Edytuj, Przenieś do (dwie pozostałe kolumny), Usuń.
- **Przeciąganie** (`@dnd-kit`): myszą i palcem, między kolumnami i w obrębie kolumny; w trakcie kolumna docelowa ma
  przerywaną ramkę `navy.4`. Upuszczenie zapisuje od razu (bez dymka); błąd serwera: dymek z błędem i karta wraca na
  miejsce z serwera. Klawiatura: „⋮ → Przenieś do”. **[decyzja AI]**
- **Zrealizowane** starsze niż 30 dni (licząc od daty realizacji) są schowane; pod kolumną „Pokaż starsze
  zrealizowane (N)” i podpowiedź „Zrealizowane ponad 30 dni temu chowają się same.”; po kliknięciu „Schowaj starsze
  zrealizowane”. Serwer zwraca je tylko na żądanie (`?oldDone=1`).
- **Telefon** (poniżej `md`, odpowiedź 6a): przełącznik trzech kolumn u góry z liczbą kart, widać jedną kolumnę;
  przeciąganie w obrębie kolumny, do innej kolumny przez „⋮ → Przenieś do”. Domyślnie „W toku”. **[decyzja AI]**
- **Pusty projekt:** ramka z ikoną, „Tablica jest pusta”, „Dodaj pierwsze zadanie w projekcie „…”. Trafi do kolumny
  „W opracowaniu”, a przypisane osoby dostaną powiadomienie.” i przycisk „Dodaj zadanie”.
- **Adres `?task=<id>`** (link z powiadomienia) otwiera podgląd tego zadania; zadanie spoza tablicy (usunięte,
  w archiwum, z innego projektu): dymek „Nie znaleziono zadania.” i sama tablica. **[decyzja AI]**
- Odświeżanie: co 5 s, gdy karta przeglądarki jest widoczna, i od razu po powrocie do niej. Podczas przeciągania
  i przy otwartym podglądzie odświeżanie nie podmienia tego, co osoba właśnie zmienia (formularz zostaje z jej
  wartościami). **[decyzja AI]**

### Okno „Nowe zadanie: <projekt>” (na środku ekranu, `Modal size="lg"`)

Pola jak w makiecie (stan „nowe zadanie (okno)”): Tytuł (z podpowiedzią), Opis, Termin (`DateField`, najwcześniej
dziś), Kolumna (domyślnie „W opracowaniu”), Przypisane osoby (`MultiSelect` z wyszukiwaniem; przy osobie z urlopem
przed terminem dopisek „urlop 23.11–27.11.2026”). Gdy przypisana osoba ma urlop przed terminem: żółta ramka „Urlop
przed terminem” z nazwiskiem i datami. Przyciski „Anuluj” i „Dodaj zadanie”. Po zapisie dymek „Dodano zadanie.
Przypisane osoby dostaną powiadomienie.”; nowe zadanie jest na górze wybranej kolumny. Błędy pól pod polami (stan
„błędy w formularzu”).

### Podgląd zadania (szuflada z prawej, 540 px)

Kliknięcie karty albo „⋮ → Edytuj” (odpowiedź 1a). Tytuł szuflady „Zadanie: <projekt>”, te same pola co w oknie
(termin może być w przeszłości), pod nimi „Dodane przez: <osoba>, DD.MM.RRRR GG:MM” i „Zrealizowane: …”. Przyciski
„Usuń” (czerwony, po lewej), „Anuluj”, „Zapisz”; po zapisie dymek „Zapisano zmiany w zadaniu.” i szuflada się
zamyka. Osoba, której już nie można przypisać (archiwum albo spoza projektu), zostaje na liście przypisanych, ale
nie da się jej dodać ponownie. Miejsce na komentarze dochodzi w części 2.

### Okno „Usunąć zadanie?”

`ConfirmModal`: „Zadanie „…” zniknie z tablicy i trafi do archiwum. Administrator może je stamtąd przywrócić.”,
przyciski „Anuluj” i „Usuń” (czerwony). Po usunięciu dymek „Zadanie przeniesione do archiwum.”

### Lista projektów `/admin/tasks/projects` (tylko administrator)

Jak w makiecie (stan „lista”): nagłówek „Projekty” z opisem i przyciskiem „Dodaj projekt”; tabela (w
`Table.ScrollContainer`): Kolejność (strzałki), Projekt (link do tablicy), Członkowie (kółka i „N osób”, przy braku
„tylko administratorzy”), Zadania („N otwartych” i „M zrealizowanych”, bez zadań w archiwum), Utworzony, akcje
„Edytuj” i „Usuń”. Na telefonie karty. Brak projektów: ramka z ikoną, „Nie ma jeszcze projektów”, zachęta i
„Dodaj projekt”.

### Okno projektu (dodaj / edytuj)

Nazwa (z podpowiedzią „Np. Marketing, Produkcja, Montaż.”), Członkowie (`MultiSelect`: aktywni pracownicy; osoba
w archiwum, która jest członkiem, zostaje na liście, ale nie da się jej dodać). Przy usuwaniu z członków osoby, która
ma otwarte zadania w projekcie: żółta ramka „Usuwasz osobę z projektu” z liczbą jej otwartych zadań (stan „usuwam
osobę z zadaniami”). Powtórzona nazwa: błąd pod polem „Projekt o tej nazwie już jest.” Po zapisie dymek „Dodano
projekt. Pojawił się w menu „Zadania”.” albo „Zapisano projekt.”

### Okno „Usunąć projekt na stałe?”

Tekst z liczbą zadań, które znikną (wszystkie zadania projektu, także w archiwum), pole „Żeby potwierdzić, wpisz
nazwę projektu: <nazwa>”, przycisk „Usuń na stałe” (czerwony) aktywny dopiero po wpisaniu dokładnej nazwy. Serwer też
sprawdza nazwę. Po usunięciu dymek „Usunięto projekt.”; jeśli administrator był na tablicy tego projektu, wraca do
listy projektów.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Zadanie | Tytuł | tak | 3–150 znaków (po obcięciu spacji) | Zamówić tonery do drukarek | `text(150)` z minimum 3 (nowe `textRange(3, 150)`, jeśli brak) |
| Zadanie | Opis | nie | do 2000 znaków | — | `optionalField(text(2000))` |
| Zadanie | Termin | nie | przy dodawaniu ≥ dziś (strefa Europe/Warsaw), przy zmianie dowolny | DD.MM.RRRR (25.11.2026) | `optionalField(isoDate)` |
| Zadanie | Kolumna | tak | `draft` / `in_progress` / `done` | — | `z.enum(TASK_COLUMNS)` |
| Zadanie | Przypisane osoby | nie | 0–10, bez powtórzeń | numery osób | `z.array(addressNumber)` |
| Projekt | Nazwa | tak | 2–60 znaków, unikalna (bez wielkości liter) | Marketing | `textRange(2, 60)` |
| Projekt | Członkowie | nie | 0–50, bez powtórzeń | numery osób | `z.array(addressNumber)` |
| Usunięcie projektu | Nazwa do potwierdzenia | tak | taka jak nazwa projektu | — | `text(60)` |
| Przeniesienie zadania | Kolumna, „przed zadaniem” | kolumna tak | `beforeTaskId` albo `null` (na koniec) | — | `z.enum`, `addressNumber.nullable()` |

Serwer dodatkowo sprawdza: przypisani to członkowie projektu albo administratorzy, bez archiwum (inaczej 400
z kluczem pola); członkowie projektu to aktywni pracownicy (rola `employee`, bez archiwum). Osoba już przypisana
albo już członek, która przestała spełniać warunek (archiwum), może zostać przy zapisie bez zmian, ale nie może
zostać dodana. **[decyzja AI]**

## Dane

Migracje (jedna zmiana struktury na plik, kolejne numery od 019):

| Tabela | Kolumny |
|---|---|
| `projects` | `id`, `name VARCHAR(60)` unikalna, `position INT UNSIGNED`, `created_at`, `updated_at` |
| `project_members` | `project_id`, `user_id`, klucz główny (`project_id`, `user_id`), `created_at` |
| `tasks` | `id`, `project_id`, `title VARCHAR(150)`, `description TEXT NULL`, `due_date DATE NULL`, `column_key ENUM('draft','in_progress','done')`, `position INT UNSIGNED`, `completed_at DATETIME NULL`, `created_by INT UNSIGNED NULL`, `created_by_name VARCHAR(…)`, `archived_at DATETIME NULL`, `archived_by INT UNSIGNED NULL`, `created_at`, `updated_at`; indeks (`project_id`, `archived_at`, `column_key`, `position`) |
| `task_assignees` | `task_id`, `user_id`, klucz główny (`task_id`, `user_id`) |

| Rodzic | Dziecko (kolumna) | Przy usunięciu rodzica | Dlaczego |
|---|---|---|---|
| `projects` | `project_members.project_id` | CASCADE | członkostwo bez projektu nie ma sensu |
| `users` | `project_members.user_id` | CASCADE | usunięta na stałe osoba znika z projektów |
| `projects` | `tasks.project_id` | CASCADE | „Usuń projekt” usuwa zadania (odpowiedź 13) |
| `users` | `tasks.created_by` | SET NULL + `created_by_name` | autorstwo |
| `users` | `tasks.archived_by` | SET NULL | autorstwo archiwizacji |
| `tasks` | `task_assignees.task_id` | CASCADE | przypisanie bez zadania nie ma sensu |
| `users` | `task_assignees.user_id` | CASCADE | usunięta na stałe osoba znika z przypisań |

**Wartości liczone przez serwer:** `position` (po dodaniu: na górze kolumny; po przeniesieniu: przed wskazanym
zadaniem albo na końcu; numeracja kolumny od nowa w transakcji), `completed_at` (ustawiane przy wejściu do
„Zrealizowane”, kasowane przy wyjściu, bez zmiany przy przesunięciu w obrębie „Zrealizowane”), `created_by`,
`created_by_name`, `archived_at`, `archived_by`, kolejność projektów, liczby zadań projektu.

**Archiwum:** zadanie usunięte z tablicy dostaje `archived_at`/`archived_by` i znika z tablicy, liczników i wyszukiwania;
jego przypisania zostają. Przywrócenie i usunięcie na stałe: moduł Archiwum (zadanie wraca na koniec swojej kolumny,
jeśli projekt istnieje). Usunięcie osoby z projektu kasuje jej wiersze `task_assignees` tylko w zadaniach projektu,
które nie są w „Zrealizowane” (także tych w archiwum). **[decyzja AI]**

**Historia zmian** (w tej samej transakcji, `logActivity`):

| Czynność | `entityType` | `action` | Zmiany |
|---|---|---|---|
| Dodanie zadania | `tasks` | `create` | tytuł, termin, kolumna, przypisani |
| Zmiana zadania | `tasks` | `update` | zmienione pola, przypisani przed → po |
| Przeniesienie do innej kolumny | `tasks` | `status` | kolumna przed → po (samo przesunięcie w kolumnie bez wpisu) |
| Usunięcie do archiwum | `tasks` | `archive` | — |
| Dodanie i zmiana projektu | `projects` | `create` / `update` | nazwa, członkowie przed → po |
| Usunięcie projektu | `projects` | `delete` | nazwa, liczba usuniętych zadań |

## API

Wszystko pod `mountModule(api, 'tasks', tasksRoutes)` (role z grupy „Zadania”: admin, employee). „Widzi projekt” =
administrator albo członek projektu; warunek w zapytaniu SQL, projekt niewidoczny lub nieistniejący → 404. Zadanie
w archiwum traktowane jak nieistniejące (404).

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/tasks/projects` | admin, employee | — | projekty widoczne dla osoby: `id`, `name`, `position`, `members` (`id`, `name`, `archived`, `openTasks` = liczba jego otwartych zadań w projekcie), `openCount`, `doneCount`, `archivedCount` (zadania w archiwum, do okna usuwania), `createdAt` | — |
| `GET /api/tasks/projects/candidates` | admin | — | aktywni pracownicy (`id`, `name`) do okna projektu | 403 pracownik |
| `POST /api/tasks/projects` | admin | `projectSchema` (`name`, `memberIds`) | `{ id }`, 201 | 400 pola; 409 `tasks.project_name_taken` (pole `name`) |
| `PUT /api/tasks/projects/:id` | admin | `projectSchema` | `{ ok }` | 400; 404; 409 nazwa |
| `POST /api/tasks/projects/:id/move` | admin | `{ direction: 'up' \| 'down' }` | `{ ok }` | 404; pierwszy w górę / ostatni w dół: bez zmian, `{ ok }` |
| `DELETE /api/tasks/projects/:id` | admin | `{ confirmName }` | `{ ok, deletedTasks }` | 404; 400 `tasks.project_confirm_mismatch` (pole `confirmName`) |
| `GET /api/tasks/projects/:id/board` | widzi projekt | `?oldDone=1` | projekt (`id`, `name`), `people` (osoby widzące projekt: `id`, `name`, `role`, `archived`, `assignable`), `tasks` (bez archiwum; z `assignees`, `leaves` dla przypisanych), `oldDoneCount` | 404 |
| `POST /api/tasks/projects/:id/tasks` | widzi projekt | `taskSchema` (`title`, `description`, `dueDate`, `column`, `assigneeIds`) | `{ id }`, 201 | 400 pola (także termin przed dziś, osoba spoza projektu); 404 |
| `PUT /api/tasks/:taskId` | widzi projekt zadania | `taskSchema` (termin bez warunku „≥ dziś”) | `{ ok }` | 400; 404 |

Zmiana kolumny w formularzu (`PUT`) stawia kartę na górze nowej kolumny, jak przy dodaniu; ta sama kolumna nie zmienia
miejsca. Unikalność nazwy projektu według porównania bazy `utf8mb4_polish_ci` (bez wielkości liter). **[decyzja AI]**
| `POST /api/tasks/:taskId/move` | widzi projekt zadania | `taskMoveSchema` (`column`, `beforeTaskId` z tego samego projektu albo `null`) | `{ ok }` | 400 (`beforeTaskId` z innego projektu, w archiwum); 404 |
| `POST /api/tasks/:taskId/archive` | widzi projekt zadania | — | `{ ok }` | 404 |

Wszystkie zapisy w `withTransaction`. `validateBody` przy każdej trasie zapisu, numery z adresu przez `idParam`.

**Powiadomienia** (w transakcji zapisu, przez `notifyUsers`; autor czynności ich nie dostaje):

| Rodzaj | Kto dostaje | Tytuł | Szczegół | Link |
|---|---|---|---|---|
| `task_assigned` (już jest) | osoby nowo przypisane przy dodaniu albo zmianie zadania | Nowe zadanie dla Ciebie | „{tytuł}”, termin: {termin} (bez terminu sam tytuł) | `/admin/tasks/<projectId>?task=<id>` |
| `project_added` (nowy) | pracownicy nowo dodani do projektu (przy dodaniu i zmianie projektu) | Dodano Cię do projektu | „{projekt}” | `/admin/tasks/<projectId>` |

**Zmiana roli w Pracownikach** (odpowiedź użytkownika 2026-11-18):
- Administrator staje się pracownikiem: w tej samej transakcji zostaje dopisany jako członek każdego projektu, w którym
  ma przypisane otwarte zadanie (W opracowaniu, W toku, bez archiwum). Pozostałych projektów nie widzi, dopóki
  administrator go nie doda. Moduł Zadania udostępnia funkcję `addMemberWhereAssigned(conn, userId)`, którą woła
  usługa Pracowników przy zmianie roli; wpis historii `projects` / `update` dla każdego takiego projektu.
- Pracownik staje się administratorem: jego członkostwa zostają w bazie (bez znaczenia, bo administrator widzi
  wszystko), a w oknie projektu i liście członków administratorzy nie są pokazywani. Gdy wróci do roli pracownika,
  znów widzi te projekty. **[decyzja AI]**

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| leave-requests | żółta kropka i ramka „Urlop przed terminem”: zatwierdzone urlopy przypisanych osób od dziś do terminu zadania (bez terminu: 14 dni), odpowiedź 3a | nowa `listApprovedLeaves(db, userIds, from, to)` w `leave-requests.queries.ts` | tylko `userId`, `dateFrom`, `dateTo`; bez rodzaju, powodu i statusu |
| employees | kandydaci na członków projektu, osoby w archiwum przy starych zadaniach | `listActiveUsers` (filtr roli `employee` jako parametr albo nowa funkcja w `employees.queries.ts`) | `id`, `name` |
| employees (zmiana tam) | zmiana roli administrator → pracownik dopisuje go do projektów z jego otwartymi zadaniami | `addMemberWhereAssigned(conn, userId)` z modułu Zadania | — |
| notifications | `task_assigned`, `project_added` | `notifyUsers` | — |
| dashboard (później) | „Moje zadania” ze wszystkich moich projektów, stan tablic | funkcja dodana w module Pulpit | — |
| archive (później) | zadania w archiwum: przywróć, usuń na stałe | funkcje dodane w module Archiwum | — |
| activity-log (później) | wpisy `tasks` i `projects` | `logActivity` | — |

Zmiana w module Powiadomienia: link `task_assigned` z `SPEC.md` Powiadomień (`/admin/tasks`) staje się
`/admin/tasks/<projectId>?task=<id>`; wpis w jego specu.

## Menu i trasy we froncie **[decyzja AI]**

- `NAVIGATION`: „Zadania” (`tasks`) staje się grupą (`children`) z jedną stałą pozycją „Projekty”
  (`task-projects`, `/admin/tasks/projects`, tylko admin). Pozycje projektów dokłada w czasie działania hook z modułu
  Zadania, podpięty w jednym miejscu w `frontend/src/core/` (tak jak `PAGES`), przed `visibleNav`, więc `NavMenu`
  i podświetlanie działają bez zmian. To samo w makiecie (`mockups/src/modules/tasks/navigation.tsx`).
- Tablica `/admin/tasks/:projectId` to trasa dodatkowa w `buildAppRoutes` (jak strona powiadomień), dostępna dla ról
  grupy „Zadania”; numer projektu tylko z cyfr, inaczej ekran „nie znaleziono”.
- `mountModule('tasks')` bierze role z grupy i jej pozycji (admin, employee); trasy tylko dla administratora mają
  `requireRole('admin')`.
- Sam adres `/admin/tasks` (np. ze starego powiadomienia `task_assigned`) przenosi na tablicę pierwszego widocznego
  projektu, a bez projektów na Pulpit (administrator: na listę projektów).

## Teksty

`shared/locales/pl/tasks.json` (już ma teksty makiety): tytuły ekranów, kolumny, karta, okna, dymki, błędy serwera
(`project_name_taken`, `project_confirm_mismatch`, `task_not_found`, `assignee_not_allowed`, `member_not_allowed`).
W `notifications.json` nowy rodzaj `project_added`. W `common.json` etykieta menu `nav.task_projects` („Projekty”)
i `move_up`/`move_down` (już są).

## Nowa biblioteka

`@dnd-kit/core` i `@dnd-kit/sortable` (licencja MIT, aktywnie wydawane, obsługa myszy, dotyku i klawiatury) w
`frontend` i `mockups`. Alternatywa bez biblioteki (natywne przeciąganie przeglądarki) nie działa palcem na
telefonie. Zgoda użytkownika: odpowiedź 8 (2026-11-18), wpis w „Bibliotekach” w `SPEC-GENERAL.md`.

## Poza zakresem części 1

Komentarze (część 2). Przywracanie i usuwanie zadań z archiwum (moduł Archiwum). Boksy na Pulpicie (moduł Pulpit).
Ekran historii zmian (moduł Historia zmian).

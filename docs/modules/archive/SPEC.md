# Spec: Archiwum

**Data:** 2026-11-20 · **Status:** zaakceptowany przez użytkownika 2026-11-20
**Podstawa:** `QUESTIONS.md` (odpowiedzi 1a–8a), `SPEC-GENERAL.md` („Archiwum”, „Relacje”), makieta
`mockups/src/modules/archive/`

## Cel

Jedno miejsce, w którym administrator widzi konta i zadania przeniesione do archiwum, przywraca je albo usuwa na
stałe. Moduł działa, gdy: przywrócone konto znów się loguje, przywrócone zadanie wraca na tablicę, a usunięte na
stałe znika razem z rzeczami, które bez niego nie mają sensu. Historia urlopów nigdy nie ginie: konta z wnioskami
nie da się usunąć.

## Ekran `/admin/archive` (tylko administrator)

Wygląd jak w makiecie. Nagłówek „Archiwum” z jednym zdaniem pod spodem; dwie zakładki z liczbą rzeczy:
**Pracownicy (N)** i **Zadania (N)**. Zakładka, wyszukiwanie, projekt i strona siedzą w adresie
(`?tab=tasks&search=…&projectId=…&page=2`), więc odświeżenie i link pokazują ten sam widok. Każde wejście na ekran
pobiera świeżą listę i liczniki z serwera (poprawka 2026-11-20: osoba przeniesiona do archiwum w Pracownikach nie
pojawiała się bez odświeżenia strony). Najnowsze w archiwum na
górze, 25 na stronę (`PAGE_SIZE`), stronicowanie pod listą, gdy jest więcej niż jedna strona. Bez zaznaczania kilku
rzeczy naraz (7a); nic nie znika samo (6a).

### Zakładka Pracownicy (8a)

- Wyszukiwarka „Szukaj po imieniu, nazwisku albo loginie”.
- Tabela (na telefonie karty): imię i nazwisko z loginem pod spodem; rola (znacznik); „Historia”: liczba wniosków
  urlopowych (każdy status; 0 = szare „bez wniosków urlopowych”) i liczba zadań, do których osoba jest przypisana
  (także zadań w archiwum); „W archiwum od”: data i „przeniósł(a): <imię i nazwisko>” (osoba usunięta na stałe:
  nazwisko puste, sama data); przyciski „Przywróć” i „Usuń na stałe”.
- **Osoba z wnioskami urlopowymi (1a):** „Usuń na stałe” wyłączony, dymek „Ma wnioski urlopowe, więc zostaje
  w archiwum: historia urlopów musi zostać.” Serwer też odmawia (409).
- **Przywróć:** okno „Przywrócić konto?” z tekstem z makiety → `POST /api/archive/employees/:id/restore`, dymek
  „Przywrócono konto: <imię i nazwisko>.”, osoba znika z listy. Konto loguje się tym samym loginem i hasłem, z tą
  samą rolą i pulami dni (to samo co przywrócenie w Pracownikach). **[decyzja AI]** Osoba nie wraca sama do projektów
  ani przypisań, z których ją wcześniej usunięto (nikt jej z nich nie usuwał przy archiwizacji, więc są nadal).
- **Usuń na stałe (2a):** okno z tekstem z makiety, liczbą zadań, z których osoba zniknie, i polem „Wpisz imię
  i nazwisko, żeby potwierdzić”; przycisk wyłączony, dopóki tekst (bez spacji na końcach) nie jest równy imieniu
  i nazwisku. Dymek „Usunięto na stałe: <imię i nazwisko>.”
- Pusta: ikona, „Nikogo nie ma w archiwum”, „Konto trafia tutaj, gdy na liście Pracowników wybierzesz „Do
  archiwum”.” Brak wyników: „Nic nie pasuje do wyszukiwania. Zmień tekst albo projekt.”

### Zakładka Zadania (3a, 4a, 5a)

- Wyszukiwarka „Szukaj zadania” (tytuł) i wybór projektu „Wszystkie projekty” (tylko projekty, które mają zadania
  w archiwum).
- Tabela (na telefonie karty): tytuł z liczbą komentarzy pod spodem; projekt z kolumną pod spodem („W opracowaniu”,
  „W toku”, „Zrealizowane”); termin (`DateText`, brak = szare „brak”); „W archiwum od” jak u pracowników; przyciski
  „Przywróć” i „Usuń na stałe”.
- **Kliknięcie wiersza (4a)** otwiera podgląd z prawej (540 px, na telefonie cały ekran), tylko do oglądania:
  informacja „Zadanie w archiwum można tylko obejrzeć. Żeby je zmienić, najpierw je przywróć.”, tytuł, projekt
  i kolumna, opis, termin, przypisane osoby (osoba w archiwum: szare kółko i znacznik „w archiwum”), kiedy i kto
  przeniósł, „Usuń na stałe” po lewej i „Przywróć” po prawej, pod spodem komentarze (autor, data z godziną, treść;
  bez komentarzy: „Bez komentarzy.”). Adres podglądu: `?tab=tasks&taskId=<id>` (link z Historii zmian).
- **Przywróć (3a):** okno „Przywrócić zadanie?” („„<tytuł>” wróci na tablicę projektu <projekt>, na koniec kolumny
  „<kolumna>”.”) → dymek „Przywrócono zadanie „<tytuł>”.” Zadanie wraca z opisem, terminem, osobami, komentarzami
  i znacznikiem „Zakończone”. **[decyzja AI]** Zrealizowane zadanie zachowuje datę realizacji, więc gdy minęło ponad
  30 dni, na tablicy widać je dopiero po „Pokaż starsze zrealizowane” (tak działa tablica).
- **Usuń na stałe (2a):** zwykłe okno: „„<tytuł>” zniknie na zawsze. Tego nie da się cofnąć.” i, gdy są komentarze,
  „Razem z nim znikną <N komentarzy>.” Dymek „Usunięto na stałe zadanie „<tytuł>”.”
- Pusta: „Żadnego zadania nie ma w archiwum” + „Zadanie trafia tutaj, gdy ktoś usunie je z tablicy projektu.”

### Błędy

- Błąd serwera przy akcji: dymek z komunikatem, okno zostaje otwarte (jak wszędzie).
- Rzecz zniknęła w międzyczasie (ktoś inny ją przywrócił albo usunął; projekt usunięto): 404 albo 409 → dymek
  „Tej rzeczy nie ma już w archiwum. Lista została odświeżona.”, okno się zamyka, lista się odświeża.
- Ładowanie i błąd pobrania listy: `DataState`.

### Pola formularzy

Jedyne pole: „Wpisz imię i nazwisko, żeby potwierdzić” w oknie usunięcia konta: wymagane, do 141 znaków (imię 70 +
spacja + nazwisko 70), `text(141)`; serwer porównuje po obcięciu spacji na końcach, dokładnie (wielkość liter też).

## Zasady serwera

- Wszystkie trasy tylko administrator (`mountModule(api, 'archive', …)`, rola z pozycji nawigacji).
- Lista i podgląd pokazują tylko rekordy z `archived_at IS NOT NULL`; rekord spoza archiwum w podglądzie → 404.
- **Przywrócenie konta:** ta sama logika co `POST /api/employees/:id/restore` (`restoreEmployee`): 404 nie ma,
  409 nie jest w archiwum; wpis historii `restore` / `users`.
- **Usunięcie konta na stałe** (w jednej transakcji, wiersz konta zablokowany `FOR UPDATE`): 404 nie ma; 409
  `server.archive_first` gdy konto nie jest w archiwum; 409 `archive.has_leave_requests` gdy ma choć jeden wniosek
  (każdy status); 400 gdy `confirmName` ≠ imię i nazwisko. Potem `DELETE FROM users`; bazy robią resztę według
  „Relacji” (pule, powiadomienia, członkostwo, przypisania znikają; autorstwo zadań, komentarzy, decyzji i wpisy
  historii zostają z nazwiskiem). Wpis historii `delete` / `users` z imieniem i nazwiskiem.
- **Przywrócenie zadania** (w jednej transakcji, najpierw blokada projektu `lockProject`, jak każdy zapis zadań):
  404 nie ma (także projekt usunięty); 409 `archive.not_archived` gdy nie jest w archiwum; pozycja = na koniec
  kolumny (liczy serwer); `archived_at` i `archived_by` → NULL; wpis historii `restore` / `tasks`.
- **Usunięcie zadania na stałe** (blokada projektu): 404 nie ma; 409 `server.archive_first` gdy nie jest
  w archiwum; `DELETE FROM tasks` (komentarze i przypisania znikają, CASCADE); wpis historii `delete` / `tasks`.
- Liczby (wnioski, zadania, komentarze), nazwiska „przeniósł(a)” i nazwy projektów liczy i czyta serwer.
- Dwie te same akcje naraz (dwa przywrócenia, przywrócenie i usunięcie): jedna się udaje, druga dostaje 404/409,
  bez błędu 500 (blokady w transakcji).

## Dane

Bez nowych tabel i migracji: konta i zadania mają już `archived_at` i `archived_by`. Relacje bez zmian; w
`SPEC-GENERAL.md` wiersz `leave_requests.user_id` → RESTRICT przestaje być **[decyzją AI]**: potwierdzony
odpowiedzią 1a (konto z wnioskami zostaje w archiwum na zawsze).

Historia zmian: przywrócenie i usunięcie na stałe konta i zadania (klucze tekstów `user_restore`, `user_delete`,
`task_restore`, `task_delete` już są w `activity-log.json`).

Nowe klucze serwera: `server.archive_first` (wspólny, `SERVER_MESSAGES.archiveFirst`), w `archive.json`:
`has_leave_requests`, `not_archived`, `gone` (komunikat „Tej rzeczy nie ma już w archiwum…”).

## API

| Metoda i adres | Kto | Dane wejściowe | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/archive/counts` | admin | — | `{ employees, tasks }` | — |
| `GET /api/archive/employees` | admin | `?page&search` (`listQuerySchema`, sortowanie tylko `archived_at` malejąco) | `ListResponse<ArchivedEmployee>` | 400 złe parametry |
| `POST /api/archive/employees/:id/restore` | admin | — | `{ ok }` | 404, 409 nie w archiwum |
| `DELETE /api/archive/employees/:id` | admin | `{ confirmName }` (`archiveDeleteEmployeeSchema`) | `{ ok }` | 400 zła nazwa, 404, 409 `archive_first`, 409 `has_leave_requests` |
| `GET /api/archive/tasks` | admin | `?page&search&projectId` | `ListResponse<ArchivedTask> & { projects: {id,name}[] }` | 400 |
| `GET /api/archive/tasks/:id` | admin | — | `ArchivedTaskDetails` (opis, osoby z `archived`, komentarze) | 404 (także spoza archiwum) |
| `POST /api/archive/tasks/:id/restore` | admin | — | `{ ok }` | 404, 409 `not_archived` |
| `DELETE /api/archive/tasks/:id` | admin | — | `{ ok }` | 404, 409 `archive_first` |

`ArchivedEmployee`: `id, name, login, role, archivedAt, archivedByName | null, leaveRequests, tasks`.
`ArchivedTask`: `id, title, projectId, projectName, column, dueDate, comments, archivedAt, archivedByName | null`.

Wartości liczone przez serwer (nie brane z żądania): liczby wniosków, zadań i komentarzy, pozycja przywróconego
zadania, kto przywrócił i usunął (`req.user`).

## Powiązania

| Z modułem | Co | Funkcja | Pola |
|---|---|---|---|
| employees | lista kont w archiwum, przywrócenie (to samo co w Pracownikach), usunięcie na stałe | `listArchivedEmployees`, `restoreEmployee` (jest), `deleteArchivedEmployee` w `employees.service.ts` | jak `ArchivedEmployee` |
| my-leave | liczba wniosków osób (blokada usunięcia i kolumna „Historia”) | `countRequestsByUser(db, userIds)` w `my-leave.queries.ts` | tylko liczba |
| tasks | lista i podgląd zadań w archiwum, przywrócenie, usunięcie na stałe; liczba przypisań osoby | `listArchivedTasks`, `getArchivedTask`, `restoreTask`, `deleteArchivedTask`, `countAssignmentsByUser` w `tasks.service.ts` / `tasks.queries.ts` | jak `ArchivedTask` |
| activity-log | przycisk „Otwórz w archiwum” przy wpisie konta albo zadania w archiwum (obiecany w specu Historii): konto → `/admin/archive?tab=employees&search=<login>`, zadanie → `/admin/archive?tab=tasks&taskId=<id>`; wpisy przywrócenia i usunięcia | stałe adresów w `shared` (jak `taskBoardPath`) | tylko admin |
| employees (ekran) | dopisek w oknie „Do archiwum” już kieruje do „Archiwum”; bez zmian | — | — |

## Teksty

`shared/locales/pl/archive.json` (już z makiety): tytuł i zakładki, kolumny, okna przywrócenia i usunięcia, podgląd
zadania, puste stany, dymki; dochodzą klucze błędów serwera (`has_leave_requests`, `not_archived`, `gone`).
`activity-log.json`: „Otwórz w archiwum”.

## Poza zakresem

- Archiwum innych rzeczy (projekty usuwa się od razu na stałe, typy urlopów i umów się ukrywa, wniosków się nie usuwa).
- Zaznaczanie kilku rzeczy naraz (7a) i samoczynne czyszczenie archiwum (6a).
- Zmiana zadania w archiwum (najpierw trzeba je przywrócić).

# Spec: Powiadomienia

**Data:** 2026-11-16 · **Status:** zaakceptowany przez użytkownika 2026-11-16
**Podstawa:** `QUESTIONS.md` (odpowiedzi 1a–6a), `SPEC-GENERAL.md` („Zasady wspólne”, tabela `notifications`),
makieta `mockups/src/modules/notifications/`.

## Cel

Dzwonek w górnej belce panelu, który mówi każdej osobie, że coś jej dotyczy: administratorowi o nowym i wycofanym
wniosku, pracownikowi o decyzji w sprawie jego urlopu i o przypisaniu do zadania. Ten moduł buduje dzwonek, stronę
ze wszystkimi powiadomieniami i jedną funkcję serwera do tworzenia powiadomień. Same powiadomienia zaczną powstawać
w modułach Moje urlopy, Wnioski urlopowe i Zadania (wołają tę funkcję). Moduł działa, gdy powiadomienie zapisane
dla osoby pojawia się w jej dzwonku najpóźniej po minucie, a kliknięcie prowadzi do właściwego ekranu i zmniejsza
licznik.

## Ekrany

### Dzwonek (górna belka, każdy ekran panelu; admin i employee)

- Ikona dzwonka (`Bell`) między przełącznikiem motywu a menu użytkownika. Gdy są nieprzeczytane: czerwona liczba
  na dzwonku (`Indicator`, `red.8`); powyżej 99 pokazuje „99+” **[decyzja AI]**.
- Kliknięcie otwiera na komputerze okienko pod dzwonkiem (szerokość 420 px), a na telefonie panel wysuwany z prawej
  na cały ekran, z krzyżykiem obok tytułu (okienko liczone od szerokości ekranu mrugało i wychodziło za ekran przy
  drugim otwarciu; zgłoszenie użytkownika przy makiecie). W obu:
  - nagłówek „Powiadomienia” i, gdy są nieprzeczytane, przycisk „Oznacz wszystkie jako przeczytane” (`Check`);
  - **8 ostatnich** powiadomień (1a), przewijanych, gdy nie mieszczą się w wysokości;
  - na dole „Pokaż wszystkie” (`Eye`) → strona „Powiadomienia”.
- Jedno powiadomienie: kolorowa ikona rodzaju, tytuł, szczegóły (najwyżej 2 linie), „dzisiaj, 14:32” /
  „wczoraj, 09:10” / „12.11.2026 11:08” i imię osoby, która wykonała czynność. Nieprzeczytane: jaśniejsze tło,
  granatowy pasek po lewej, pogrubiony tytuł, kropka.
- Kliknięcie powiadomienia: oznacza je jako przeczytane (2a), zamyka okienko i przechodzi pod jego adres.
- Pusto: ikona `BellOff` i „Nie masz jeszcze powiadomień. Pojawią się tu, gdy coś będzie dotyczyć Ciebie.”
- Odświeżanie (3a): licznik i lista pobierają się co 60 sekund oraz od razu po powrocie do karty przeglądarki.
- Błąd pobierania: dzwonek bez liczby; w okienku komunikat z przyciskiem „Spróbuj ponownie” (`DataState`).

### Strona „Powiadomienia” (`/admin/notifications`; admin i employee; bez pozycji w menu)

- Tytuł „Powiadomienia” i podpowiedź „Kliknij powiadomienie, żeby przejść do wniosku albo zadania. Kliknięte oznacza
  się jako przeczytane.”; po prawej „Oznacz wszystkie jako przeczytane” (gdy są nieprzeczytane).
- Przełącznik „Wszystkie” / „Nieprzeczytane (N)”; wybór siedzi w adresie (`?unread=1`).
- Lista w grupach po dniach: „Dzisiaj”, „Wczoraj”, potem data `DD.MM.RRRR`; przy powiadomieniu sama godzina.
- Stronicowanie przez serwer (`PAGE_SIZE`, `Pagination` pod listą, strona w adresie `?page=2`).
- Pusto: „Nie masz jeszcze powiadomień…”; pusto w „Nieprzeczytane”: „Wszystko przeczytane.”
- Żadna pozycja menu nie jest podświetlona na tej stronie (dziś „Pulpit” podświetla się dla każdego adresu
  zaczynającego się od `/admin`; poprawka w `activeNavKey`: pozycja z adresem części, np. `/admin`, podświetla się
  tylko dla dokładnie tego adresu) **[decyzja AI]**.

### Pola formularzy

Moduł nie ma formularzy.

## Rodzaje powiadomień i teksty (6a)

Stałe w `shared/src/constants/notifications.ts`: `NOTIFICATION_TYPES`. Treść powstaje na ekranie z klucza
`types.<rodzaj>.title` / `detail` i zapisanych parametrów, więc zmiana tekstu działa też dla starych powiadomień.

| Rodzaj (`type`) | Dostaje | Tytuł | Szczegóły | Parametry | Adres |
|---|---|---|---|---|---|
| `leave_request_new` | każdy aktywny admin | Nowy wniosek: {pracownik} | {typ}, {od} – {do}, dni robocze: {dni} | `employee`, `leaveType`, `dateFrom`, `dateTo`, `days` | `/admin/leave-requests` (dokładny adres ustali moduł Wnioski) |
| `leave_request_withdrawn` | każdy aktywny admin | Wniosek wycofany: {pracownik} | {typ}, {od} – {do} | `employee`, `leaveType`, `dateFrom`, `dateTo` | jw. |
| `leave_approved` | pracownik wniosku | Urlop zatwierdzony | {typ}, {od} – {do} | `leaveType`, `dateFrom`, `dateTo` | `/admin/my-leave` |
| `leave_rejected` | pracownik wniosku | Urlop odrzucony | {typ}, {od} – {do}. Powód: {powód} | jw. + `reason` | jw. |
| `leave_cancelled` | pracownik wniosku | Urlop anulowany | {typ}, {od} – {do}. Dni wróciły do puli. | jw. | jw. |
| `task_assigned` | nowo przypisana osoba | Nowe zadanie dla Ciebie | „{tytuł}”, termin: {termin} (bez terminu: sam tytuł) | `task`, `dueDate` (może nie być) | `/admin/tasks/<projectId>?task=<id>` (zmiana 2026-11-18, moduł Zadania) |
| `project_added` | pracownik nowo dodany do projektu | Dodano Cię do projektu | „{projekt}” | `project` | `/admin/tasks/<projectId>` (moduł Zadania, 2026-11-18) |
| `task_comment` | osoby przypisane do zadania, bez autora komentarza | Nowy komentarz do zadania | „{tytuł}”: {początek komentarza, do 80 znaków z „…”} | `task`, `excerpt` | `/admin/tasks/<projectId>?task=<id>` (moduł Zadania, część 2, 2026-11-19) |

Daty w parametrach zapisane jako `RRRR-MM-DD`, na ekranie przez `formatDate`.

## Zasady serwera

- **Nikt nie dostaje powiadomienia o własnej czynności** (np. przypisał siebie do zadania): funkcja tworząca pomija
  osobę, która wykonała czynność **[decyzja AI]**.
- Powiadomienia tylko dla kont aktywnych (bez `archived_at`).
- **Kilku administratorów (5a):** każdy dostaje własny wiersz i sam go odczytuje.
- **Sprzątanie (4a):** przeczytane starsze niż 90 dni (`NOTIFICATION_KEEP_DAYS`) są usuwane przy każdym tworzeniu
  powiadomień (w tej samej transakcji), nieprzeczytane zostają zawsze. Bez osobnego zadania o stałej porze
  **[decyzja AI]**: aplikacja jest mała, a odczyt (GET) nigdy nic nie zapisuje.
- Osoba widzi i oznacza **tylko własne** powiadomienia: każde zapytanie ma `user_id = req.user.id`; cudze → 404.
- Oznaczenie jako przeczytane jest powtarzalne (drugie kliknięcie nie zmienia daty `read_at`).
- Powiadomienia nie trafiają do historii zmian (to nie zmiana danych firmy) **[decyzja AI]**.

## Dane

Migracja `010_notifications.sql`:

| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` | |
| `user_id` | `INT UNSIGNED NOT NULL` | odbiorca; FK → `users`, `ON DELETE CASCADE` (spec ogólny) |
| `type` | `VARCHAR(40) NOT NULL` | jeden z `NOTIFICATION_TYPES` |
| `params` | `JSON NOT NULL` | wartości do tekstu |
| `actor_name` | `VARCHAR(141) NULL` | kto wykonał czynność (kopia imienia i nazwiska, zostaje po usunięciu osoby; bez klucza obcego) **[decyzja AI]** |
| `link` | `VARCHAR(255) NULL` | adres w aplikacji, zawsze zaczyna się od `/admin/` |
| `read_at` | `DATETIME NULL` | |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | |

Indeks (`user_id`, `read_at`, `created_at`) pod licznik i listę. Bez `updated_at` (wiersz zmienia tylko `read_at`).

## API

Podpięcie: `mountModule(api, 'notifications', notificationsRoutes, ['admin', 'employee'])` (moduł bez pozycji w menu).

| Metoda i adres | Kto | Dane wejściowe | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/notifications/summary` | admin, employee | — | `{ unread, latest: Notification[8] }` | 401 |
| `GET /api/notifications?page=&unread=1` | admin, employee | `validateQuery(notificationsQuerySchema)` (`page`, `unread`) | `ListResponse<Notification>` + `unread` | 400 zły parametr, 401 |
| `POST /api/notifications/:id/read` | admin, employee | `idParam` | 204 | 404 nie ma albo cudze |
| `POST /api/notifications/read-all` | admin, employee | — | `{ updated }` | 401 |

`Notification` = `{ id, type, params, actorName, link, readAt, createdAt }`. Lista zawsze od najnowszych, bez
wyboru sortowania.

Wartości liczone przez serwer: odbiorcy, `created_at`, `read_at`, `actor_name` (z `req.user` modułu, który tworzy).

**Funkcje dla innych modułów** (`backend/src/modules/notifications/notifications.service.ts`), wołane w transakcji
tamtego modułu:
- `notifyUsers(conn, { userIds, type, params, link, actor })`: tworzy wiersze, pomija `actor.id` i konta
  w archiwum, sprząta stare przeczytane tych osób.
- `notifyAdmins(conn, { type, params, link, actor })`: to samo dla wszystkich aktywnych administratorów.

## Powiązania

| Z modułem | Co | Funkcja | Pola |
|---|---|---|---|
| Moje urlopy | nowy i wycofany wniosek → administratorzy | `notifyAdmins` | typ, daty, dni, imię pracownika |
| Wnioski urlopowe | zatwierdzenie, odrzucenie z powodem, anulowanie → pracownik | `notifyUsers` | typ, daty, powód |
| Zadania | przypisanie do zadania → przypisana osoba | `notifyUsers` | tytuł, termin |
| układ panelu (`SideMenuLayout`) | dzwonek w belce | `NotificationBell` | — |

Do czasu tamtych modułów powiadomienia da się zobaczyć poleceniem `npm run notifications:test`: dopisuje każdemu
aktywnemu administratorowi przykładowe powiadomienia administratora, a każdemu pracownikowi przykładowe powiadomienia
pracownika **[decyzja AI]** (wzorem `npm run email:test`; opis w README).

## Teksty

`shared/locales/pl/notifications.json` (już jest, z makiety): `title`, `bell`, `bell_unread`, `mark_all_read`,
`show_all`, `filter_all`, `filter_unread`, `today`, `yesterday`, `today_at`, `yesterday_at`, `empty`,
`empty_unread`, `page_hint`, `types.<rodzaj>.title|detail`.

## Poza zakresem

- Powiadomienia „na żywo” w tej samej sekundzie (WebSocket): wystarczy odświeżanie co minutę (3a).
- Ręczne usuwanie pojedynczych powiadomień (4a), ustawienia „które powiadomienia chcę dostawać”.
- Powiadomienia e-mailem (osobny moduł E-mail, tylko nowy wniosek).
- Tworzenie prawdziwych powiadomień przy wnioskach i zadaniach: robią to moduły Moje urlopy, Wnioski urlopowe,
  Zadania.

## Zmiana 2026-11-16: wspólne klocki zamiast kopii

Strona korzysta ze wspólnych klocków `PageHeader`, `useListParams`, `ListPagination` i `EmptyState`; własny `EmptyNotifications` usunięty.
Tytuł strony ma ten sam rozmiar co na innych ekranach; pusty stan (strona i dzwonek): ikona `BellOff` w jasnym kwadracie, jak w innych pustych stanach.

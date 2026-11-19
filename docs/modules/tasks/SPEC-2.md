# Spec: Zadania, część 2: Komentarze

**Data:** 2026-11-19 · **Status:** zaakceptowany przez użytkownika 2026-11-19
**Podstawa:** `SPEC.md` (ogólny), `SPEC-1.md`, `QUESTIONS.md` (odpowiedzi 5a, 9, 11a), `SPEC-GENERAL.md`, makieta
`mockups/src/modules/tasks/` (stan „podgląd z komentarzami”)

## Cel

Każdy, kto widzi zadanie, może je skomentować w podglądzie z prawej. Przypisane osoby dostają powiadomienie
w dzwonku (autor nie). Autor może poprawić i usunąć swój komentarz, administrator może usunąć każdy. Na karcie widać
liczbę komentarzy. Część działa, gdy pracownik skomentuje zadanie, a przypisana do niego osoba zobaczy powiadomienie,
kliknie je i przeczyta komentarz w podglądzie zadania.

## Ekrany

### Komentarze w podglądzie zadania (szuflada z prawej, 540 px; obie role)

Jak w makiecie: pod formularzem zadania i linią oddzielającą.
- **Nagłówek:** ikona `message-square`, „Komentarze” i liczba w szarej plakietce.
- **Lista:** od najstarszego do najnowszego (najnowszy tuż nad polem do pisania). **[decyzja AI]** Każdy komentarz:
  kółko z inicjałami (osoba w archiwum albo usunięta na stałe: szare), imię i nazwisko, czas („dzisiaj, 08:32”,
  `formatRelativeDateTime`; po najechaniu pełna data), dopisek „(edytowany)” po poprawce, tekst z zachowanymi
  przejściami do nowej linii (zwykły tekst, bez linków i formatowania).
- **Przyciski pod komentarzem:** „Edytuj” tylko autor; „Usuń” autor i administrator. Pozostali nie widzą przycisków.
- **Pusta lista:** „Nikt jeszcze nie skomentował tego zadania.”
- **Pole „Napisz komentarz”** (rośnie do 8 linii), pod nim podpowiedź „Przypisane osoby dostaną powiadomienie.”
  i przycisk „Dodaj komentarz” (nieaktywny, gdy pole puste). Po dodaniu: pole czyści się, komentarz pojawia się na
  dole listy, dymek „Dodano komentarz.” Za długi tekst: błąd pod polem, tekst zostaje.
- **Edycja:** w miejscu komentarza pole z tekstem i przyciski „Anuluj” i „Zapisz”; po zapisie dymek „Zapisano
  komentarz.” i dopisek „(edytowany)”.
- **Usunięcie:** okno `ConfirmModal` „Usunąć komentarz?”, „Komentarz osoby <imię i nazwisko> zniknie na stałe.”,
  przyciski „Anuluj” i „Usuń” (czerwony); po usunięciu dymek „Usunięto komentarz.”
- **Komentarze zapisują się osobno od zadania:** „Dodaj komentarz” nie zapisuje zmian w polach zadania, a „Anuluj”
  zadania nie cofa komentarzy. **[decyzja AI]**
- **Odświeżanie:** lista komentarzy co 5 s, gdy szuflada jest otwarta i karta przeglądarki widoczna (jak tablica).
  Odświeżenie nie czyści pisanego komentarza ani otwartej edycji. **[decyzja AI]**
- Komentarz, którego już nie ma (ktoś go usunął w międzyczasie): przy zapisie albo usunięciu dymek „Nie znaleziono
  komentarza.” i lista się odświeża. Zadanie, którego już nie ma: jak w części 1 (dymek „Nie znaleziono zadania.”).
- **Link z powiadomienia** (`/admin/tasks/<projekt>?task=<id>`, jak w części 1) otwiera podgląd zadania; komentarze
  są pod formularzem.
- **Telefon:** ta sama szuflada na całą szerokość ekranu (jak w części 1).

### Karta zadania na tablicy

Gdy zadanie ma komentarze: ikona `message-square` i liczba (obok przypisanych osób), po najechaniu „3 komentarze”.
Bez komentarzy nic nie widać (jak w makiecie).

### Okno „Usunąć zadanie?” (zmiana tekstu z części 1)

Z komentarzami: „Zadanie „…” razem z 3 komentarzami zniknie z tablicy i trafi do archiwum. Administrator może je
stamtąd przywrócić.” (teksty `archive_text_*` już są). Komentarze zostają przy zadaniu w archiwum i wracają z nim.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Komentarz (dodaj, popraw) | Tekst | tak | 1–2000 znaków po obcięciu spacji z początku i końca | Tonery zamówione, będą w piątek. | `text(2000)` |

## Dane

Migracja `024_task_comments.sql`:

| Tabela | Kolumny |
|---|---|
| `task_comments` | `id`, `task_id INT UNSIGNED`, `user_id INT UNSIGNED NULL`, `user_name VARCHAR(141)` (kopia imienia i nazwiska), `text TEXT`, `edited_at DATETIME NULL`, `created_at`; indeks (`task_id`, `created_at`) |

| Rodzic | Dziecko (kolumna) | Przy usunięciu rodzica | Dlaczego |
|---|---|---|---|
| `tasks` | `task_comments.task_id` | CASCADE | komentarz bez zadania nie ma sensu (usunięcie zadania na stałe w Archiwum i usunięcie projektu) |
| `users` | `task_comments.user_id` | SET NULL + `user_name` | komentarz zostaje po usunięciu osoby na stałe |

**Wartości liczone przez serwer:** autor (`user_id`, `user_name` z `req.user`), `created_at`, `edited_at` (ustawiane
przy poprawce, która zmienia tekst; zapis bez zmiany tekstu niczego nie zmienia), liczba komentarzy na
karcie, prawa `canEdit` i `canDelete` przy każdym komentarzu.

**Archiwum:** komentarze zadania w archiwum są niewidoczne (zadanie w archiwum = 404, jak w części 1) i wracają przy
przywróceniu. Osoba w archiwum zostaje autorem swoich komentarzy (szare kółko), ale nie może ich już zmieniać (nie
może się zalogować).

**Historia zmian:** bez wpisów o komentarzach (zakres historii w `SPEC-GENERAL.md` nie obejmuje komentarzy; ślad
zmiany widać w dopisku „(edytowany)”). **[decyzja AI]**

## API

Pod tym samym `mountModule(api, 'tasks', …)` (admin, employee). „Widzi zadanie” = widzi projekt zadania (administrator
albo członek) i zadanie nie jest w archiwum; warunek w zapytaniu SQL, inaczej 404 (jak w części 1). Komentarz
z niewidocznego zadania też 404.

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/tasks/:taskId/comments` | widzi zadanie | — | lista od najstarszego: `id`, `authorId` (albo `null`), `authorName`, `authorArchived`, `text`, `createdAt`, `editedAt`, `canEdit`, `canDelete` | 404 |
| `POST /api/tasks/:taskId/comments` | widzi zadanie | `commentSchema` (`text`) | `{ id }`, 201 | 400 pole `text`; 404 |
| `PUT /api/tasks/comments/:commentId` | autor komentarza (widzi zadanie) | `commentSchema` | `{ ok }` | 400; 404; 403 `tasks.comment_not_author` (cudzy komentarz, także dla administratora) |
| `DELETE /api/tasks/comments/:commentId` | autor albo administrator (widzi zadanie) | — | `{ ok }` | 404; 403 `tasks.comment_not_author` (pracownik usuwa cudzy) |
| `GET /api/tasks/projects/:id/board` (zmiana) | jak w części 1 | — | każde zadanie dostaje `commentCount` | jak w części 1 |

Wszystkie zapisy w `withTransaction` (zapis komentarza i powiadomienie razem). `validateBody(commentSchema)`, numery
z adresu przez `idParam`. Kto pisze, poprawia i usuwa = `req.user`, nigdy dane z żądania.

**Powiadomienie** (w transakcji dodania komentarza, przez `notifyUsers`; poprawka i usunięcie komentarza nie
powiadamiają, odpowiedź 5a):

| Rodzaj | Kto dostaje | Tytuł | Szczegół | Link |
|---|---|---|---|---|
| `task_comment` (nowy) | osoby przypisane do zadania, bez autora komentarza i bez osób w archiwum | Nowy komentarz do zadania | „{tytuł zadania}”: {początek komentarza, do 80 znaków, z „…”} | `/admin/tasks/<projectId>?task=<id>` |

Autor komentarza widać w powiadomieniu jak przy innych rodzajach (pole autora czynności). **[decyzja AI]**

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| notifications | nowy rodzaj `task_comment` (stała w `NOTIFICATION_TYPES`, teksty w `notifications.json`, wpis w specu Powiadomień) | `notifyUsers` | — |
| archive (później) | komentarze zadania w archiwum wracają z nim; usunięcie na stałe kasuje je (CASCADE) | — | — |
| employees | osoba w archiwum przy komentarzu (szare kółko) | dane z `users` w zapytaniu komentarzy | `archived` |

## Teksty

`shared/locales/pl/tasks.json` ma już teksty makiety (`comments`, `comments_empty`, `comments_count_*`,
`comment_placeholder`, `comment_add`, `comment_added`, `comment_notify_hint`, `comment_edit`, `comment_edited`,
`comment_saved`, `comment_delete_title`, `comment_delete_text`, `comment_deleted`, `archive_text_*`). Nowe: błędy
serwera `comment_not_found`, `comment_not_author`. W `notifications.json` rodzaj `task_comment` (`title`, `detail`).

## Mapa dostępu (dopisuję do `SPEC-GENERAL.md` przy budowie)

| Adres | Kto ma dostęp | Uwagi |
|---|---|---|
| `GET/POST /api/tasks/:taskId/comments`, `PUT/DELETE /api/tasks/comments/:commentId` | admin, employee | tylko zadanie spoza archiwum z projektu, który osoba widzi (inaczej 404); poprawia tylko autor, usuwa autor albo administrator (inaczej 403) |

## Poza zakresem części 2

Wzmianki „@osoba”, załączniki i reakcje w komentarzach. E-maile o komentarzach (tylko dzwonek). Powiadomienie
o poprawionym albo usuniętym komentarzu. Historia zmian komentarzy.

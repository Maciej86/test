# Plan: Zadania, część 2: Komentarze

**Spec:** `SPEC-2.md` (i ogólny `SPEC.md`, `SPEC-1.md`). Każdy krok: najpierw test, który nie przechodzi, potem kod,
potem `npm run check` zielony i odhaczenie. Wykonanie w tej rozmowie, na `main`.

**Stałe ze specu (obowiązują w każdym kroku):** komentarz 1–2000 znaków po obcięciu spacji; lista od najstarszego;
odświeżanie komentarzy co 5000 ms (`TASK_BOARD_REFRESH_MS`) przy otwartej szufladzie i widocznej karcie; poprawia
tylko autor, usuwa autor albo administrator; powiadomienie `task_comment` tylko dla przypisanych, bez autora i bez
kont w archiwum, wyłącznie przy dodaniu; fragment komentarza w powiadomieniu do 80 znaków z „…”; bez wpisów w historii
zmian; teksty tylko z `tasks.json` i `notifications.json`; kolory z motywu; funkcje strzałkowe.

**Używam ponownie:** `ConfirmModal`, `ButtonIcon` (common), `notify`, `apiErrorMessage` (core), `PersonAvatar`
(tasks, szare kółko dla archiwum), `withTransaction`, `Db` (db), `idParam`, `reply`, `fail`, `notFound`, `viewerOf`
(routeHelpers), `validateBody`, `notifyUsers` (notifications), `findTask` i `lockTaskForWrite` (tasks: widoczność
i blokada zadania), `text` (`fields.ts`), `formatRelativeDateTime`, `formatDateTime`, `initials`, `taskBoardPath`
(shared), e2e `logIn`, `employee`, `typed` (helpers).

**Wydzielam:** brak (komentarzy ani skracania tekstu z „…” nie ma w innych modułach; `PersonAvatar` przyjmie osobę
bez urlopu, więc nie wymaga zmian poza ewentualnym `leave` opcjonalnym).

**Review focus (łatwo przeoczyć, testy w krokach):**
1. Pracownik zgaduje numer komentarza albo zadania z cudzego projektu albo z archiwum → 404, nic się nie zmienia
   (krok 4).
2. Pracownik poprawia albo usuwa cudzy komentarz, administrator poprawia cudzy → 403 (krok 4); autor wzięty
   z `req.user`, podrobione `userId`/`authorName` w treści ignorowane (krok 4).
3. Skrypt `<script>` w komentarzu widać jako tekst; przejścia do nowej linii zostają (kroki 6, 8).
4. Odświeżanie co 5 s nie czyści pisanego komentarza ani otwartej edycji (krok 6).
5. Komentarz usunięty przez kogoś innego w międzyczasie: zapis albo usunięcie → dymek „Nie znaleziono komentarza.”
   i odświeżona lista, nie biały ekran (kroki 4, 6).

---

- [x] **0. Szkielet testów.** `it.todo` dla każdego wymagania `SPEC-2.md`: `shared/src/schemas/__tests__/tasks.test.ts`
  (`commentSchema`, `commentExcerpt`), `backend/src/modules/tasks/__tests__/tasks.migration.test.ts` (024),
  nowe `…/tasks/__tests__/comments.queries.test.ts`, `comments.service.test.ts`, `comments.routes.test.ts`,
  `board.routes.test.ts` (`commentCount`), `frontend/src/modules/tasks/__tests__/` (`TaskComments.test.tsx`,
  `TaskCard`, `ArchiveTaskModal` w `TaskBoardPage`, `tasks.api`), `NotificationItem`/teksty `task_comment`,
  `e2e/tasks.spec.ts` (scenariusze `TESTS-2.md` i `describe('abuse')`) → `npm run check`.

- [x] **1. Migracja `024_task_comments.sql`.** Test w `tasks.migration.test.ts`: `task_id` → `tasks` `ON DELETE
  CASCADE`, `user_id` NULL → `users` `ON DELETE SET NULL`, `user_name VARCHAR(141)`, `text TEXT`, `edited_at`
  NULL, indeks (`task_id`, `created_at`). → `npm run migrate`, `npm run check`.

- [x] **2. Stałe, schemat, typy (shared).**
  - `shared/src/constants/tasks.ts`: `TASK_COMMENT_MAX = 2000`, `TASK_COMMENT_EXCERPT = 80`; w `TASK_MESSAGES`
    `commentNotFound: 'tasks.comment_not_found'`, `commentNotAuthor: 'tasks.comment_not_author'`.
  - `shared/src/schemas/tasks.ts`: `commentSchema = z.object({ text: text(TASK_COMMENT_MAX) })`, `CommentData`;
    typ odpowiedzi `TaskComment { id, authorId: number | null, authorName, authorArchived, text, createdAt, editedAt:
    string | null, canEdit, canDelete }`; `BoardTask` dostaje `commentCount: number`.
  - `commentExcerpt(text: string, max = TASK_COMMENT_EXCERPT): string` (białe znaki, także nowe linie, zwinięte do
    jednej spacji; dłuższy niż `max` → pierwsze `max - 1` znaków bez spacji na końcu + „…”).
  - Testy: `text` z samych spacji → `validation.required`; 2000 znaków ok, 2001 → `validation.too_long`; spacje na
    brzegach obcięte, nowe linie w środku zostają; `commentExcerpt` krótki bez zmian, 81 znaków → 80 znaków
    z „…”, wieloliniowy → jedna linia.
  - `NOTIFICATION_TYPES` + `'task_comment'`; `notifications.json` `types.task_comment.title` „Nowy komentarz do
    zadania”, `detail` „„{{task}}”: {{excerpt}}”; test tekstów powiadomień (każdy rodzaj ma `title` i `detail`)
    → `npm run check`.

- [x] **3. Zapytania `backend/src/modules/tasks/comments.queries.ts`.** Testy na prawdziwej bazie (wzór:
  `tasks.queries.test.ts`):
  - `listComments(db: Db, taskId: number): Promise<CommentRow[]>` (od najstarszego, przy równym czasie po `id`;
    `authorArchived` z `users.archived_at`, autor usunięty na stałe → `authorId: null`, nazwa z `user_name`);
  - `findComment(db, commentId, viewer, { lock? }): Promise<CommentRow & { taskId; projectId } | null>`: tylko
    komentarz zadania spoza archiwum z projektu, który osoba widzi (ten sam warunek co `findTask`), inaczej null;
  - `insertComment(db, taskId, author: Actor, text): Promise<number>`, `updateCommentText(db, id, text)` (ustawia
    `edited_at = NOW()`), `deleteComment(db, id)`;
  - `commentCounts(db, taskIds: number[]): Promise<Map<number, number>>` (pusta lista → pusta mapa bez zapytania)
    → `npm run check`. **Uwaga:** testy zapytań jak w części 1 (podstawiona baza sprawdza SQL i parametry), nie na
    prawdziwej bazie; prawdziwą bazę sprawdza test e2e (krok 9).

- [x] **4. Usługa i trasy komentarzy.** `comments.service.ts`, trasy w `tasks.routes.ts`.
  - `listTaskComments(taskId, viewer): Result<TaskComment[]>` (`canEdit` = autor; `canDelete` = autor albo
    administrator); `addComment(taskId, data, viewer): Result<{ id }>` (w `withTransaction`: blokada zadania,
    zapis, `notifyUsers` `task_comment` do przypisanych bez autora z `params { task, excerpt }`, link
    `taskBoardPath(projectId, taskId)`, `actor`); `editComment(commentId, data, viewer)`; `removeComment(commentId,
    viewer)`.
  - Testy usługi (zapytania podmienione) i tras (`comments.routes.test.ts`, wzór `tasks.routes.test.ts`):
    `GET /tasks/:taskId/comments` 200 z listą; zadanie z cudzego projektu albo w archiwum → 404.
    `POST` → 201 `{ id }`; pusty tekst → 400 z polem `text`; podrobione `userId`/`authorName` w treści ignorowane;
    powiadomienie dostają przypisani bez autora (autor przypisany → nie dostaje; nikt przypisany → bez wywołania).
    `PUT /tasks/comments/:commentId` autor → `{ ok }` i `edited_at`; ten sam tekst → bez zmiany `edited_at`;
    cudzy (pracownik i administrator) → 403 `tasks.comment_not_author`; nieistniejący albo z niewidocznego zadania →
    404 `tasks.comment_not_found`; numer `abc` → 404 (`idParam`).
    `DELETE` autor → `{ ok }`; administrator cudzy → `{ ok }`; pracownik cudzy → 403; nieistniejący → 404.
    **Uwaga:** `addComment` blokuje tylko wiersz zadania (`findTask` z `lock`), nie projekt: komentarz nie zmienia
    pozycji, a jedna blokada nie może się zakleszczyć z innymi zapisami.
    Bez logowania 401, jeden test 403 nie dotyczy (obie role w module; zostaje test `routeProtection`).
  - `SPEC-GENERAL.md`: wiersz w „Mapie dostępu” (z `SPEC-2.md`) → `npm run check`.

- [x] **5. Licznik na tablicy.** `getBoard` dokłada `commentCount` z `commentCounts`. Test w `board.routes.test.ts`
  / `tasks.service.test.ts`: zadanie z 2 komentarzami → `commentCount: 2`, bez → 0 → `npm run check`.

- [x] **6. Hooki i komentarze w podglądzie (front).**
  - `tasks.api.ts`: `useTaskComments(taskId)` (klucz `['tasks', 'comments', taskId]`, `refetchInterval:
    TASK_BOARD_REFRESH_MS`, `refetchIntervalInBackground: false`, `refetchOnWindowFocus: true`), `useAddComment`,
    `useEditComment`, `useDeleteComment` (po sukcesie odświeżają klucz `['tasks']`, czyli komentarze i licznik
    na tablicy). Test w `tasks.api.test.tsx`: adresy i odświeżenie po zapisie.
  - `components/TaskComments.tsx` (lista, `CommentItem`, pole, `ConfirmModal`) jak w makiecie; podpięty w
    `TaskDrawer` **pod** `</form>` z `Divider`, żeby Enter i „Zapisz” zadania go nie dotyczyły; dane przez
    `DataState`.
  - Testy `TaskComments.test.tsx`: pusta lista → „Nikt jeszcze nie skomentował tego zadania.”; „Dodaj komentarz”
    wyłączony przy pustym polu; dodanie → POST, pole puste, dymek; „(edytowany)” przy `editedAt`; „Edytuj” tylko przy
    `canEdit`, „Usuń” tylko przy `canDelete`; usunięcie przez okno „Usunąć komentarz?” z nazwiskiem; tekst
    `<script>` widoczny jako tekst, nowe linie zostają (`white-space: pre-wrap`); nowe dane z serwera (odświeżenie)
    nie czyszczą pola ani otwartej edycji; błąd 404 przy zapisie → dymek z `tasks.comment_not_found`; za długi
    tekst → błąd pod polem z serwera, tekst zostaje → `npm run check`.

- [x] **7. Karta i okno usuwania.** `TaskCard`: ikona `MessageSquare` i liczba przy `commentCount > 0`, podpowiedź
  `comments_count` („3 komentarze”); `ArchiveTaskModal` z `count: task.commentCount`. Testy w `TaskCard.test.tsx`
  (0 → brak ikony, 3 → „3” i podpowiedź) i teście okna (tekst z „3 komentarzami”) → `npm run check`.

- [x] **8. Teksty i makieta.** `tasks.json`: `comment_not_found` „Nie znaleziono komentarza.”, `comment_not_author`
  „Możesz zmieniać tylko swoje komentarze.”; spec Powiadomień: rodzaj `task_comment`; makieta zgodna z aplikacją
  (sprawdzić, że w makiecie Enter nie zapisuje zadania; poprawić, jeśli coś się rozjechało) → `npm run check`.

- [x] **9. Test e2e** w `e2e/tasks.spec.ts` ze scenariuszy `TESTS-2.md`: pracownik komentuje zadanie przypisanej
  osoby → ona widzi powiadomienie, klika je, widzi komentarz w podglądzie, licznik „1” na karcie; autor poprawia
  („(edytowany)”) i usuwa swój; administrator usuwa cudzy; pracownik nie widzi przycisków przy cudzym →
  `npm run test:e2e`.

- [x] **10. Przegląd kodu** całej części (lista kontrolna z `CONVENTIONS.md`), poprawki z testami → `npm run check`.
  Poprawione: komentarz do zadania usuniętego w międzyczasie → 404 `tasks.task_not_found` („Nie znaleziono zadania.”)
  i od razu odświeżona tablica; poprawka i usunięcie komentarza blokują najpierw zadanie, potem tylko wiersz
  komentarza (`FOR UPDATE OF c`, ta sama kolejność co usuwanie zadania i projektu); fragment w powiadomieniu cięty po
  znakach (emotikona nie jest przecinana); licznik w nagłówku komentarzy dopiero po wczytaniu listy. Próby nadużyć na
  prawdziwej bazie: etap testy (`describe('abuse')`).

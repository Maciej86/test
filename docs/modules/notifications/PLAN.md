# Plan: Powiadomienia

> Wykonanie: w tej rozmowie, krok po kroku (`superpowers:executing-plans` + `superpowers:test-driven-development`),
> na gałęzi `main`. Każdy krok: test, który nie przechodzi → kod → `npm run check` → odhaczenie `- [x]`.

**Cel:** dzwonek w belce panelu (licznik, 8 ostatnich), strona `/admin/notifications` (filtr, grupy po dniach,
stronicowanie), tabela `notifications`, trasy tylko dla własnych powiadomień i funkcje `notifyUsers` / `notifyAdmins`
dla modułów Moje urlopy, Wnioski urlopowe i Zadania; `npm run notifications:test`.

**Architektura:** backend `modules/notifications/`: `notifications.queries.ts` (SQL na `notifications`, zawsze
z `userId`), `notifications.service.ts` (`notifyUsers`, `notifyAdmins`, sprzątanie, odczyt), `notifications.routes.ts`;
podpięcie `mountModule(api, 'notifications', notificationsRoutes, ['admin', 'employee'])`. Front
`modules/notifications/`: `notifications.api.ts`, `NotificationBell.tsx`, `NotificationsPage.tsx`, `components/`
(`NotificationItem`, `BellPanel`), `notificationTime.ts`. Dzwonek wstawia `common/SideMenuLayout.tsx`; strona
spoza menu dopięta w `buildAppRoutes.tsx`. Wygląd 1:1 z makiety (`mockups/src/modules/notifications/`).

**Spec:** `docs/modules/notifications/SPEC.md` · `docs/CONVENTIONS.md` · makieta `mockups/src/modules/notifications/`

## Zasady całego planu

- Stałe w `shared/src/constants/notifications.ts` (eksport w `constants/index.ts`): `NOTIFICATION_TYPES =
  ['leave_request_new', 'leave_request_withdrawn', 'leave_approved', 'leave_rejected', 'leave_cancelled',
  'task_assigned'] as const`, `NotificationType`, `NOTIFICATION_BELL_LIMIT = 8`, `NOTIFICATION_KEEP_DAYS = 90`,
  `NOTIFICATION_REFRESH_MS = 60_000`, `NOTIFICATION_LINK_PREFIX = '/admin/'`, `NOTIFICATIONS_PATH =
  '/admin/notifications'`, `NOTIFICATION_BADGE_MAX = 99`.
- Teksty tylko w `shared/locales/pl/notifications.json` (są z makiety; brakujące dopisujesz tam). Daty w parametrach
  `RRRR-MM-DD`, na ekranie `formatDate`; godzina `formatTime`.
- Każde zapytanie do `notifications` z odczytu albo oznaczania ma `user_id = ?` z `req.user.id`; cudze → 404.
- Bez historii zmian (`logActivity`) w tym module. GET nic nie zapisuje.
- Funkcje strzałkowe, testy w `__tests__`, testy zasad niezmienione.

## Na co uważać (testy dopisane w krokach)

1. Admin klika „oznacz” na powiadomieniu pracownika (`POST /:id/read` z cudzym id) → 404 i wiersz bez zmian (krok 3).
2. Moduł woła `notifyUsers` z osobą, która sama wykonała czynność, i z kontem w archiwum → żaden z nich nie dostaje
   wiersza; pusta lista odbiorców nie wysyła `INSERT` (krok 2).
3. Powiadomienie z `link` spoza `/admin/` (np. `https://…` albo `//evil`) → `notifyUsers` rzuca błąd zamiast zapisać,
   a front i tak nawiguje tylko po adresach z `/admin/` (kroki 2 i 6).
4. 100 nieprzeczytanych → na dzwonku „99+”, a nie rozjechana liczba (krok 5).
5. Powiadomienie z godziny 23:50 dnia poprzedniego (strefa `Europe/Warsaw`) → „wczoraj, 23:50”, nie „dzisiaj”
   (krok 4).

---

- [x] **0. Szkielet testów.** `it.todo` dla każdego wymagania z kroków 1–8 w:
  `shared/src/schemas/__tests__/notifications.test.ts`,
  `backend/src/modules/notifications/__tests__/notifications.queries.test.ts`,
  `backend/src/modules/notifications/__tests__/notifications.service.test.ts`,
  `backend/src/modules/notifications/__tests__/notifications.routes.test.ts`,
  `backend/src/scripts/__tests__/sendTestNotifications.test.ts`,
  `frontend/src/modules/notifications/__tests__/notificationTime.test.ts`,
  `frontend/src/modules/notifications/__tests__/NotificationBell.test.tsx`,
  `frontend/src/modules/notifications/__tests__/NotificationsPage.test.tsx`,
  `shared/src/__tests__/navigation.test.ts` (dopisane), `e2e/notifications.spec.ts` (`test.fixme`). → `npm run check`

- [x] **1. Stałe, schematy, migracja.** Stałe wyżej. `shared/src/schemas/notifications.ts`:
  `notificationsQuerySchema = z.object({ page: z.coerce.number().int().min(1).catch(1).default(1), unread:
  z.enum(['0', '1'], { error: 'validation.invalid' }).default('0') })`; typy `NotificationItem = { id: number; type:
  NotificationType; params: Record<string, string | number>; actorName: string | null; link: string | null; readAt:
  string | null; createdAt: string }`, `NotificationsSummary = { unread: number; latest: NotificationItem[] }`,
  `NotificationsListResponse = ListResponse<NotificationItem> & { unread: number }`; eksport w `shared/src/index.ts`.
  Testy: brak parametrów → `{ page: 1, unread: '0' }`; `page=abc` → 1; `unread=2` → błąd. Migracja
  `backend/migrations/010_notifications.sql` według tabeli w specu (`user_id` FK `ON DELETE CASCADE`, indeks
  `idx_notifications_user (user_id, read_at, created_at)`); `npm run migrate`. → `npm run check`

- [x] **2. Zapytania i usługa (tworzenie).** `notifications.queries.ts`:
  `insertNotifications(conn, rows: { userId; type; params; actorName; link }[]): Promise<void>` (jeden `INSERT …
  VALUES (?, ?, ?, ?, ?), …`, `params` przez `JSON.stringify`), `deleteOldRead(conn, userIds: number[], days: number)`
  (`read_at < NOW() - INTERVAL ? DAY AND user_id IN (?)`), `activeUserIds(conn, ids: number[]): Promise<number[]>`
  (bez `archived_at`), `activeAdminIds(conn): Promise<number[]>`.
  `notifications.service.ts`: `NotifyInput = { type: NotificationType; params: Record<string, string | number>; link:
  string; actor: { id: number; name: string } }`; `notifyUsers(conn, input & { userIds: number[] }): Promise<number>`
  (zwraca liczbę zapisanych), `notifyAdmins(conn, input): Promise<number>`. Kolejność: odbiorcy bez `actor.id`,
  bez duplikatów, tylko aktywni → pusto: koniec bez zapisu → `insertNotifications` → `deleteOldRead(…,
  NOTIFICATION_KEEP_DAYS)`. `link` bez `NOTIFICATION_LINK_PREFIX` na początku albo z `//` → `throw new Error`.
  Testy (zapytania z podmienionym `conn.query`, usługa z podmienionymi zapytaniami): osoba wykonująca pominięta;
  archiwalni pominięci; duplikaty raz; pusto → brak `INSERT`; `notifyAdmins` bierze `activeAdminIds`; zły `link`
  → błąd; sprzątanie dostaje 90 i tylko odbiorców; SQL tylko z `?`. → `npm run check`

- [x] **3. Odczyt i trasy.** Zapytania: `countUnread(userId)`, `listForUser(userId, { page, unreadOnly, limit })
  → { items, total }` (`ORDER BY created_at DESC, id DESC`, mapowanie na `NotificationItem`, `params` z JSON),
  `markRead(userId, id): Promise<boolean>` (`UPDATE … SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND
  user_id = ?`; `false`, gdy 0 dopasowanych), `markAllRead(userId): Promise<number>`.
  Usługa: `getSummary(userId): NotificationsSummary`, `getList(userId, query): NotificationsListResponse`
  (`PAGE_SIZE`), `readOne(userId, id): Result`, `readAll(userId): { updated }`.
  `notifications.routes.ts`: `GET /summary`, `GET /` z `validateQuery(notificationsQuerySchema)`, `POST /:id/read`
  (`idParam`, 204 albo 404 `SERVER_MESSAGES.notFound`), `POST /read-all`; `mountModule` w `app.ts`.
  Testy tras: summary i lista zwracają dane `req.user.id` (sprawdzone argumenty usługi); `unread=2` → 400; `/abc/read`
  → 404; cudze → 404; `read-all` → `{ updated }`; 401 bez logowania; 403 przy haśle tymczasowym
  (`password_change_required`). Test zapytań: `markRead` ma `user_id = ?` i nie nadpisuje `read_at`.
  → `npm run check`

- [x] **4. Podświetlenie menu i czas na ekranie.** `shared/src/navigation.ts` `activeNavKey`: pozycja, której
  adres to sam adres części (`/admin`, `/account`), pasuje tylko dokładnie. Test: `/admin/notifications` → `null`,
  `/admin` → `dashboard`, `/admin/employees/5` → `employees`. `frontend/src/modules/notifications/notificationTime.ts`:
  `whenLabel(iso: string, now: Date, t): string` („dzisiaj, GG:MM” / „wczoraj, GG:MM” / `formatDateTime`) i
  `dayLabel(iso, now, t)` („Dzisiaj” / „Wczoraj” / `formatDate`); porównanie dni przez `formatDate`. Testy: dziś,
  wczoraj 23:50, przedwczoraj, przełom roku (01.01 vs 31.12). → `npm run check`

- [x] **5. Dzwonek.** `notifications.api.ts`: `useNotificationsSummary()` (`refetchInterval:
  NOTIFICATION_REFRESH_MS`, `refetchOnWindowFocus: true`), `useNotificationsList(query)`, `useMarkRead()`,
  `useMarkAllRead()` (oba unieważniają `['notifications']`). `components/NotificationItem.tsx` i
  `components/BellPanel.tsx` jak w makiecie; `NotificationBell.tsx`: komputer `Popover` 420 px, telefon `Drawer`
  z prawej na cały ekran (`useMediaQuery` z `theme.breakpoints.sm`); liczba > `NOTIFICATION_BADGE_MAX` → „99+”;
  kliknięcie: `markRead`, zamknięcie, `navigate(link)` tylko gdy `link` zaczyna się od `NOTIFICATION_LINK_PREFIX`.
  `SideMenuLayout.tsx`: dzwonek przed `UserMenu`. Testy (`renderWithProviders`, `vi.spyOn(api, …)`): licznik 3;
  100 → „99+”; 0 → bez liczby; otwarcie pokazuje tytuły z `types.*`; kliknięcie woła `POST /notifications/5/read`
  i przechodzi pod `link`; `link` `https://x` → bez przejścia; „Oznacz wszystkie” woła `read-all`; pusto → tekst
  `empty`; błąd → „Spróbuj ponownie”. → `npm run check`

- [ ] **6. Strona „Powiadomienia”.** `NotificationsPage.tsx` jak makieta (bez panelu pytań i przełącznika stanów):
  tytuł, podpowiedź, „Oznacz wszystkie…”, `SegmentedControl` Wszystkie / Nieprzeczytane (N), grupy `dayLabel`, godzina
  `formatTime`, `Pagination`; `page` i `unread` w adresie (czytane `notificationsQuerySchema`), `DataState`. Trasa
  `NOTIFICATIONS_PATH` w `buildAppRoutes.tsx` (dziecko `AppLayout`, dla obu ról), strona w `pages.ts`. Testy:
  grupy „Dzisiaj”/„Wczoraj”/data; `?unread=1` wysyła `unread: '1'`; pusto przy filtrze → `empty_unread`; druga strona
  z `Pagination`; „Pokaż wszystkie” w dzwonku prowadzi tutaj. → `npm run check`

- [ ] **7. Polecenie `npm run notifications:test`.** `backend/src/scripts/sendTestNotifications.ts`: dla każdego
  aktywnego admina po jednym `leave_request_new` i `leave_request_withdrawn`, dla każdego aktywnego pracownika po
  jednym `leave_approved`, `leave_rejected`, `leave_cancelled`, `task_assigned`; przez `notifyUsers` w
  `withTransaction`, `actor` = `{ id: 0, name: 'Powiadomienie testowe' }` (tekst z `notifications.json`, klucz
  `test_actor`); nie działa przy `NODE_ENV=production`; wypisuje, ile dodał. Skrypty w `backend/package.json`
  i głównym `package.json`; wiersz w `README.md`. Testy: produkcja → błąd; rodzaje trafiają do właściwych ról.
  → `npm run check`

- [ ] **8. E2E i dokumenty.** `seedE2e.ts`: usuwa powiadomienia kont e2e i dodaje adminowi e2e dwa nieprzeczytane
  (`leave_request_new`, link `/admin/leave-requests`) i jedno przeczytane. `e2e/notifications.spec.ts` ze scenariuszy
  `TESTS.md` (admin: licznik 2, kliknięcie → przejście i licznik 1, strona i filtr, „Oznacz wszystkie” → bez
  licznika; pracownik: dzwonek pusty). `docs/DESIGN.md`: wzorzec „Dzwonek powiadomień” w tabeli wzorców. Przegląd
  kodu całego modułu (lista kontrolna z `CONVENTIONS.md`), poprawki z testem. → `npm run check`, `npm run test:e2e`

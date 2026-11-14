# Plan: Logowanie

> Wykonanie: w tej rozmowie, krok po kroku (`superpowers:executing-plans` + `superpowers:test-driven-development`),
> na gałęzi `main`. Każdy krok: test, który nie przechodzi → kod → `npm run check` → odhaczenie `- [x]`.

**Cel:** logowanie loginem i hasłem, hasło tymczasowe do zmiany, wylogowanie po 30 min bezczynności (z ostrzeżeniem),
pierwszy administrator z terminala; tabele `users` i `activity_log`.

**Architektura:** backend: `modules/auth/` (trasy publiczne `login`/`logout` przed `requireAuth`, `me` i
`change-password` za nim), `authenticate` czyta konto z bazy i odnawia token tylko przy nagłówku aktywności,
`requirePasswordChanged` w `app.ts` zaraz za `requireAuth`. Front: `modules/login/` (ekrany), `core/auth/` (sesja,
aktywność, bezczynność), `common/IdleWarningModal.tsx` w `SideMenuLayout`.

**Spec:** `docs/modules/login/SPEC.md` · wzorzec `docs/conventions/login.md` · `docs/CONVENTIONS.md`

## Zasady całego planu

- Teksty tylko w `shared/locales/pl/login.json`, `server.json`, `validation.json`; kod po angielsku.
- Stałe: `IDLE_LOGOUT_MS = 30 * 60_000`, `IDLE_WARNING_MS = 60_000`, `SESSION_KEEPALIVE_MS = 60_000`,
  `USER_ACTIVITY_HEADER = 'X-User-Activity'` (`shared/src/constants/login.ts`); `TOKEN_TTL = '31m'`,
  `TOKEN_RENEW_AFTER_MS = 60_000` (`backend/src/config/constants.ts`; `AUTH_COOKIE_MAX_AGE_MS` usunięte).
- Limity pól: `USER_NAME_MAX = 150`, `LOGIN_MIN = 3`, `LOGIN_MAX = 190`, `EMAIL_MAX = 190`, `PASSWORD_MIN = 8`,
  `PASSWORD_MAX = 72` (`shared/src/constants/login.ts`; te same długości w migracji).
- Testy zasad niezmienione; `// rule-ok:` tylko z konkretnym powodem (trasy publiczne bez 401 w pliku tras).
- Hasła nigdy w kodzie ani w rozmowie: e2e losuje hasło przy każdym uruchomieniu.

## Na co uważać (testy dopisane w krokach)

1. Login wpisany z wielkimi literami lub spacją na końcu (`Jan.Kowalski@firma.pl `) → logowanie działa (krok 1, 5).
2. Konto zarchiwizowane w trakcie sesji → następne żądanie 401, nie dane (krok 4).
3. Odświeżanie w tle bez czynności człowieka nie przedłuża sesji (krok 4, 8).
4. Hasło ze spacją na początku lub polskimi znakami zapisuje się i loguje dokładnie tak, jak wpisane (krok 1, 6).
5. Osoba z hasłem tymczasowym wpisuje adres `/admin/tasks` ręcznie → trafia na `/change-password` (krok 6, 9).

---

- [x] **0. Szkielet testów.** Pliki z `it.todo` dla każdego wymagania z kroków 1–13 (nazwy testów jak niżej):
  `shared/src/schemas/fields.test.ts` (dopisane), `shared/src/schemas/login.test.ts`, `shared/src/date.test.ts`
  (dopisane), `backend/src/auth/password.test.ts`, `backend/src/auth/token.test.ts`,
  `backend/src/middleware/authenticate.test.ts`, `backend/src/modules/auth/auth.routes.test.ts`,
  `backend/src/modules/auth/auth.rateLimit.test.ts`, `backend/src/middleware/requirePasswordChanged.test.ts`,
  `backend/src/scripts/createAdmin.test.ts`, `frontend/src/core/auth/activity.test.ts`,
  `frontend/src/core/auth/useIdleLogout.test.tsx`, `frontend/src/modules/login/LoginPage.test.tsx`,
  `frontend/src/modules/login/ChangePasswordPage.test.tsx`, `frontend/src/core/routes/buildRoutes.test.tsx`
  (dopisane), `e2e/login.spec.ts` (`test.fixme`). → `npm run check`

- [x] **1. Pola i schematy.**
  - `fields.ts`: `login` (trim, małe litery, `LOGIN_MIN`–`LOGIN_MAX`, bez białych znaków → `validation.login_format`),
    `loginInput` (trim, małe litery, 1–`LOGIN_MAX`, bez sprawdzania formatu), `passwordInput` (bez trim,
    1–`PASSWORD_MAX`), `newPassword` (bez trim, `PASSWORD_MIN`–`PASSWORD_MAX`, `/\d/` i `/[^\p{L}\p{N}]/u` →
    `validation.password_rules`).
  - `shared/src/schemas/login.ts`: `loginSchema = { login: loginInput, password: passwordInput }`,
    `newPasswordSchema = { newPassword, repeatPassword }` z `refine` (różne → `validation.passwords_differ` na
    `repeatPassword`), `adminAccountSchema = { name: text(USER_NAME_MAX), login, email: optionalField(email),
    password: newPassword }`; typy `LoginInput`, `NewPasswordInput`, `AdminAccountInput`.
  - Testy: `login` 2/3/190/191 znaków, spacja w środku → błąd, `Jan.Kowalski@Firma.pl ` → `jan.kowalski@firma.pl`;
    `newPassword` 7/8/72/73 znaki, `Urlop2026` (brak znaku) i `Urlop-urlop` (brak cyfry) → `validation.password_rules`,
    `Urlop-2026` ok, ` Zażółć-1 ` zostaje ze spacjami; `repeatPassword` różne → błąd na tym polu; puste → `required`.
  - Teksty `validation.json`: `login_format`, `password_rules`, `passwords_differ`, `password_same_as_temporary`.

- [x] **2. Stałe i data na ekran.** `shared/src/constants/login.ts` (stałe z „Zasad”), eksport z `@app/shared`.
  `formatDateParts(value: DateInput): { weekday: string; day: string; monthYear: string; full: string } | null`
  w `shared/src/date.ts` (dayjs z `dayjs/locale/pl`, strefa aplikacji). Test: `2026-11-14` → `piątek`, `14`,
  `listopada 2026`, `piątek, 14 listopada 2026`; `null` → `null`.

- [ ] **3. Migracje.** `backend/migrations/001_users.sql` (kolumny ze specu, `UNIQUE (login)`, `UNIQUE (email)`,
  `fk_users_archived_by` `ON DELETE SET NULL`), `002_activity_log.sql` (kopia `db/sql/activity_log.sql`).
  → `npm run db`, `npm run migrate`, `npm run check` (test zasad sprawdza `ON DELETE`).

- [x] **4. Hasła, token, `authenticate` z bazy.**
  - `backend/src/auth/password.ts`: `hashPassword(plain): Promise<string>` (`BCRYPT_COST`),
    `verifyPassword(plain, hash): Promise<boolean>`, `DUMMY_PASSWORD_HASH` (skrót liczony raz przy starcie, do
    porównania przy braku konta). Testy: zgodne / niezgodne hasło, skrót ≠ hasło.
  - `SessionUser` + `mustChangePassword: boolean` (`shared/src/navigation.ts`, poprawione testy).
    `token.ts`: token z `{ id }` i `iat`; `TOKEN_TTL = '31m'`; `setAuthCookie` bez `maxAge`;
    `verifyToken(token): { id: number; issuedAtMs: number } | null`.
  - `backend/src/modules/auth/auth.queries.ts`: `findActiveUserById(id)`, `findActiveUserByLogin(login)` (z
    `password_hash`), `updatePassword(id, hash)` (zeruje `must_change_password`); tylko `archived_at IS NULL`.
  - `authenticate` (async): token → `findActiveUserById` → `req.user`; brak konta → bez `req.user`.
    Gdy nagłówek `X-User-Activity: 1` i token starszy niż `TOKEN_RENEW_AFTER_MS` → nowe ciasteczko.
  - Testy (`pool` podmieniony jak w `transaction.test.ts`): konto w archiwum → 401 na `/auth/me`; zmieniona rola w
    bazie → nowa rola w `req.user`; token 2 min + nagłówek → `Set-Cookie`; bez nagłówka → brak `Set-Cookie`;
    token 30 s + nagłówek → brak `Set-Cookie`; wygasły token → 401.

- [x] **5. Trasy `login`, `logout`, `me`.** `backend/src/modules/auth/auth.routes.ts`: `authPublicRoutes`
  (`POST /auth/login` z `loginLimiter`, `validateBody(loginSchema)`; `POST /auth/logout` → 204) i `authRoutes`
  (`GET /auth/me` → `{ user }`). Podpięcie w `app.ts`: publiczne w części 1, `authRoutes` zaraz za `requireAuth`.
  Wiersze w „Mapie dostępu”. Testy: dobre dane → 200, `{ user }` bez `password_hash`, ciasteczko; zły login,
  złe hasło, konto w archiwum → 401 `server.login_failed`; brak konta → `verifyPassword` wołane z
  `DUMMY_PASSWORD_HASH`; `JAN.KOWALSKI@FIRMA.PL` → szuka `jan.kowalski@firma.pl`; puste pola → 400 z kluczami pól;
  `me` bez logowania → 401. Osobny `auth.rateLimit.test.ts`: 10 nieudanych → 401, 11. → 429
  `server.too_many_logins`; udane nie zużywają limitu.

- [x] **6. Hasło tymczasowe.** `backend/src/middleware/requirePasswordChanged.ts`: przy `req.user.mustChangePassword`
  → 403 `server.password_change_required` (w `app.ts` za `authRoutes`, przed modułami). `POST /auth/change-password`
  w `authRoutes` z `validateBody(newPasswordSchema)`: bez hasła tymczasowego → 409 `server.password_not_temporary`;
  takie samo jak obecne → 400 `fields.newPassword = validation.password_same_as_temporary`; inaczej zapis i 200
  `{ user }` z `mustChangePassword: false`. Testy: wszystkie trzy przypadki; moduł testowy za logowaniem →
  403 przy haśle tymczasowym, 200 po zmianie; `me`, `logout`, `change-password` dostępne przy haśle tymczasowym;
  hasło ` Zażółć-1 ` zapisane i zweryfikowane bez zmian. Klucz `password_not_temporary` w `server.json`.

- [x] **7. Polecenie `npm run admin`.** `backend/src/scripts/createAdmin.ts`: czysta funkcja
  `createAdminAccount(input: unknown, deps: { loginTaken(login): Promise<boolean>; insert(row): Promise<number> })`
  → `{ ok: true, id } | { ok: false, errors }` (sprawdza `adminAccountSchema`, zajęty login → `login_taken`,
  rola `admin`, `must_change_password = 0`); część terminalowa (`node:readline`, hasło niewidoczne, powtórzenie)
  tylko woła tę funkcję. Skrypt `admin` w `backend/package.json` i głównym `package.json`; teksty w `login.json`
  (`admin_cli.*`); README: „Pierwszy administrator”. Testy funkcji: poprawne dane → `insert` z rolą `admin`
  i skrótem (nie hasłem); zajęty login → błąd, bez `insert`; słabe hasło → `validation.password_rules`.

- [x] **8. Sesja na froncie.** `frontend/src/core/auth/activity.ts`: `markActivity()`, `lastActivityAt()`,
  `isRecentlyActive(now)` (wspólne dla kart przez `localStorage`, odporne na brak `localStorage`),
  `onLogoutInOtherTab(cb)` / `announceLogout()` (zdarzenie `storage`). `client.ts`: przechwytywacz żądań dokleja
  `X-User-Activity: 1`, gdy `isRecentlyActive`. `AuthProvider`: `logout(reason?: 'idle')` (POST `/auth/logout`,
  `announceLogout`, przejście na `/login` lub `/login?reason=idle`); inne karty po `announceLogout` → `/login`.
  Testy: nagłówek tylko po świeżej czynności; czynność zapisana w jednej „karcie” widoczna w drugiej; zdarzenie
  wylogowania z innej karty → `sessionRedirect.go('/login')`.

- [x] **9. Trasy frontu.** `buildAppRoutes`: niezalogowany na trasach panelu → `<Navigate to="/login">`; podczas
  `loading` kręciołek; `/change-password` → `pages['change-password']`; zalogowany z
  `mustChangePassword` na trasach panelu → `/change-password`. `pages.ts`: `login`, `change-password`.
  `SideMenuLayout`: „Wyloguj” → `logout()` z `useAuth`. Testy w `buildRoutes.test.tsx`: niezalogowany `/admin/tasks`
  → ekran logowania; z hasłem tymczasowym `/admin/tasks` → ekran zmiany hasła; zalogowany → Pulpit.

- [x] **10. Ekran logowania.** `frontend/src/modules/login/`: `LoginPage.tsx`, `components/CalendarSheet.tsx`,
  `components/AuthCard.tsx` (układ wspólny z ekranem hasła), `login.api.ts` (`useLogin()` → POST `/auth/login`,
  potem `refresh()`). Układ i teksty jak makieta (bez paska stanów). Testy: puste pola → „To pole jest wymagane.”;
  401 → czerwony komunikat `login_failed`; 429 → żółty `too_many_logins`; `?reason=idle` i `?reason=expired` →
  komunikaty; brak połączenia → `notify.error`; sukces z `mustChangePassword` → `/change-password`, bez → `/admin`; zalogowany na `/login` → `/admin`.

- [x] **11. Ekran „Ustaw własne hasło”.** `ChangePasswordPage.tsx` (ten sam `AuthCard`), `useChangePassword()`
  w `login.api.ts`. Testy: różne hasła → błąd pod „Powtórz”; słabe → `password_rules`; 400 z serwera
  `password_same_as_temporary` → błąd pod „Nowe hasło”; sukces → dymek „Hasło zapisane.” i `/admin`; bez hasła
  tymczasowego → `/admin`; link „Wyloguj”.

- [ ] **12. Ostrzeżenie o bezczynności.** `frontend/src/core/auth/useIdleLogout.ts`: nasłuch `mousemove`,
  `keydown`, `pointerdown`, `scroll`, `touchstart` → `markActivity()` (nie częściej niż co 1 s); co 1 s sprawdza
  `lastActivityAt()`: po `IDLE_LOGOUT_MS − IDLE_WARNING_MS` → `warning = true` z odliczaniem sekund, po
  `IDLE_LOGOUT_MS` → `logout('idle')`; przy czynności i braku zapytań przez `SESSION_KEEPALIVE_MS` → `GET /auth/me`.
  Przy otwartym ostrzeżeniu ruch myszy nie zamyka okna. `frontend/src/common/IdleWarningModal.tsx` w
  `SideMenuLayout`. Testy (sztuczny zegar): 28:59 bez okna, 29:00 okno z „60 s”, 30:00 → `logout('idle')`;
  „Zostań zalogowany” → okno znika, `GET /auth/me` z nagłówkiem; ruch myszy przy oknie → okno zostaje; czynność
  w innej karcie (wpis w `localStorage`) odsuwa ostrzeżenie.

- [ ] **13. Dokumenty i testy w przeglądarce.** „Mapa dostępu” w `SPEC-GENERAL.md` (`/change-password`,
  `POST /api/auth/change-password`), `TESTS.md`. `e2e/global-setup.ts`: losowe hasło (`E2E_PASSWORD` w
  `process.env`) i skrypt `backend/src/scripts/seedE2e.ts` (konta `e2e.admin@test.local` i
  `e2e.employee@test.local` z hasłem tymczasowym; odmawia przy `NODE_ENV=production`). `e2e/login.spec.ts`:
  logowanie admina → Pulpit; złe hasło → komunikat; pracownik z hasłem tymczasowym → ustawia hasło → Pulpit;
  wylogowanie → `/login`. `e2e/start.spec.ts`: „/” prowadzi na ekran logowania (zamiast „Witaj!”).
  → `npm run check`, `npm run test:e2e`.

## Rozstrzygnięcia w trakcie budowy

- Krok 1: stałe z kroku 2 (`shared/src/constants/login.ts`) powstały już w kroku 1, bo potrzebują ich pola.
- Krok 2: 14.11.2026 to sobota; poprawione w teście, makiecie i specu.
- Krok 3: Docker niedostępny w trakcie budowy; `npm run migrate` przeniesione na koniec (przed testami e2e).
- Krok 4: zapytania o konta w `backend/src/auth/users.queries.ts` (nie w `modules/auth/`), bo używa ich `authenticate`; `DUMMY_PASSWORD_HASH` jako funkcja `dummyPasswordHash()` liczona przy pierwszym użyciu (szybszy start i testy).
- Kroki 5–6: trasy dla zalogowanych podpięte przez `mountModule(api, 'auth', authRoutes, ['admin', 'employee'])` (adresy `/me`, `/change-password` pod `/api/auth`), żeby test ochrony tras sprawdzał też je; `POST /auth/logout` i `api.use(requirePasswordChanged)` z `// rule-ok` (brak danych wejściowych; blokada, nie moduł). Krok 6 zrobiony razem z 5, bo test zasad wymaga testu 403 przy trasach.
- Krok 7: polecenie sprawdza też zajęty e-mail (`validation.email_taken`), bo e-mail jest unikalny w bazie.
- Krok 10: kod błędu serwera czyta nowa wspólna funkcja `apiErrorKey` w `core/api/client.ts` (test zasad nie pozwala modułom importować axios).
- Krok 11: błędy pól z serwera czyta wspólna funkcja `apiErrorFields` w `core/api/client.ts`; klucz `login.passwords_differ` z makiety zastąpiony wspólnym `validation.passwords_differ`.

# Plan: Moje konto

**Spec:** `docs/modules/my-account/SPEC.md` (zaakceptowany 2026-11-20). Wykonanie w tej rozmowie, krok po kroku:
test, który nie przechodzi → kod → `npm run check` → `- [x]`.

**Używam ponownie:**
- serwer: `hashPassword`, `verifyPassword` (`auth/password.ts`), `findPasswordHash`, `updatePassword`
  (`auth/users.queries.ts`, podnosi `token_version`), `signToken` + `setAuthCookie` (jak `/change-password`),
  `withTransaction`, `logActivity`, `diffChanges`, `isDuplicateEntry`, `validateBody`, `mountModule`, wzór
  `loginLimiter` (`middleware/rateLimit.ts`);
- wspólne: pole `email`, `optionalField`, `passwordInput`, `newPassword` (`shared/src/schemas/fields.ts`),
  `describeActivity` (`shared/src/activityLog.ts`), `formatChangeValue` (activity-log), klucze
  `validation.email_taken`, `validation.passwords_differ`;
- front: `InfoCard`, `PageHeader`, `DataState`, `DateText`, `ButtonIcon`, `notify`, `apiErrorFields`,
  `apiErrorMessage`, `fieldError`, `useAuth().refresh`, `api` (`core/api/client.ts`).

**Wydzielam:**
- reguła zgodności haseł `newPassword === repeatPassword` (dziś w `newPasswordSchema`, `shared/src/schemas/login.ts`)
  → `withRepeatPassword(schema)` w `shared/src/schemas/fields.ts`; używa jej `newPasswordSchema` i nowy
  `myAccountPasswordSchema`.
- wiersz „etykieta po lewej, wartość po prawej” (`Row` w `leave-requests/components/DetailsDrawer.tsx` i w makiecie
  Moje konto) → `common/DetailRow.tsx` (front i makiety, ten sam), z testem; podmiana w `DetailsDrawer` i w makiecie.

Porównane ramy: `InfoCard` (common) dla trzech kart, jak w makiecie; bez szuflady i okna (formularze leżą na ekranie).

- [x] 0. Szkielet testów `it.todo` z wymagań:
  - `backend/src/modules/my-account/__tests__/my-account.routes.test.ts`: GET dane własnego konta (bez hasła i skrótu,
    nazwa typu umowy także ukrytego), 401, 403 (hasło tymczasowe); PUT email: zapis, `null` = brak, ten sam adres nie
    tworzy wpisu historii, zajęty aktywny → 409 pod `email` bez nazwiska, zajęty w archiwum → 409 tak samo, wyścig
    (unikalny indeks) → 409, zły format → 400, 191 znaków → 400; POST password: sukces (nowe ciasteczko, stara sesja
    innego urządzenia → 401), złe obecne → 400 pod `currentPassword`, nowe = obecne → 400 pod `newPassword`, zasady
    hasła → 400, różne powtórzenie → 400, 11. nieudana próba w 15 min → 429, udana nie liczy się do limitu; numer
    konta w treści żądania jest ignorowany (zmienia się tylko `req.user.id`);
  - `shared/src/schemas/__tests__/myAccount.test.ts`: wartości graniczne z „Pól formularzy” (e-mail 190/191, pusty →
    `null`; hasło 7/8/72/73 bajty, bez cyfry, bez znaku specjalnego, różne powtórzenie);
  - `shared/src/__tests__/activityLog.test.ts` (dopisane w kroku 4, plik zrobionego modułu: szkielet w
    `backend/src/modules/my-account/__tests__/activityLog.todo.test.ts`, pierwsza linia
    `// Docelowo: shared/src/__tests__/activityLog.test.ts`): `user_own_password` dla `after: 'changed'`, „zmieniono
    hasło” w `formatChangeValue`;
  - `frontend/src/modules/my-account/__tests__/MyAccountPage.test.tsx`: dane z serwera, teksty dla obu ról, zapis
    e-maila (dymek), błąd 409 pod polem, zmiana hasła (dymek, pola czyste, `refresh`), błędy pod polami z serwera,
    429 w dymku;
  - `e2e/my-account.spec.ts`: scenariusze z `TESTS.md`
  → `npm run check`
- [x] 1. Wydzielenie `withRepeatPassword` (`fields.ts`) + test; `newPasswordSchema` na nim (testy logowania bez
  zmian zielone). Wydzielenie `DetailRow` do `frontend/src/common/` i `mockups/src/common/` + test (etykieta i treść,
  długi tekst się łamie); podmiana `Row` w `DetailsDrawer` i w makiecie Moje konto → `npm run check`
- [x] 2. Schematy `shared/src/schemas/myAccount.ts`: `myAccountEmailSchema` (`{ email: optionalField(email) }`),
  `myAccountPasswordSchema` (`withRepeatPassword` z `currentPassword: passwordInput`, `newPassword`,
  `repeatPassword`), typ `MyAccount` (`name, login, role, email, hiredOn, contractTypeName`), stałe
  `MY_ACCOUNT_MESSAGES` (`currentWrong: 'my-account.server.current_wrong'`, `sameAsCurrent:
  'my-account.server.same_as_current'`), eksport w `shared/src/index.ts`; testy z kroku 0 → `npm run check`
- [x] 3. Serwer `backend/src/modules/my-account/` (`my-account.queries.ts`, `.service.ts`, `.routes.ts`):
  `findMyAccount(db, userId)`, `updateMyEmail(userId, email, actor)` (sprawdzenie zajętości wśród wszystkich kont
  oprócz własnego → 409 `validation.email_taken` pod `email`, bez `archivedUser`; `isDuplicateEntry(error,
  'uq_users_email')` → ten sam błąd; zapis + `logActivity` z `diffChanges` w `withTransaction`, bez wpisu przy braku
  zmiany), `changeMyPassword(userId, input, actor)` (porównanie z `findPasswordHash`; zapis przez `updatePassword`
  i wpis historii `password: { before: null, after: 'changed' }` w jednej transakcji; zwraca nową wersję sesji);
  trasa ustawia ciasteczko jak `/change-password`. Limit: `passwordChangeLimiter` w `middleware/rateLimit.ts`
  (`PASSWORD_CHANGE_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 }` w `config/constants.ts`,
  `keyGenerator` = `req.user.id`, `skipSuccessfulRequests`, komunikat `server.too_many_password_tries`).
  `mountModule(api, 'my-account', myAccountRoutes)` w `app.ts`; wiersz w „Mapie dostępu” `SPEC-GENERAL.md`
  (jest: `/api/my-account`, dopisać trzy adresy). Testy tras z kroku 0 → `npm run check`
- [x] 4. Historia zmian: `describeActivity` → `user_own_password` dla `changes.password.after === 'changed'`
  (przed `user_password`), `formatChangeValue('password', 'changed')` → `values.password_changed`; teksty
  `actions.user_own_password` „Zmiana własnego hasła”, `values.password_changed` „zmieniono hasło”; test w pliku
  docelowym, plik `.todo` usunięty → `npm run check`
- [x] 5. Front `frontend/src/modules/my-account/`: `my-account.api.ts` (`useMyAccount`, `useSaveMyEmail`,
  `useChangeMyPassword`; po zapisie e-maila odświeżenie `useMyAccount`), `MyAccountPage.tsx` z
  `components/ProfileCard.tsx`, `EmailCard.tsx`, `PasswordCard.tsx` według makiety (siatka 5/7, `align="flex-start"`;
  formularze w `<form noValidate>` z `useForm` + `zod4Resolver`, błędy z serwera przez `apiErrorFields`; po zmianie
  hasła `form.reset()`, `refresh()`); wpis `'my-account': MyAccountPage` w `core/routes/pages.ts`; teksty z kroku 0 →
  `npm run check`
- [x] 6. Teksty i makieta: `server.too_many_password_tries` w `server.json`, `notify_hint`, wszystkie klucze używane
  w `my-account.json`; makieta używa `DetailRow` i tych samych kluczy błędów → `npm run check`
- [x] 7. Test e2e `e2e/my-account.spec.ts` ze scenariuszy `TESTS.md` (świeże konto tymczasowe z `addEmployee`, żeby
  zmiana hasła nie psuła stałych kont testowych) → `npm run test:e2e`
- [x] 8. Przegląd kodu całego modułu (lista kontrolna z `CONVENTIONS.md`), poprawki z testem → `npm run check`

## Na co uważać (poza testami kroków)

- Pracownik z hasłem tymczasowym: wszystkie trasy modułu dają 403 (middleware `requirePasswordChanged`), test w kroku 3.
- Zmiana hasła kończy sesję na drugim urządzeniu, ale nie na tym: test w kroku 3 (dwa ciasteczka, stare → 401, nowe
  → 200).
- E-mail z wielkimi literami albo spacjami na brzegach: pole `email` już je obcina; zajętość porównuje bez względu na
  wielkość liter tak jak unikalny indeks w bazie (test w kroku 3).
- Limit prób liczy się na konto, nie na adres IP (dwie osoby z jednego biura się nie blokują): test w kroku 3.

# Plan: E-mail

> Wykonanie: w tej rozmowie, krok po kroku (`superpowers:executing-plans` + `superpowers:test-driven-development`),
> na gałęzi `main`. Każdy krok: test, który nie przechodzi → kod → `npm run check` → odhaczenie `- [x]`.

**Cel:** wysyłka e-maili (Mailpit lokalnie, Mailgun później przez `.env`), wzór e-maila „Nowy wniosek urlopowy”,
funkcja „powiadom administratorów” dla modułu „Moje urlopy”, `npm run email:test` i powrót pod `next` po zalogowaniu.

**Architektura:** backend `backend/src/email/`: `sendEmail.ts` (jedyny transport `nodemailer`), `escapeHtml.ts`,
`layout.ts` (wspólna rama HTML e-maila: pasek, treść, stopka; kolory z `shared/src/theme.ts`),
`templates/newLeaveRequest.ts`, `recipients.ts` (SQL adresatów), `notifyAdmins.ts`. Skrypt
`backend/src/scripts/sendTestEmail.ts`. Front: `safeNextPath` w `shared/src/navigation.ts`, `guarded()`
w `buildAppRoutes.tsx` dopisuje `?next=`, `LoginPage` czyta `next`. Bez tras API i migracji.

**Spec:** `docs/modules/email/SPEC.md` · `docs/CONVENTIONS.md` · makieta `mockups/src/modules/email/`

## Zasady całego planu

- Teksty tylko w `shared/locales/pl/email.json` (`new_request.*` są już z makiety), przez `createI18n()`; daty
  `formatDate`, liczby `formatNumber(n, 0)`. Kod po angielsku, funkcje jako stałe ze strzałką, testy w `__tests__`.
- Typ wejścia (eksport z `templates/newLeaveRequest.ts`):
  `NewLeaveRequestEmailData = { requestId: number; employeeName: string; leaveTypeName: string; dateFrom: string;
  dateTo: string; workingDays: number; daysFromCarried: number; daysFromAnnual: number; leftAfter: number | null;
  comment: string | null }` (daty `RRRR-MM-DD`).
- Link: `${env.FRONTEND_URL}/admin/leave-requests/${requestId}`.
- Testy zasad niezmienione; `// rule-ok:` tylko z konkretnym powodem (np. kolory w HTML e-maila, jeśli test kolorów
  obejmuje backend: kolory biorę z `theme.ts`, więc nie powinno być potrzeby).

## Na co uważać (testy dopisane w krokach)

1. Komentarz `<a href="https://zly.pl">kliknij</a> & "x"` → w HTML zamieniony na bezpieczne znaki, w wersji
   tekstowej bez zmian (krok 3).
2. Wysyłka do jednego z dwóch administratorów rzuca błąd → drugi i tak dostaje e-mail, funkcja nie rzuca, zwraca 1,
   w logu numer wniosku i adres (krok 4).
3. Brak administratorów z e-mailem → 0 wysłanych, bez wywołania transportu i bez błędu (krok 4).
4. `next` = `//obca.pl`, `https://obca.pl`, `/admin/../login`, `/admin\\x`, `/administrator`, `/login` → pomijany,
   Pulpit (krok 5).
5. Konto z hasłem tymczasowym i `next` → ekran zmiany hasła, nie `next` (krok 6).

## Kroki

- [x] 0. **Szkielet testów** (`it.todo`, nazwy jak niżej) w: `backend/src/email/__tests__/sendEmail.test.ts`,
  `escapeHtml.test.ts`, `newLeaveRequest.test.ts`, `recipients.test.ts`, `notifyAdmins.test.ts`,
  `backend/src/scripts/__tests__/sendTestEmail.test.ts`, `shared/src/__tests__/navigation.test.ts` (dopisane),
  `frontend/src/core/routes/__tests__/buildRoutes.test.tsx` (dopisane),
  `e2e/email.spec.ts` (`test.fixme`) → `npm run check`. Testy `LoginPage` od razu prawdziwe w kroku 6, bo test zasad
  nie przepuszcza `it.todo` w zrobionym module Logowanie.

- [x] 1. **Mailpit i ustawienia.** `docker-compose.yml`: usługa `mailpit` (`image: axllent/mailpit`, porty
  `127.0.0.1:1025:1025` i `127.0.0.1:8025:8025`). `.env` i `.env.example`: `EMAIL_TRANSPORT=mailpit`,
  `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_USER=`, `SMTP_PASSWORD=`, `EMAIL_FROM=no-reply@localhost`.
  `backend/src/env.ts`: `SMTP_HOST`, `SMTP_PORT` (liczba, domyślnie 1025), `SMTP_USER`, `SMTP_PASSWORD`,
  `EMAIL_FROM` (domyślnie `no-reply@localhost`). `npm install -w @app/backend nodemailer` i
  `-D @types/nodemailer`. README: wiersz Mailpit i `npm run email:test`. `npm run db` (Mailpit startuje).

- [ ] 2. **`sendEmail`** (`backend/src/email/sendEmail.ts`):
  `interface EmailMessage { to: string; subject: string; html: string; text: string }`,
  `createTransport(): Transporter` (z `env`: `secure: port === 465`, `auth` tylko gdy `SMTP_USER`),
  `sendEmail(message: EmailMessage, transport?: Transporter): Promise<void>`; nadawca
  `{ name: <common.app_name>, address: env.EMAIL_FROM }`. Testy z `jsonTransport: true`:
  - `it('sends to the given address with subject, html and non-empty text')`
  - `it('sets the sender name to the app name and the address from EMAIL_FROM')` → `"Urlopy i zadania"`
  - `it('logs in to SMTP only when SMTP_USER is set')` (sprawdza opcje `createTransport` dla pustego i ustawionego)

- [ ] 3. **Wzór e-maila.** `escapeHtml(value: string): string` (`& < > " '`); `emailLayout({ appName, heading,
  bodyHtml, footer }): string` (rama: pasek `navy[8]`, tło `gray[1]`, kartka biała, `max-width:560px`, kolory
  z `theme.ts`); `newLeaveRequestEmail(data: NewLeaveRequestEmailData): { subject: string; html: string; text: string }`.
  Testy:
  - `escapeHtml`: `it('replaces & < > " and \' with entities')`
  - `it('subject: "Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027"')`
  - `it('html and text contain type, dates, 5 working days, "3 z zaległego, 2 z puli rocznej", "24 dni" and the comment')`
  - `it('without a comment there is no "Komentarz" row')`
  - `it('leftAfter null → no "Z puli" and "Zostanie po zatwierdzeniu" rows')`
  - `it('button and text link to <FRONTEND_URL>/admin/leave-requests/128')`
  - `it('escapes the comment and the names in html, keeps them as typed in text')` (Na co uważać 1)
  - `it('no untranslated {{…}} and no missing keys in subject, html and text')`

- [ ] 4. **Adresaci i wysyłka do administratorów.** `recipients.ts`:
  `listAdminEmails(db = pool): Promise<{ name: string; email: string }[]>` z SQL
  `WHERE role = 'admin' AND archived_at IS NULL AND email IS NOT NULL`. `notifyAdmins.ts`:
  `emailAdminsAboutNewRequest(data, deps = { listAdminEmails, sendEmail }): Promise<number>`; każdy adresat osobno,
  `try/catch` na adresata, `console.error('email failed', { requestId, to }, error)`, nigdy nie rzuca (także gdy
  `listAdminEmails` rzuci → 0 i log). Testy:
  - `it('selects only active admins with an email, with no user input in the SQL')`
  - `it('sends a separate email to each admin')` (dwóch adresatów → 2 wywołania, każde z jednym `to`)
  - `it('a failing recipient does not stop the others and does not throw')` (Na co uważać 2)
  - `it('no admins with an email → nothing sent, returns 0')` (Na co uważać 3)
  - `it('a database error is logged and returns 0')`

- [ ] 5. **`safeNextPath`** w `shared/src/navigation.ts`: `safeNextPath(raw: string | null | undefined): string | null`
  — zwraca `raw`, gdy pasuje do `/^\/admin(\/[^?#]*)?(\?[^#]*)?$/`, nie zawiera `//`, `\`, `..` ani znaków
  sterujących; inaczej `null`. Testy:
  - `it('accepts /admin, /admin/leave-requests/128 and /admin/employees?search=jan')`
  - `it('rejects //obca.pl, https://obca.pl, /admin/../login, /admin\\x, /administrator, /login, empty and null')`

- [ ] 6. **Powrót po zalogowaniu.** `guarded()` w `buildAppRoutes.tsx`: niezalogowany →
  `<Navigate to={'/login?next=' + encodeURIComponent(pathname + search)} replace />` (komponent `RedirectToLogin`
  z `useLocation`); dla samego `/admin` bez `next`. `LoginPage`: `next = safeNextPath(params.get('next'))`; po
  zalogowaniu i dla już zalogowanego: hasło tymczasowe → `PASSWORD_CHANGE_PATH`, inaczej `next ?? ROLE_HOME[role]`.
  Testy:
  - `buildRoutes`: `it('a guest opening /admin/leave-requests/128 lands on /login?next=%2Fadmin%2Fleave-requests%2F128')`
  - `LoginPage`: `it('after logging in goes to a safe next address')`
  - `LoginPage`: `it('ignores an unsafe next and goes to the Dashboard')` (`next=https://obca.pl`)
  - `LoginPage`: `it('a temporary password goes to the password change, not to next')` (Na co uważać 5)
  - `LoginPage`: `it('an already logged-in user opening /login?next=… goes straight to next')`

- [ ] 7. **`npm run email:test`.** `backend/src/scripts/sendTestEmail.ts`:
  `sendTestEmail(to: string, send = sendEmail): Promise<void>` z danymi jak w makiecie (`mockups/src/modules/email/
  data.ts`, przepisane, bez importu z makiety); uruchomienie: adres z argumentu albo `test@localhost`, wynik
  „Wysłano e-mail testowy na <adres>. Zobacz go w http://localhost:8025”. Skrypty: `backend/package.json`
  `"email:test": "tsx src/scripts/sendTestEmail.ts"`, główny `package.json` `"email:test": "npm run email:test -w
  @app/backend --"`. Test: `it('sends the sample new-request email to the given address')`. Sprawdzenie ręczne:
  `npm run email:test` → e-mail widoczny w Mailpit (API `http://localhost:8025/api/v1/messages`).

- [ ] 8. **Dokumenty.** `SPEC-GENERAL.md`: wiersz `/api/email` w Mapie dostępu → „nie powstaje (moduł bez tras API)”.
  `TESTS.md` modułu. `npm run check`.

- [ ] 9. **Test e2e** `e2e/email.spec.ts` ze scenariuszy `TESTS.md`:
  - `test('niezalogowany otwiera adres w panelu, loguje się i wraca na ten adres')` (`/admin/employees`)
  - `test('adres spoza aplikacji w next jest pomijany')` (`/login?next=https://example.com` → Pulpit)
  → `npm run test:e2e`.

- [ ] 10. **Przegląd kodu** całego modułu (jeden recenzent, lista kontrolna z `CONVENTIONS.md`), poprawki z testem,
  `npm run check`.

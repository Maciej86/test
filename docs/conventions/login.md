# Wzorzec: logowanie

Czytasz razem z `code-conventions.md` (zasady ogólne obowiązują zawsze), przy module Logowanie (każda aplikacja z
logowaniem). W projekcie ten plik jest w `docs/conventions/`.

## Zasady

- Migracja `users`: `id`, `name`, `email` (unikalny), `password_hash`, `role`, `created_at`, `updated_at`;
  `archived_at`, `archived_by` gdy archiwum obejmuje użytkowników; `company_id` gdy wiele firm.
- `POST /api/auth/login` (`loginLimiter`, `validateBody`) i `POST /api/auth/logout` to trasy **publiczne** (część 1
  w `app.ts`); `GET /api/auth/me` (zwraca `{ user }` albo 401) za logowaniem.
- **Aktualna rola i konto przy każdym żądaniu:** po migracji `users` zmień `authenticate`
  (`backend/src/middleware/authenticate.ts`), żeby po odczytaniu tokenu pobrał z bazy użytkownika o tym `id`
  (`SELECT id, name, role FROM users WHERE id = ? AND archived_at IS NULL`, bez `archived_at`, gdy archiwum nie
  obejmuje użytkowników). Brak takiego konta → niezalogowany; `req.user` z bazy, nie z tokenu. Dzięki temu odebranie
  roli albo archiwizacja (np. zwolnienie) działa od razu, a nie po wygaśnięciu tokenu. Testy: konto zarchiwizowane →
  401, zmieniona rola → nowa rola. Hasła `bcryptjs` z kosztem `BCRYPT_COST`. Token i ciasteczko przez
  `signToken`, `setAuthCookie`, `clearAuthCookie` z `backend/src/auth/token.ts`.
- `loginLimiter` jest gotowy w `backend/src/middleware/rateLimit.ts`; podpinasz go na `POST /api/auth/login` przed
  `validateBody`. Liczy tylko nieudane próby i rozpoznaje osoby za serwerem Caddy (`trust proxy` w `app.ts`); nie
  zmieniaj tych ustawień. **Plan ma w kroku z trasą logowania test:** 10 nieudanych prób przechodzi, 11. daje 429
  `server.too_many_logins`, a udane logowania nie zużywają limitu. Ten test trzymasz w osobnym pliku (np.
  `auth.rateLimit.test.ts`), bo licznik limitu jest wspólny dla wszystkich testów w jednym pliku.
- Zły e-mail i złe hasło dają ten sam komunikat (`server.login_failed`), żeby nie zdradzać, które konta istnieją.
- **Logowanie loginem** (gdy w `SPEC-GENERAL.md` nie wszyscy mają e-mail): kolumna `login` (unikalna, bez spacji,
  zapisywana małymi literami; może wyglądać jak e-mail, np. `jan.kowalski@firma.pl`, jeśli użytkownik tak chce) i
  osobna `email` `NULL` „e-mail do powiadomień” (unikalny, gdy podany). **Wysyłka zawsze na `email`, nigdy na
  `login`**, także link do zmiany hasła; test to sprawdza. Formularz logowania ma pole „Login”.
  Zmiana hasła bez e-maila: administrator ustawia hasło tymczasowe w module użytkowników, a osoba zmienia je po
  zalogowaniu. E-maile (`email` moduł) wysyłasz tylko osobom z adresem; pozostali widzą powiadomienie w aplikacji.
- Pierwszy administrator: skrypt `backend/src/scripts/createAdmin.ts` (`npm run admin -w @app/backend`), pyta
  w terminalu o imię, e-mail i hasło. **Ty nie możesz odpowiadać na pytania w terminalu**, więc poproś użytkownika:
  „Otwórz terminal (w VS Code: menu Terminal → New Terminal), wejdź do folderu projektu i wpisz
  `npm run admin -w @app/backend`. Hasło wpisujesz tylko tam, nie w rozmowie.”
- Gdy spec przewiduje wymuszoną zmianę hasła (`must_change_password`), ekran „Ustaw nowe hasło” po zalogowaniu
  należy do modułu Logowanie, nie do „Moje konto”.
- Ekran `/login` (`frontend/src/modules/login/`, wpis `login` w `PAGES`); po zalogowaniu `refresh()` z `useAuth`
  i przejście do `ROLE_HOME[user.role]`.

## Lista kontrolna

- [ ] `POST /api/auth/login` ma `loginLimiter` i test na 429
- [ ] `authenticate` czyta konto z bazy przy każdym żądaniu; testy: konto w archiwum → 401, zmieniona rola → nowa rola

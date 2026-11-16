# Spec: Logowanie

**Data:** 2026-11-14 · **Status:** zaakceptowany przez użytkownika 2026-11-14
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-14), `SPEC-GENERAL.md`, wzorzec `docs/conventions/login.md`

## Cel

Każda osoba z kontem loguje się loginem i hasłem, a po zalogowaniu trafia na Pulpit (`/admin`). Nikt bez logowania
nie zobaczy żadnych danych. Kto przez 30 minut nic nie robi, zostaje wylogowany (minutę wcześniej widzi ostrzeżenie).
Osoba z hasłem tymczasowym od administratora musi od razu ustawić własne. Pierwszego administratora zakłada się
poleceniem w terminalu. Moduł tworzy też tabele `users` i `activity_log`, z których korzystają następne moduły.

Moduł działa, gdy: administrator założony w terminalu loguje się i widzi Pulpit; zły login lub hasło daje jeden
komunikat; po 10 nieudanych próbach logowanie blokuje się na 15 minut; po 30 minutach bez czynności aplikacja
wraca do ekranu logowania z komunikatem; konto z hasłem tymczasowym nie dostanie się do żadnego ekranu, dopóki nie
ustawi własnego hasła.

## Ekrany

### Ekran logowania `/login` (każdy, bez logowania)

Układ z makiety (`mockups/src/modules/login/LoginMockup.tsx`, bez paska „Pokaż stan”):
- **Komputer:** dwie kolumny na tle panelu. Po lewej „kartka z kalendarza”: dzień tygodnia, duży numer dnia (krój
  szeryfowy), miesiąc i rok, pod spodem nazwa aplikacji i zdanie „Wnioski urlopowe i tablica zadań zespołu.”, z
  granatowym paskiem po lewej. Po prawej karta z formularzem.
- **Telefon:** jedna kolumna: nazwa aplikacji i pełna data („sobota, 14 listopada 2026”), pod spodem formularz.
- Formularz: „Login” (podpowiedź „Zwykle w formie adresu, np. jan.kowalski@firma.pl”), „Hasło” (z przyciskiem
  pokaż / ukryj), przycisk „Zaloguj się” (ikona `LogIn`, na całą szerokość), pod nim „Nie pamiętasz hasła? Poproś
  administratora, żeby ustawił Ci nowe.” Bez „Zapamiętaj mnie” (pytanie 4).
- Komunikaty nad polami (ramka `Alert`):
  - zły login, złe hasło, konto w archiwum: jeden komunikat „Login lub hasło są nieprawidłowe…” (czerwony);
  - 11. nieudana próba w 15 minut: „Za dużo prób logowania. Spróbuj ponownie za 15 minut.” (żółty);
  - adres `/login?reason=idle`: „Wylogowaliśmy Cię po 30 minutach bez żadnej czynności. Zaloguj się ponownie.”
    (granatowy);
  - adres `/login?reason=expired` (serwer odpowiedział 401 w trakcie pracy): „Sesja wygasła. Zaloguj się ponownie.”
    (granatowy);
  - brak połączenia z serwerem: dymek `notify.error` jak w całej aplikacji.
- Puste pole po kliknięciu „Zaloguj się”: błąd pod polem „To pole jest wymagane.”
- Po udanym logowaniu: osoba z hasłem tymczasowym → `/change-password`, pozostali → `ROLE_HOME[rola]` (`/admin`).
- Zalogowana osoba, która otworzy `/login`, przechodzi od razu na swój ekran startowy.
- Data na ekranie z nowej funkcji `formatDateParts` w `shared/src/date.ts` (dzień tygodnia, dzień, „miesiąc rok”,
  pełny zapis), po polsku, w strefie aplikacji. **[decyzja AI]**

### Ustaw własne hasło `/change-password` (zalogowany z hasłem tymczasowym)

Ten sam układ co logowanie (kartka z kalendarza + karta). Tytuł „Ustaw własne hasło”, zdanie „Administrator nadał Ci
hasło tymczasowe. Ustaw własne, żeby przejść dalej. Tymczasowego nie da się już użyć.”, pola „Nowe hasło”
(podpowiedź „Co najmniej 8 znaków, w tym cyfra i znak specjalny (np. ! # -)”) i „Powtórz nowe hasło”, przycisk
„Zapisz i przejdź dalej” (ikona `Save`). Błędy pod polami. Po zapisie dymek „Hasło zapisane.” i przejście na
`ROLE_HOME`. Pod przyciskiem link „Wyloguj”. Osoba bez hasła tymczasowego, która otworzy ten adres, przechodzi na
swój ekran startowy. Niezalogowana → `/login`.

### Ostrzeżenie przed wylogowaniem (okno w panelu, każdy zalogowany)

Po 29 minutach bez ruchu myszy, klawiatury, dotyku i przewijania pojawia się okno (`Modal`) „Zaraz Cię wylogujemy”:
„Od 29 minut nic się nie dzieje. Za 60 s wylogujemy Cię, żeby nikt nie użył Twojego konta.”, z odliczaniem sekund.
Przyciski: „Wyloguj teraz” (`default`, ikona `LogOut`) i „Zostań zalogowany” (główny, ikona `Check`). Po 60 s bez
reakcji: wylogowanie i przejście na `/login?reason=idle`. Ruch myszy przy otwartym oknie go **nie** zamyka; zamyka
tylko przycisk (żeby nikt nie przedłużył sesji przypadkiem, przechodząc obok). **[decyzja AI]**

Czynność w jednej karcie przeglądarki liczy się dla wszystkich kart tej aplikacji (ostatnia czynność zapisana
w `localStorage`), żeby praca w jednej karcie nie wylogowała z drugiej. **[decyzja AI]**

### Wylogowanie i ochrona ekranów panelu

- „Wyloguj” w menu użytkownika: wylogowanie i przejście na `/login`.
- Niezalogowana osoba na dowolnym adresie `/admin…` → `/login` (dziś szablon pokazuje tam „Nie masz dostępu”).
- Podczas sprawdzania, kto jest zalogowany (`GET /api/auth/me`), zamiast ekranu kręciołek.

### Polecenie „pierwszy administrator” (terminal)

`npm run admin` (w katalogu projektu) pyta kolejno o: imię i nazwisko, login, e-mail do powiadomień (Enter = brak),
hasło (niewidoczne przy wpisywaniu) i powtórzenie hasła. Te same zasady pól co w aplikacji; zły wpis → komunikat
i pytanie jeszcze raz. Zakłada konto z rolą `admin`, bez hasła tymczasowego. Gdy login jest zajęty: komunikat i
koniec bez zmian. Hasła nigdy nie wpisuje się w rozmowie z Claude.

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| Logowanie | Login | tak | 1–190 znaków | spacje na końcach i wielkość liter bez znaczenia | `loginInput` (nowe) |
| Logowanie | Hasło | tak | 1–72 znaki | — | `text`-podobne bez `trim` (nowe `passwordInput`) |
| Ustaw hasło, `npm run admin` | Nowe hasło | tak | 8–72 znaki | co najmniej 1 cyfra i 1 znak, który nie jest literą ani cyfrą (`Urlop-2026`) | `newPassword` (nowe) |
| Ustaw hasło, `npm run admin` | Powtórz nowe hasło | tak | — | takie samo jak „Nowe hasło” | porównanie w schemacie (`refine`) |
| `npm run admin` (i później moduł Pracownicy) | Login | tak | 3–190 znaków | bez spacji, zapisywany małymi literami (`jan.kowalski@firma.pl`) | `login` (nowe) |
| `npm run admin` (i później moduł Pracownicy) | Imię i nazwisko | tak | 1–150 znaków | — | `text(150)` |
| `npm run admin` (i później moduł Pracownicy) | E-mail do powiadomień | nie | do 190 znaków | adres e-mail | `optionalField(email)` |

Na ekranie logowania login ma tylko „wymagany” (bez sprawdzania formatu), żeby zły format nie zdradzał niczego
i dawał ten sam komunikat co złe hasło. Hasło nie jest przycinane ze spacji (spacja może być częścią hasła).
Limit 72 wynika z bcrypt (sposób zapisu haseł) i liczy się w bajtach: polska litera to 2 bajty, więc hasło z samych
polskich liter może mieć mniej znaków. Za długie → „Za dużo znaków.”

## Dane

Migracje (jedna zmiana na plik):

1. `001_users.sql`: `users`
   - `id INT UNSIGNED AUTO_INCREMENT`, `name VARCHAR(150)`, `login VARCHAR(190)` unikalny, `email VARCHAR(190) NULL`
     unikalny (wiele `NULL` dozwolonych), `password_hash VARCHAR(255)`, `role VARCHAR(20)` (`admin` / `employee`),
     `must_change_password TINYINT(1) NOT NULL DEFAULT 0`, `archived_at DATETIME NULL`, `archived_by INT UNSIGNED NULL`,
     `created_at`, `updated_at`.
   - Klucz obcy `archived_by` → `users.id` `ON DELETE SET NULL` (autorstwo archiwizacji, `SPEC-GENERAL.md`).
   - Unikalność loginu i e-maila obejmuje też konta w archiwum (`SPEC-GENERAL.md`, „Archiwum”).
2. `002_activity_log.sql`: kopia `backend/src/db/sql/activity_log.sql` (klucz obcy `user_id` `ON DELETE SET NULL`).
3. `007_users_token_version.sql` (2026-11-16, aktualizacja stepkit 0.1.26): `users.token_version INT NOT NULL DEFAULT 0`.
   Token ma pole `ver`; `authenticate` szuka konta z tą wersją. Każda zmiana hasła (własna z tymczasowego, hasło
   tymczasowe od administratora) podnosi wersję w tym samym zapytaniu, więc inne sesje tej osoby się kończą; osoba,
   która sama zmieniła hasło, dostaje nowe ciasteczko.

Logowania i wylogowania **nie** trafiają do historii zmian (nie ma ich w zakresie w `SPEC-GENERAL.md`). Zmiana
hasła tymczasowego też nie (to nie zmiana danych pracownika z listy zakresu). **[decyzja AI]**

Hasła: `bcryptjs`, koszt `BCRYPT_COST` (12). Nigdy w odpowiedziach API ani w logach.

## API

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `POST /api/auth/login` | każdy | `loginSchema` `{ login, password }` | 200 `{ user }` + ciasteczko | 400 puste pola, 401 `server.login_failed`, 429 `server.too_many_logins` |
| `POST /api/auth/logout` | każdy | — | 204, ciasteczko usunięte | — |
| `GET /api/auth/me` | zalogowany | — | 200 `{ user }` | 401 |
| `POST /api/auth/change-password` | zalogowany z hasłem tymczasowym | `newPasswordSchema` `{ newPassword, repeatPassword }` | 200 `{ user }` | 400, 401, 409 `server.password_not_temporary` |

`user` = `{ id, name, role, mustChangePassword }` (rozszerzony `SessionUser`; zmiana w `shared/src/navigation.ts`,
`backend/src/auth/token.ts` i ich testach).

**Zasady serwera:**
- `POST /auth/login`: `loginLimiter` przed `validateBody`. Szuka konta po `login` (małymi literami) **bez** kont
  w archiwum. Brak konta → i tak porównanie z zapasowym skrótem hasła, żeby czas odpowiedzi nie zdradzał, czy login
  istnieje **[decyzja AI]**. Zły login, złe hasło, konto w archiwum → ten sam 401 `server.login_failed`.
- `authenticate` przy **każdym** żądaniu czyta konto z bazy (`id`, `name`, `role`, `must_change_password`,
  bez kont w archiwum); `req.user` z bazy, nie z tokenu. Archiwizacja i zmiana roli działają od razu.
- **Hasło tymczasowe:** gdy `must_change_password = 1`, każda trasa za logowaniem poza `GET /auth/me`,
  `POST /auth/change-password` i `POST /auth/logout` odpowiada 403 `server.password_change_required` (front sam
  przenosi wtedy na `/change-password`, `client.ts`). Sprawdzane w jednym miejscu w `app.ts`, zaraz za `requireAuth`.
- `POST /auth/change-password` działa **tylko** przy `must_change_password = 1` (inaczej 409): nie pyta o obecne
  hasło, bo osoba właśnie zalogowała się tymczasowym. Nowe hasło nie może być takie samo jak tymczasowe (400, błąd
  pod polem `validation.password_same_as_temporary`). Zapisuje nowy skrót i zeruje `must_change_password`.
  Zwykła zmiana hasła (z obecnym hasłem) należy do modułu „Moje konto”.
- **Wylogowanie po bezczynności po stronie serwera:** token ważny 31 minut (minuta zapasu ponad 30 minut z
  przeglądarki, żeby serwer nie wylogował osoby przed ostrzeżeniem). Serwer odnawia go (nowe ciasteczko) tylko przy
  żądaniu z nagłówkiem `X-User-Activity: 1`, gdy token jest starszy niż 1 minuta. Nagłówek dokleja sam `client.ts`,
  gdy ostatnia czynność osoby (wspólna dla kart, `localStorage`) była nie dawniej niż minutę temu. Żądania „w tle”
  (odświeżanie po powrocie do okna, dzwonek powiadomień) nie mają nagłówka, więc nie przedłużają sesji osobie, która
  odeszła od komputera. Przy czynnościach bez zapytań (np. długie pisanie) front co najwyżej raz na minutę woła
  `GET /auth/me` z tym nagłówkiem; „Zostań zalogowany” też. Ciasteczko bez daty wygaśnięcia (znika po zamknięciu
  przeglądarki, pytanie 4). Wylogowanie w jednej karcie przenosi na `/login` także pozostałe karty. **[decyzja AI]**
- Stałe: `IDLE_LOGOUT_MS = 30 min`, `IDLE_WARNING_MS = 60 s`, `SESSION_KEEPALIVE_MS = 1 min`,
  `USER_ACTIVITY_HEADER` w `shared/src/constants/login.ts` (wspólne dla serwera i frontu); `TOKEN_TTL = '31m'`,
  `TOKEN_RENEW_AFTER_MS = 1 min` w `backend/src/config/constants.ts` (`AUTH_COOKIE_MAX_AGE_MS` znika).

Wartości liczone przez serwer: `role`, `must_change_password`, `password_hash`; nic z tych pól nie przychodzi
z żądania.

**Mapa dostępu** (dopisać w `SPEC-GENERAL.md`): `POST /api/auth/change-password` (zalogowany, tylko z hasłem
tymczasowym), `/change-password` (zalogowany).

## Powiązania

| Z modułem | Co | Funkcja | Pola |
|---|---|---|---|
| employees | zakłada konta, ustawia hasło tymczasowe (`must_change_password = 1`), archiwizuje | wspólne pola `login`, `newPassword` z `fields.ts`; `hashPassword` z `backend/src/auth/password.ts` | — |
| my-account | zmiana własnego hasła z obecnym hasłem | `hashPassword`, `verifyPassword`, pole `newPassword` | — |
| wszystkie | `req.user` z bazy, ochrona tras | `authenticate` | `id`, `name`, `role` |

## Teksty

- `shared/locales/pl/login.json`: ekran logowania, ustawianie hasła, ostrzeżenie o bezczynności, komunikaty
  `idle_logged_out`, `session_expired`, `password_saved`; teksty polecenia `npm run admin`. Klucze tylko dla makiety
  (`mockup_state*`) zostają w pliku, bo używa go makieta.
- `server.json`: `login_failed` (jest), `too_many_logins` (jest), `password_change_required` (jest),
  `password_not_temporary` (nowy).
- `validation.json`: `login_format` („Login nie może zawierać spacji.”), `password_rules` („Hasło musi mieć co
  najmniej 8 znaków, w tym cyfrę i znak specjalny.”), `passwords_differ`,
  `password_same_as_temporary` („Nowe hasło musi być inne niż tymczasowe.”).

## Poza zakresem

- Zakładanie kont, ustawianie haseł tymczasowych, archiwizacja: moduł Pracownicy.
- Zmiana własnego hasła i e-maila: moduł Moje konto.
- Reset hasła e-mailem (zapomniane hasło zmienia administrator; `OVERVIEW.md`).
- „Zapamiętaj mnie” (pytanie 4: nie).
- Wpisy logowań w historii zmian.

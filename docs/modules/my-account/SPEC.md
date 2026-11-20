# Spec: Moje konto

**Data:** 2026-11-20 · **Status:** zaakceptowany 2026-11-20
**Podstawa:** `QUESTIONS.md` (odpowiedzi 1b, 2a, 3a, 4a, 5 ok), `SPEC-GENERAL.md`, makieta
`mockups/src/modules/my-account/MyAccountMockup.tsx`

## Cel

Każda zalogowana osoba (administrator i pracownik) widzi swoje dane, sama zmienia swój e-mail do powiadomień i swoje
hasło, bez proszenia administratora.

## Ekrany

### Moje konto (`/admin/my-account`, administrator i pracownik)

Pozycja „Moje konto” w menu i w menu użytkownika (już jest). Układ jak w makiecie: nagłówek „Moje konto” z linijką
„Twoje dane w aplikacji, e-mail do powiadomień i hasło”; na komputerze po lewej karta „Moje dane”, po prawej jedna pod
drugą karty „E-mail do powiadomień” i „Zmiana hasła”; na telefonie wszystko w jednej kolumnie. Ładowanie i błąd
pobierania: `DataState`.

**Moje dane** (tylko do odczytu): imię i nazwisko (duże, szeryfowe), login, rola (znacznik: administrator `navy`,
pracownik `gray`), „Zatrudniony od” (`DateText`, puste = „brak”), „Umowa” (nazwa typu umowy, także ukrytego; puste =
„brak”). Pod spodem: pracownik „Te dane zmienia administrator. Coś się nie zgadza? Daj mu znać.”, administrator „Te dane
zmienisz w Pracownikach.”

**E-mail do powiadomień** (odpowiedź 1b: obie role). Zdanie nad polem: administrator „Na ten adres przychodzą e-maile
o nowych wnioskach urlopowych.”, pracownik „Na razie aplikacja nie wysyła Ci e-maili; powiadomienia widzisz pod
dzwonkiem.” Pole „Adres e-mail” z podpowiedzią i przycisk „Zapisz e-mail”. Puste pole = brak e-maila (zapis `null`).
Po zapisie dymek „Zapisano e-mail do powiadomień”. Adres zajęty przez inną osobę (także w archiwum): błąd pod polem
„Ten e-mail ma już inne konto.” (`validation.email_taken`) **bez nazwiska tej osoby** (w Pracownikach administrator widzi nazwisko i link
przywracania; tu nie, bo pracownik nie powinien poznawać cudzych kont).

**Zmiana hasła** (odpowiedzi 2a i 3a). Pola: „Obecne hasło”, „Nowe hasło” (podpowiedź z zasadami), „Powtórz nowe
hasło”; przycisk „Zmień hasło”. Pod polami szara ramka: „Po zmianie hasła na innych urządzeniach trzeba będzie
zalogować się ponownie.” Po udanej zmianie: dymek „Hasło zmienione”, pola się czyszczą, osoba zostaje zalogowana na tym
urządzeniu (nowe ciasteczko sesji), inne jej sesje kończą się od razu. Błędy pod polami: złe obecne hasło „Obecne
hasło jest nieprawidłowe.”, nowe takie samo jak obecne „Nowe hasło musi być inne niż obecne.”, powtórzenie inne
„Hasła się różnią. Wpisz to samo hasło dwa razy.”, zasady hasła jak przy pierwszym logowaniu. Za dużo nieudanych prób (10 w 15 minut na
konto; liczy się każda odrzucona, także z błędem w nowym haśle): dymek „Za dużo prób zmiany hasła. Spróbuj ponownie za 15 minut.” (429).

Osoba z hasłem tymczasowym nie dojdzie do tego ekranu: najpierw `/change-password` (jak dziś).

### Pola formularzy

| Formularz | Pole | Wymagane | Min–maks | Format (przykład) | Pole z `fields.ts` |
|---|---|---|---|---|---|
| E-mail do powiadomień | Adres e-mail | nie | do 190 znaków (jak w Pracownikach; w pytaniu 5 było 254) | `jan.kowalski@firma.pl`; inny niż u pozostałych osób (też w archiwum) | `optionalField(email)` |
| Zmiana hasła | Obecne hasło | tak | do 72 bajtów | musi się zgadzać (sprawdza serwer) | `passwordInput` |
| Zmiana hasła | Nowe hasło | tak | 8–72 | cyfra i znak specjalny; inne niż obecne (serwer) | `newPassword` |
| Zmiana hasła | Powtórz nowe hasło | tak | — | takie samo jak nowe | jak w `newPasswordSchema` (`refine`) |

Schematy w `shared/src/schemas/myAccount.ts`: `myAccountEmailSchema`, `myAccountPasswordSchema` (rozszerza pola
`newPasswordSchema` o `currentPassword`), te same na froncie i w serwerze.

## Dane

Bez nowych tabel i migracji: wszystko w `users` (`email`, `password_hash`, `token_version`) i istniejących kolumnach
dla „Moich danych” (`name`, `login`, `role`, `hired_on`, `contract_type_id` → nazwa z `contract_types`).

**Historia zmian** (odpowiedź 4a), obszar `users`, w tej samej transakcji co zmiana (`withTransaction` + `logActivity`):

- e-mail: `action: 'update'`, `changes: { email: { before, after } }`, autor = osoba sama. Opis jak przy innych
  zmianach konta („Zmiana danych pracownika”), wartości „przed → po” jak w Pracownikach.
- hasło: `action: 'update'`, `changes: { password: { before: null, after: 'changed' } }` (bez hasła i skrótu). W
  `describeActivity` nowy opis `user_own_password` „Zmiana własnego hasła”, a w `formatChangeValue` wartość
  „zmieniono hasło” (dzisiejsze `after: 'reset'` od administratora zostaje „Ustawienie hasła tymczasowego”).
- Zapis bez zmiany (ten sam e-mail) nie tworzy wpisu.

## API

Moduł `my-account`, podpięty przez `mountModule(api, 'my-account', …)` dla ról `admin` i `employee`. Każda trasa
działa tylko na koncie `req.user.id`; w żądaniu nie ma numeru konta.

| Metoda i adres | Kto | Dane wejściowe (schemat) | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/my-account` | admin, employee | — | `{ name, login, role, email, hiredOn, contractTypeName }` | 401, 403 (hasło tymczasowe) |
| `PUT /api/my-account/email` | admin, employee | `myAccountEmailSchema` `{ email: string \| null }` | `{ email }` | 400 (zły format), 409 `validation.email_taken` pod polem `email` (aktywne i w archiwum, bez nazwiska; także wyścig przez unikalny indeks) |
| `POST /api/my-account/password` | admin, employee | `myAccountPasswordSchema` `{ currentPassword, newPassword, repeatPassword }` | `{ ok: true }` + nowe ciasteczko sesji | 400 pod polem `currentPassword` (złe), 400 pod polem `newPassword` (takie samo jak obecne), 400 (zasady), 429 (limit prób) |

Wartości liczone przez serwer (nie brane z żądania): kto (`req.user.id`), skrót hasła, nowa wersja sesji
(`token_version + 1`, jak `updatePassword` w `auth/users.queries.ts`), wpisy historii.

Limit prób zmiany hasła: `express-rate-limit` jak `loginLimiter`, klucz = numer konta, 10 prób w 15 minut
(`config/constants.ts`), `skipSuccessfulRequests` jak przy logowaniu.

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| employees | „Moje dane”: nazwa typu umowy i data zatrudnienia z konta; e-mail zmieniony tu widać w liście Pracowników | zapytanie w `my-account.queries.ts` po `req.user.id` | tylko własne konto |
| auth | ta sama wersja sesji i ciasteczko co przy pierwszej zmianie hasła | `updatePassword`, `findPasswordHash`, `signToken`, `setAuthCookie`, `hashPassword`, `verifyPassword` (ponowne użycie, bez kopii) | — |
| activity-log | wpisy „Zmiana własnego hasła” i zmiana e-maila w Historii zmian | `logActivity`, `describeActivity`, `formatChangeValue` | administrator (jak cała Historia zmian) |
| email | administrator dostaje e-maile o wnioskach na adres zapisany tutaj | `notifyAdmins` czyta `users.email` (bez zmian) | — |

## Teksty

`shared/locales/pl/my-account.json` (już z makiety): `title`, `subtitle`, `data`, `login`, `role`, `hired_on`,
`contract_type`, `readonly_hint`, `readonly_hint_admin`, `notify_email`, `email_address`, `notify_intro_admin`,
`notify_intro_employee`, `notify_hint`, `save_email`, `email_saved`, `password`, `current_password`, `new_password`,
`new_password_hint`, `repeat_password`, `change_password`, `password_saved`, `other_devices_hint`; nowe:
`server.current_wrong`, `server.same_as_current`, w `server.json` `too_many_password_tries`. Wspólne komunikaty
(`validation.email_taken`, `validation.passwords_differ`, zasady hasła) z istniejących plików; makieta używa tych
samych kluczy. Klucze `mockup_state*` zostają tylko dla makiety.

## Poza zakresem

- Zmiana imienia, loginu, roli, daty zatrudnienia i umowy przez samą osobę (robi to administrator w Pracownikach).
- E-maile do pracowników (np. o decyzji w sprawie wniosku), sprawdzanie adresu e-mailem z linkiem, reset
  zapomnianego hasła: dziś nie ma ich w specu ogólnym (pomysły do `IDEAS.md`, jeśli będą potrzebne).
- Wpis w Historii zmian przy pierwszej zmianie hasła tymczasowego (`/change-password`).
- Zdjęcie profilowe, lista zalogowanych urządzeń, „wyloguj wszędzie” osobnym przyciskiem.

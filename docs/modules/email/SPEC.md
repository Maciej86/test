# Spec: E-mail

**Data:** 2026-11-16 · **Status:** zaakceptowany przez użytkownika 2026-11-16
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-16: 1a, 2a, 3a, 4a, 5a, 6a), `SPEC-GENERAL.md`,
makieta `mockups/src/modules/email/`

## Cel

Aplikacja umie wysyłać e-maile, a pierwszy i jedyny z nich to „Nowy wniosek urlopowy” do każdego administratora,
który ma e-mail do powiadomień. Moduł buduje wysyłkę, wzór tego e-maila i funkcję „powiadom administratorów”. Wywoła
ją dopiero moduł „Moje urlopy” po zapisaniu wniosku. Do publikacji e-maile łapie skrzynka testowa Mailpit na tym
komputerze, więc nikt ich naprawdę nie dostaje (5a). Prawdziwą wysyłkę przez Mailgun ustawimy w module „Publikacja”.

Przycisk „Otwórz wniosek” prowadzi do wniosku w aplikacji. Dlatego moduł zmienia też logowanie: niezalogowany po
zalogowaniu wraca na adres, który otwierał (6a).

Moduł działa, gdy:
- polecenie `npm run email:test` wysyła przykładowy e-mail i widać go w Mailpit (http://localhost:8025), wyglądający
  jak makieta;
- po wejściu niezalogowanym na adres w panelu i zalogowaniu się aplikacja wraca na ten adres.

## Ekrany

Moduł nie ma własnego ekranu ani pozycji w menu.

### E-mail „Nowy wniosek urlopowy” (dostaje admin)

Wygląd i teksty jak w makiecie (stan „E-mail”):
- **Temat** (2a): „Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027”.
- **Nadawca** (3a): nazwa „Urlopy i zadania” (`common.app_name`), adres z `EMAIL_FROM` w `.env`.
- **Treść** (1a): granatowy pasek z nazwą aplikacji, nagłówek, zdanie „<imię i nazwisko> prosi o urlop. Wniosek czeka
  na Twoją decyzję.”, termin dużym szeryfowym krojem, potem wiersze: Pracownik, Typ urlopu, Dni robocze, Z puli
  („3 z zaległego, 2 z puli rocznej”), Zostanie po zatwierdzeniu („24 dni”), Komentarz. Bez komentarza (puste pole
  we wniosku) wiersza „Komentarz” nie ma.
- Przycisk „Otwórz wniosek” → `<FRONTEND_URL>/admin/leave-requests/<numer wniosku>`, pod nim ten sam adres tekstem.
- Stopka: „Dostajesz tę wiadomość, bo jesteś administratorem…”.
- **Wersja tekstowa** z tą samą treścią (stan „Wersja tekstowa” w makiecie).
- Prosty HTML z kolorami w atrybutach `style` (programy pocztowe nie czytają motywu ani arkuszy stylów), szerokość
  do 560 px, czytelny na telefonie. **[decyzja AI]** Kolory: te same wartości co w motywie (`navy`, `dark`, `gray`),
  wzięte z `shared/src/theme.ts`, a nie wpisane w szablonie.
- Dane od ludzi (imię i nazwisko, typ, komentarz) są w HTML zabezpieczone (`<`, `>`, `&`, `"` zamienione na znaki
  bezpieczne), żeby komentarz nie mógł wstawić do e-maila linku ani obrazka.

**Kto dostaje:** każde konto z rolą `admin`, niezarchiwizowane, z wpisanym `email` (nigdy na `login`). Każdy dostaje
osobny e-mail (nie widzi adresów innych). Nikt nie ma adresu → nic się nie wysyła, bez błędu.

**Gdy wysyłka się nie uda** (4a): wniosek jest już zapisany i zostaje. Pracownik nic nie widzi. Błąd jednego
adresata nie zatrzymuje wysyłki do pozostałych. W dzienniku serwera zostaje wpis „email failed” z numerem wniosku
i adresem (bez treści e-maila). Administrator i tak zobaczy wniosek w aplikacji i w dzwonku (moduł „Powiadomienia”).
Klucz `server.email_failed` z `email-mailgun.md` nie jest potrzebny, bo nikt nie dostaje komunikatu. **[decyzja AI]**

### Logowanie: powrót na otwierany adres (6a)

- Niezalogowany otwiera adres w panelu (np. `/admin/leave-requests/128`) → ekran logowania z adresem
  `/login?next=%2Fadmin%2Fleave-requests%2F128`.
- Po zalogowaniu aplikacja przechodzi pod `next`, jeśli to bezpieczny adres; inaczej, jak dziś, na Pulpit.
- **Bezpieczny adres:** zaczyna się od `/admin/` albo jest równy `/admin` (z opcjonalnym `?…`), nie zawiera `//`,
  `\`, znaków sterujących ani `..`. Wszystko inne (np. `https://obca.pl`, `//obca.pl`, `/login`) jest pomijane.
  Funkcja `safeNextPath` w `shared/` z testami.
- Konto z hasłem tymczasowym: najpierw ustawienie własnego hasła, potem Pulpit (bez powrotu pod `next`).
  **[decyzja AI]** To rzadka sytuacja (pierwsze logowanie), a prowadzenie adresu przez dwa ekrany komplikuje kod.
- Zalogowany pracownik, który otworzy link do wniosku, widzi „brak dostępu” jak dziś (wnioski widzi tylko admin).
- Wylogowanie po bezczynności i wygaśnięcie sesji działają jak dziś (wracają na `/login?reason=…`, bez `next`).

### Pola formularzy

Moduł nie ma formularzy.

## Dane

Bez migracji. Adresatów czyta z `users` (`role = 'admin' AND archived_at IS NULL AND email IS NOT NULL`). Wpisów
w historii zmian nie ma (wysłanie e-maila nie zmienia danych).

## Konfiguracja

- `docker-compose.yml`: usługa `mailpit` (porty 1025 i 8025, tylko z tego komputera: `127.0.0.1:`).
- `.env` i `.env.example`: `EMAIL_TRANSPORT=mailpit`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_USER=`,
  `SMTP_PASSWORD=`, `EMAIL_FROM=no-reply@localhost`; odczyt w `backend/src/env.ts`.
- Biblioteka `nodemailer` (+ `@types/nodemailer`), z listy zatwierdzonej (`SPEC-GENERAL.md`, „Biblioteki”).
- `README.md`: wiersz „http://localhost:8025 | skrzynka testowa (Mailpit)…” i polecenie `npm run email:test`.

## API

Bez tras API. `/api/email` z Mapy dostępu nie powstaje; wiersz w Mapie dostępu zmieniam na „nie powstaje”.

Kod serwera (`backend/src/email/`):

| Plik | Co robi |
|---|---|
| `sendEmail.ts` | `sendEmail({ to, subject, html, text }, transport?)`: jedyne miejsce wysyłki; transport `nodemailer` z `.env` (Mailpit i Mailgun różnią się tylko `.env`), w testach wstrzyknięty `jsonTransport` |
| `templates/newLeaveRequest.ts` | `newLeaveRequestEmail(data)` → `{ subject, html, text }`; teksty z `email.new_request.*`, daty przez `formatDate`, liczby przez `formatNumber` |
| `notifyAdmins.ts` | `emailAdminsAboutNewRequest(data)`: szuka adresatów, wysyła każdemu osobno, łapie i loguje błędy, nigdy nie rzuca; zwraca liczbę wysłanych |
| `scripts/sendTestEmail.ts` | `npm run email:test [adres]`: przykładowy e-mail z danymi z makiety na podany adres albo `test@localhost` |

Dane wejściowe `newLeaveRequestEmail` (przekazuje „Moje urlopy” po zapisie wniosku, poza transakcją):
`requestId`, `employeeName`, `leaveTypeName`, `dateFrom`, `dateTo`, `workingDays`, `daysFromCarried`,
`daysFromAnnual`, `leftAfter` (dni w puli po zatwierdzeniu; `null` dla typu, który nie odejmuje dni: wtedy bez
wierszy „Z puli” i „Zostanie…” **[decyzja AI]**), `comment` (może być `null`). Wszystko liczy serwer.

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| my-leave | po zapisaniu wniosku wywołuje wysyłkę do administratorów | `emailAdminsAboutNewRequest(data)` | admin: wszystko z wniosku (1a) |
| leave-requests | przycisk w e-mailu prowadzi do `/admin/leave-requests/:id`; ten ekran musi istnieć | — | admin |
| deploy | prawdziwa wysyłka przez Mailgun, alarm o kopiach przez `sendEmail` | `sendEmail` | — |
| login | powrót pod `next` po zalogowaniu | `safeNextPath` | — |

## Teksty

`shared/locales/pl/email.json`: `new_request.*` (temat, treść, etykiety, przycisk, stopka) i `preview.*` (tylko
makieta). Wersja tekstowa używa tych samych kluczy.

## Poza zakresem

- Prawdziwa wysyłka (Mailgun), własna domena i e-mail alarmu o kopiach: moduł „Publikacja”.
- Inne e-maile (decyzja o wniosku dla pracownika, przypomnienia, reset hasła): nie ma ich w specu ogólnym; pomysł
  → `docs/IDEAS.md`.
- Wyłączanie e-maili przez administratora: wystarczy usunąć e-mail do powiadomień („Moje konto”).
- Kolejka i ponawianie nieudanych wysyłek.

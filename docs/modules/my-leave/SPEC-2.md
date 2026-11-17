# Spec: Moje urlopy, część 2: Wydruk PDF

**Data:** 2026-11-17 · **Status:** zaakceptowany przez użytkownika 2026-11-17
**Podstawa:** `SPEC.md` (ogólny, „Część 2 w skrócie”), `QUESTIONS.md` (6a: treść jak w podglądzie, dwa podpisy,
nowa karta), makieta `mockups/src/modules/my-leave/MyLeaveModals.tsx` (okno „Wniosek urlopowy: podgląd PDF”)

## Cel

Pracownik przy swoim **zatwierdzonym** wniosku klika „PDF” i w nowej karcie przeglądarki dostaje jasny dokument
„Wniosek o urlop” z miejscami na dwa podpisy. Tam go drukuje albo zapisuje. Ten sam dokument wykorzysta potem
administrator w module 9 „Wnioski urlopowe”.

Część działa, gdy: pracownik z zatwierdzonym wnioskiem 21–31.12.2026 klika „PDF”, otwiera się karta z dokumentem
z jego imieniem i nazwiskiem, typem, terminem, „7 dni roboczych (7 z puli 2026)”, decyzją „Zatwierdził(a) Anna
Nowak, 02.12.2026” i dwoma liniami na podpis; polskie litery są poprawne. Przy wniosku czekającym, odrzuconym,
wycofanym i anulowanym przycisku nie ma, a adres PDF cudzego wniosku daje „nie znaleziono”.

## Ekrany

### „Moje urlopy”: przycisk „PDF”

- W tabeli (komputer) i na kartach (telefon), w miejscu akcji: przy statusie „Zatwierdzony” przycisk „PDF”
  (`subtle`, ikona `print`, jak „Wycofaj”). Przy innych statusach go nie ma (przy „Czeka na decyzję” zostaje
  „Wycofaj”).
- Przycisk jest zwykłym odnośnikiem do `/api/my-leave/requests/<id>/pdf`, otwieranym w nowej karcie
  (`target="_blank"`, `rel="noopener"`). Przeglądarka sama dołącza ciasteczko logowania, więc nie trzeba niczego
  pobierać na ekranie.
- Okno podglądu z makiety (`print_title`, `print_hint`) zostaje tylko w makiecie: w aplikacji przycisk od razu otwiera
  PDF **[decyzja AI]** (podgląd w oknie to drugi raz ta sama treść, a 6a mówi „otwiera PDF w nowej karcie”).

### Dokument PDF

A4 pionowo, marginesy ok. 2 cm, białe tło, tekst prawie czarny, opisy szare (kolory z palety `shared/src/theme.ts`,
jak na „papierze” w makiecie). Czcionka Roboto z `pdfmake` (polskie znaki). Układ jak w makiecie:

| Miejsce | Treść | Klucz tekstu |
|---|---|---|
| góra, lewa | nazwa aplikacji | `common:app_name` |
| góra, prawa | „Data złożenia: 17.11.2026” | `print_place_date` + `formatDate(created_at)` |
| środek | „Wniosek o urlop”, pod spodem „Nr 42” | `print_heading`, `print_number` |
| wiersz | Pracownik: imię i nazwisko (aktualne, z `users.name`) | `print_employee` |
| wiersz | Typ urlopu: nazwa typu | `field_type` |
| wiersz | Termin: „21.12.2026 – 31.12.2026” (jeden dzień: sama data) | `col_dates` |
| wiersz | Dni robocze: „7 dni roboczych (2 z zaległego, 5 z puli 2026)”; typ bez odejmowania: bez nawiasu | `col_days`, `days`, `split_carried`, `split_annual`, `check_and` |
| wiersz (gdy jest) | Komentarz | `field_comment_short` |
| wiersz | Decyzja: „Zatwierdził(a) Anna Nowak, 02.12.2026” | `print_decision`, `print_approved_by` + `formatDate(decided_at)` |
| linia | pozioma kreska | — |
| dół | dwie kropkowane linie z podpisami „podpis pracownika”, „podpis przełożonego” | `print_sign_employee`, `print_sign_manager` |

Daty tylko przez `formatDate` (strefa `Europe/Warsaw`), liczby dni z odmianą z i18n (te same klucze co na ekranie).
Gdy osoba, która zatwierdziła, została usunięta na stałe, nazwisko bierze się z `decided_by_name` (kopia z chwili
decyzji); bez nazwiska wiersz brzmi „Zatwierdzony <data>”.

Nazwa pliku: `wniosek-urlopowy-42.pdf` (klucz `print_file_name`), widoczna przy zapisie i w tytule karty.

## API

| Metoda i adres | Kto | Dane wejściowe | Odpowiedź | Błędy |
|---|---|---|---|---|
| `GET /api/my-leave/requests/:id/pdf` | employee | `idParam` | 200 `application/pdf`, `Content-Disposition: inline; filename="wniosek-urlopowy-42.pdf"`, `Cache-Control: no-store` | 401 bez logowania, 403 administrator, 404 cudzy albo brak (także `1e3`, `0x10`, `007`), 409 `my-leave.server.not_approved` (wniosek nie jest zatwierdzony) |

- Wniosek szukany z `req.user.id` w zapytaniu (`findOwnRequest`), więc cudzy daje 404, a nie 403.
- `inline` zamiast `attachment` z `CONVENTIONS.md` („PDF i wydruk”), bo 6a: PDF ma się otworzyć w karcie, a nie
  pobrać od razu; zapisać można z karty.
- `no-store`: dokument z danymi osobowymi nie zostaje w pamięci przeglądarki ani pośredników.
- Dopisać wiersz do „Mapy dostępu” w `SPEC-GENERAL.md`.

## Kod

- `npm install -w @app/backend pdfmake` (lista zatwierdzona, wpisana w „Bibliotekach” `SPEC-GENERAL.md`; wersja
  z `addFonts` / `setUrlAccessPolicy`, jak w `CONVENTIONS.md`).
- `backend/src/pdf/renderPdf.ts`: dokładnie według `CONVENTIONS.md` (dokument nigdy nie pobiera nic z internetu ani
  plików z serwera), z testem: wynik zaczyna się od `%PDF`.
- `backend/src/pdf/leaveRequestPdf.ts`: `buildLeaveRequestPdf(data)` składa dokument z gotowych danych (bez zapytań
  do bazy) **[decyzja AI]**: leży we wspólnym `backend/src/pdf/`, a nie w folderze modułu, bo moduł 9 użyje go dla
  administratora, a moduły nie importują od siebie. Teksty zostają w `my-leave.json` (klucze `print_*`).
- `my-leave.queries.ts`: dane do PDF jednym zapytaniem z `user_id = ?` (wniosek, typ, `users.name`).
- `my-leave.routes.ts`: nowa trasa; `my-leave.api.ts` na froncie: `myLeavePdfUrl(id)` (adres, bez pobierania).

## Do sprawdzenia w przeglądarce przed modułem 9

Wnioski zatwierdza dopiero moduł 9, więc w tej części nie ma jeszcze przycisku „Zatwierdź”. **[decyzja AI]**
Polecenie dla komputera (jak `npm run email:test`): `npm run my-leave:approve-test` zatwierdza najnowszy wniosek
czekający na decyzję jako pierwszy administrator i wypisuje, który. Na serwerze (produkcja) odmawia działania. Nie
wysyła powiadomień ani e-maili (to zrobi moduł 9). Wpis w `README.md` („Ważne polecenia”). Polecenie przyjmuje też login pracownika (`npm run my-leave:approve-test -- <login>`); tak test w przeglądarce
(`e2e`) zatwierdza wniosek swojej tymczasowej osoby.

## Testy (najważniejsze)

- `renderPdf`: bufor zaczyna się od `%PDF`; dokument z adresem obrazka z internetu nie pobiera go (polityka dostępu).
- `buildLeaveRequestPdf`: w treści są imię i nazwisko, daty `DD.MM.RRRR`, liczba dni z podziałem, komentarz tylko gdy
  jest, decyzja z `decided_by_name`, dwa podpisy; typ bez odejmowania bez nawiasu.
- Trasa: 200 i `%PDF` dla własnego zatwierdzonego; nagłówki `Content-Type`, `Content-Disposition` z nazwą pliku,
  `Cache-Control`; 401, 403 (administrator), 404 (cudzy, brak, `1e3`/`0x10`/`007`), 409 dla `pending`, `rejected`,
  `withdrawn`, `cancelled`.
- Ekran: przycisk „PDF” tylko przy zatwierdzonym, odnośnik z właściwym adresem i `target="_blank"`.
- Skrypt testowy: zatwierdza najnowszy czekający; bez czekających mówi „nie ma”; w produkcji odmawia.
- Próby nadużyć (etap testy): cudzy numer, numer z innym zapisem, wniosek nie zatwierdzony, PDF bez logowania.

## Ryzyko

Nagłówki bezpieczeństwa z `Caddyfile` (`object-src 'none'`, `X-Frame-Options`) dotyczą też odpowiedzi API. Na
komputerze (bez Caddy) nie mają znaczenia; po publikacji moduł „Publikacja” sprawdza, że PDF otwiera się w karcie
(Chrome, Firefox, telefon). Gdyby przeglądarka go blokowała, trasa PDF dostanie własne nagłówki.

## Poza zakresem części 2

- PDF dla administratora i przycisk przy wnioskach wszystkich osób: moduł 9 (użyje `buildLeaveRequestPdf`).
- Wysyłanie PDF e-mailem, logo firmy w dokumencie, nazwa firmy i stanowisko (6a: nic nie brakuje).
- Wydruk wniosków odrzuconych, wycofanych i anulowanych.

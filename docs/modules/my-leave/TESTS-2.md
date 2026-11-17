# Testy: Moje urlopy, część 2 (wydruk PDF)

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180. Wnioski zatwierdza dopiero moduł „Wnioski
urlopowe”, więc do testu zatwierdzasz wniosek poleceniem w terminalu (krok 3).

## Jako pracownik

1. Zaloguj się jako pracownik, otwórz „Moje urlopy” i złóż wniosek „Wypoczynkowy” na kilka dni roboczych w przyszłości,
   z komentarzem „Zażółć gęślą jaźń.” → przy wniosku status „Czeka na decyzję” i przycisk „Wycofaj”, **bez** „PDF”.
2. Przy wnioskach wycofanych (z części 1) nie ma ani „PDF”, ani „Wycofaj”.
3. W VS Code otwórz terminal: menu **Terminal → New Terminal**. Wpisz
   `npm run my-leave:approve-test -- <login tego pracownika>` i naciśnij Enter → komunikat „Zatwierdzony wniosek nr …”.
4. Odśwież stronę „Moje urlopy” → status „Zatwierdzony”, pod nim imię i nazwisko administratora z datą; zamiast
   „Wycofaj” przycisk „PDF”.
5. Kliknij „PDF” → w **nowej karcie** otwiera się jasny dokument: u góry „Urlopy i zadania” i „Data złożenia: …”,
   na środku „Wniosek o urlop” i „Nr …”, potem Pracownik (Twoje imię i nazwisko), Typ urlopu, Termin, Dni robocze
   z podziałem (np. „2 dni robocze (2 z puli 2026)”), Komentarz „Zażółć gęślą jaźń.” z poprawnymi polskimi literami,
   Decyzja „Zatwierdził(a) …, <data>”, a na dole dwie kropkowane linie „podpis pracownika” i „podpis przełożonego”.
6. W tej karcie wydrukuj (Ctrl+P) → podgląd wydruku na jednej stronie A4. Zapisz plik (ikona pobierania) → podpowiada
   nazwę `wniosek-urlopowy-<nr>.pdf`.
7. W pasku adresu karty z PDF zmień numer na inny (np. o 1 większy albo mniejszy) → zamiast PDF komunikat błędu
   (nie zobaczysz cudzego wniosku).
8. Zmniejsz okno do szerokości telefonu → na karcie zatwierdzonego wniosku przycisk „PDF”, który też otwiera dokument.

## Jako administrator

1. Skopiuj adres karty z PDF z kroku 5, wyloguj się, zaloguj jako administrator i wklej adres → komunikat o braku
   dostępu zamiast PDF (administrator dostanie swój przycisk w module „Wnioski urlopowe”).

## Próby nadużyć (2026-11-17)

Testy: blok `abuse` w `my-leave.routes.test.ts`, `leaveRequestPdf.test.ts` i `e2e/my-leave.spec.ts`.

| Próba | Wynik |
|---|---|
| PDF cudzego zatwierdzonego wniosku (drugi pracownik, prawdziwy numer) | odparta: 404 |
| Podrobiony właściciel w adresie (`?userId=1`) | odparta: liczy się tylko zalogowana osoba |
| Numery w innym zapisie (`0x10`, `007`, `1e3`, `-1`, `1.5`, ogromny, `21;DROP`) | odparte: 404 bez sięgania do bazy |
| PDF wniosku czekającego i wycofanego | odparta: 409 |
| PDF jako administrator | odparta: 403 |
| PDF bez logowania | odparta: 401 |
| Dwa pobrania naraz | oba poprawne (odczyt niczego nie zmienia) |
| HTML w komentarzu (`<script>…`) | w PDF zwykły tekst |
| Dokument sięga po obrazek z internetu albo plik serwera (także folder o podobnej nazwie, `..`) | odparta: blokada w `renderPdf` |

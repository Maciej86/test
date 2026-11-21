# Testy: Kalendarz, część 2: Liczenie dni i zatwierdzanie

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180.

## Jako administrator
1. Ustawienia → Typy urlopów → widzisz kolumny „Liczenie dni” i „Zatwierdzanie”; „Chorobowe” ma „dni kalendarzowe”
   i „bez zatwierdzenia”, fioletowy kwadracik.
2. Kliknij „Dodaj typ urlopu”, wpisz „Ojcowski”, wybierz „dni kalendarzowe”, zostaw „Wymaga zatwierdzenia”, limit 14,
   kliknij „Zapisz” → typ jest na liście z „dni kalendarzowe” i „wymaga”.
3. Edytuj „Wypoczynkowy” → widzisz ostrzeżenie, że zmiana liczenia dni i zatwierdzania dotyczy tylko nowych wniosków.
   Kliknij „Anuluj” (nic nie zmieniaj).
4. Po zgłoszeniu chorobowego przez pracownika (niżej): dzwonek pokazuje „Zgłoszona nieobecność: <imię i nazwisko>”,
   w Mailpit (http://localhost:8026) jest e-mail „Zgłoszona nieobecność”, bez „czeka na Twoją decyzję”.
5. Wnioski urlopowe → zakładka „Czekają” nie ma chorobowego; w „Zatwierdzone” jest, a w szczegółach „Zatwierdzony
   automatycznie (typ bez zatwierdzania)”, bez „Zatwierdź” i „Odrzuć”.
6. Kalendarz → chorobowe to jeden ciągły fioletowy pasek, także przez sobotę i niedzielę; w dymku „… dni kalendarzowych”.
   Urlop wypoczynkowy nadal pęka na weekend.

## Jako pracownik
1. Moje urlopy → „Złóż wniosek”, wybierz „Chorobowe” → pod typem podpowiedź, że weekendy się liczą i że wniosek od razu
   jest zatwierdzony; przycisk nazywa się „Zgłoś”.
2. „Od” 2 dni przed dziś, „Do” za 4 dni → wynik „7 dni kalendarzowych”, kliknij „Zgłoś” → dymek „Zgłoszono.
   Administrator dostał powiadomienie.”, w tabeli status „Zatwierdzony”, kolumna „Dni”: „7 dni kalendarzowych”.
3. W „Od” spróbuj wybrać 8 dni przed dziś → nie da się (dzień wyszarzony).
4. Przy tym chorobowym kliknij „Wycofaj” i potwierdź → status „Wycofany”, administrator dostaje „Wniosek wycofany”.
5. Wybierz „Wypoczynkowy” → „Od” nadal tylko od dziś, wynik w dniach roboczych, przycisk „Złóż wniosek”.

## Próby nadużyć
Sprawdzone 2026-11-21 na prawdziwej bazie (`e2e/calendar.spec.ts`, test „abuse”) i w testach tras
(`my-leave.routes.test.ts`, `leave-types.routes.test.ts`, `leave-requests.service.test.ts`):
- Pracownik dopisuje do wniosku `status: approved`, `autoApproved`, `dayCount: calendar`, `requiresApproval: false` →
  serwer bierze zasady z typu w bazie (zwykły wniosek czekający w dniach roboczych): przeszła
- Wypoczynkowy od wczoraj → 400; chorobowe 9 dni wstecz → 400: przeszła
- Dwa zgłoszenia chorobowego naraz na ten sam termin → jedno zapisane, drugie „termin zajęty”: przeszła
- Cudze chorobowe: wycofanie i PDF przez innego pracownika → 404: przeszła
- Administrator zatwierdza albo odrzuca wniosek zatwierdzony automatycznie → 409: przeszła
- Dwa wycofania naraz → jedno, drugie 409; ponowne wycofanie → 409: przeszła
- Pracownik wycofuje urlop zatwierdzony przez administratora → 409 (anuluje tylko administrator): przeszła
- Liczenie dni `hours`, zatwierdzanie jako tekst, brak pól w typie urlopu → 400 przy polu: przeszła

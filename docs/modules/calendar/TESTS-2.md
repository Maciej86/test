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
(uzupełniane na etapie testy według `abuse.md`)

# Testy: Kalendarz, część 1

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180 (port aplikacji na tym komputerze).

## Jako administrator

1. Zaloguj się jako administrator → w menu jest „Kalendarz” (pod „Wnioski urlopowe”).
2. Kliknij „Kalendarz” → widzisz dzisiejszy dzień i 60 kolejnych, wszystkich aktywnych pracowników po nazwisku,
   pod tytułem liczbę nieobecności i czekających wniosków, a nad siatką zdanie „Dziś nie ma: …” albo „Dziś wszyscy są
   w pracy”.
3. Urlop w dniach roboczych przez weekend → dwa kawałki paska z cienką linią w weekend; opis na środku paska;
   najechanie pokazuje imię, typ i status.
4. Wniosek czekający → jasny pasek z przerywaną ramką i dopiskiem „(czeka)”.
5. Najedź na numer dnia święta (np. 24.12) → dymek z nazwą święta; weekend i święto są ciemniejsze.
6. Kliknij strzałkę „30 dni później” → zakres przesuwa się o 30 dni, adres ma `?from=`; „Dziś” wraca.
7. Wyłącz filtr „Wypoczynkowy, Na żądanie” → zielone paski znikają; włącz → wracają.
8. Wpisz w „Szukaj osoby” część nazwiska → zostają pasujące osoby; wpisz coś, czego nie ma → „Nikt o takim imieniu
   lub nazwisku nie pracuje w firmie.”
9. Kliknij czekający pasek → z prawej szczegóły wniosku (te same co we Wnioskach urlopowych) z „Zatwierdź” i „Odrzuć”;
   zatwierdź → dymek, pasek staje się pełny.
10. Ustawienia → Typy urlopów → Edytuj „Bezpłatny” → wybierz fioletowy kolor, zapisz → przy nazwie fioletowy
    kwadracik, w kalendarzu paski tego typu są fioletowe.
11. Pulpit → boks „Nieobecności na 2 tygodnie” → „Otwórz kalendarz” otwiera kalendarz.
12. Wnioski urlopowe → szczegóły czekającego wniosku → „Pokaż w kalendarzu” → kalendarz od pierwszego dnia wniosku.
13. Na telefonie (wąskie okno) → siatka przewija się w bok, nazwiska zostają po lewej.

## Jako pracownik

1. Zaloguj się jako pracownik → w menu nie ma „Kalendarza”; adres `/admin/calendar` pokazuje „Brak dostępu”.

## Próby nadużyć

(uzupełniane na etapie testy według `abuse.md`)

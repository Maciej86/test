# Testy: Typy urlopów

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180.

## Jako administrator

1. Zaloguj się jako administrator i kliknij w menu „Typy urlopów” → widzisz 5 typów: Wypoczynkowy, Na żądanie,
   Okolicznościowy, Bezpłatny, Opieka nad dzieckiem. Nad tabelą: „W formularzu wniosku: 5. Ukryte: 0.”
2. „Na żądanie” ma „odejmuje” i „4 dni na osobę”, „Bezpłatny” ma „nie odejmuje” i „bez limitu”.
3. Przy „Wypoczynkowy” strzałka „w górę” jest szara, przy „Opieka nad dzieckiem” strzałka „w dół” jest szara.
4. Kliknij strzałkę „w górę” przy „Na żądanie” → zamienia się miejscem z „Wypoczynkowy”. Kliknij „w dół”, żeby wrócić.
5. Kliknij „Dodaj typ urlopu”, wpisz „Szkoleniowy”, limit 5, kliknij „Zapisz” → dymek „Dodano typ urlopu”, typ jest
   na końcu listy z „5 dni na osobę”.
6. Znowu „Dodaj typ urlopu”, wpisz „szkoleniowy” (małą literą), kliknij „Zapisz” → pod polem „Typ o tej nazwie już jest.”
7. W tym samym oknie wpisz limit 0, kliknij „Zapisz” → pod polem limitu „Wartość jest za mała.”; 366 → „Wartość jest
   za duża.”; wyczyść pole → zapis przechodzi tylko z inną nazwą. Zamknij okno.
8. Przy „Szkoleniowy” kliknij „Edytuj”, wyczyść limit, wyłącz „Odejmuje dni z puli”, „Zapisz” → dymek „Zapisano
   zmiany”, w tabeli „bez limitu” i „nie odejmuje”.
9. Przy „Szkoleniowy” kliknij „Ukryj” → okno „Ukryć typ „Szkoleniowy”?”, kliknij „Ukryj” → dymek „Typ ukryty”, typ
   znika, nad tabelą „Ukryte: 1”, obok pojawia się przełącznik „Pokaż ukryte (1)”.
10. Włącz „Pokaż ukryte (1)” → „Szkoleniowy” na dole, przygaszony, ze znacznikiem „ukryty”, bez strzałek.
11. Kliknij „Dodaj typ urlopu”, wpisz „Szkoleniowy”, „Zapisz” → pod polem „Typ „Szkoleniowy” już jest, ukryty.
    Przywróć go”. Kliknij „Przywróć go” → okno się zamyka, dymek „Typ jest znowu w formularzu wniosku”, typ na końcu
    widocznych.
12. Ukryj po kolei wszystkie typy oprócz jednego → przy ostatnim przycisk „Ukryj” jest szary, a po najechaniu myszką
    widać „To ostatni typ w formularzu wniosku. Najpierw dodaj albo przywróć inny.” Potem przywróć ukryte typy.
13. Zmniejsz okno przeglądarki do szerokości telefonu → zamiast tabeli są karty z tymi samymi danymi i przyciskami.

## Jako pracownik

1. Zaloguj się jako pracownik → w menu nie ma „Typy urlopów”.
2. Wpisz w pasku adresu http://localhost:5180/admin/leave-types → napis „Nie masz dostępu do tej części aplikacji.”

## Próby nadużyć

- Pracownik wywołuje każdy adres API typów urlopów (lista, dodaj, zmień, przesuń, ukryj, przywróć) → 403, nic się nie zmienia: przeszła
- Pracownik wpisuje adres ekranu `/admin/leave-types` → „Nie masz dostępu”, bez danych: przeszła
- Podrobione pola w żądaniu (numer, pozycja, „ukryty”, liczba wniosków) → serwer je pomija, pozycję liczy sam: przeszła
- Złe dane (nazwa 41 znaków, limit −5, 99999999, „abc”, „Odejmuje” jako tekst) → 400 z błędem pola: przeszła
- Numer w adresie zapisany inaczej niż samymi cyframi (`1e3`, `0x10`, `007`) → 404: naprawiona (wcześniej `1e3` znaczyło typ 1000)
- Sześć „Ukryj” wysłanych naraz na prawdziwej bazie → pięć ukrytych, jeden typ zostaje widoczny: przeszła
- Dwa dodania naraz tej samej nazwy różniącej się wielkością liter → jedno dodane, drugie „Typ o tej nazwie już jest.”: przeszła
- Nazwa z kodem strony (`<b>…</b>`, `<script>`) → widać ją jako zwykły tekst: przeszła
- Podwójne kliknięcie „Przywróć” → jedno żądanie: naprawiona przy przeglądzie kodu
- Cudze dane, przejścia statusów, usuwanie: nie dotyczy (jeden wspólny słownik administratora, typów się nie usuwa)

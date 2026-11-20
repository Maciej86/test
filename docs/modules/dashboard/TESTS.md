# Testy: Pulpit

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180.

## Jako pracownik i administrator po kolei

1. Zaloguj się jako pracownik z pulą dni → na Pulpicie karta „Urlop w <rok>” z liczbą dni do wykorzystania, „Moje
   wnioski”: „Żaden wniosek nie czeka na decyzję.”, „Moje zadania”.
2. Kliknij „Złóż wniosek” → otwiera się ekran Moje urlopy. Złóż wniosek na najbliższe dni robocze.
3. Wróć na Pulpit → liczba dni zmalała, a wniosek jest w „Czeka na decyzję” z żółtym znacznikiem.
4. Wyloguj się, zaloguj jako administrator → w „Wnioskach do rozpatrzenia” jest ten wniosek: imię, typ, daty, liczba
   dni i „zaczyna się …” na żółto. Na pasku „Nieobecności w najbliższych 2 tygodniach” ta osoba ma żółte dni.
5. Kliknij wniosek → otwierają się jego szczegóły. Zatwierdź go i wróć na Pulpit → wniosku nie ma w boksie, a dni na
   pasku są zielone.
6. Zaloguj się jako pracownik → ten urlop jest w „Najbliższy zatwierdzony urlop”.

## Jako administrator

1. „Stan tablic”: każdy projekt z liczbą zadań w kolumnach; zadanie z terminem wczoraj liczy się w „Po terminie”
   (czerwone) i jest na liście „Zadania po terminie” z kółkami przypisanych osób.
2. Kliknij nazwę projektu → otwiera się jego tablica.
3. Przypisz siebie do zadania z terminem dziś → w „Moich zadaniach” jest z napisem „dziś” na żółto. Kliknij je →
   otwiera się tablica projektu z podglądem tego zadania z prawej.

## Jako pracownik

1. Pracownik nie widzi boksów „Wnioski do rozpatrzenia”, „Nieobecności” ani „Stan tablic”.
2. „Moje zadania” pokazuje tylko zadania przypisane do niego z jego projektów: najpierw po terminie, bez terminu na
   końcu.
3. Na telefonie (wąskie okno) boksy są jeden pod drugim.

## Próby nadużyć

(uzupełniane na etapie testy według `abuse.md`)

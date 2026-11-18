# Testy: Zadania, część 1: Projekty i tablice

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180. Potrzebne konta: administrator i dwóch
pracowników (np. Jan Kowalski i Piotr Zieliński). Najwygodniej w dwóch oknach przeglądarki (drugie w trybie
prywatnym), żeby widzieć obie osoby naraz.

## Jako administrator

1. W menu rozwiń **Zadania** → widzisz tylko „Projekty”. Kliknij je → „Nie ma jeszcze projektów” i przycisk
   „Dodaj projekt”.
2. „Dodaj projekt”, zostaw pustą nazwę, kliknij „Dodaj projekt” → pod polem błąd. Wpisz „Marketing”, wybierz Jana
   i Piotra, zapisz → dymek „Dodano projekt…”, w menu pod „Zadaniami” pojawia się „Marketing”.
3. Dodaj drugi projekt o nazwie „marketing” → pod polem „Projekt o tej nazwie już jest.”
4. Dodaj „Produkcja” (bez członków). Strzałkami przestaw „Produkcja” nad „Marketing” → ta sama kolejność w menu.
5. Otwórz tablicę „Marketing” → „Tablica jest pusta”. „Dodaj zadanie” → okno na środku ekranu. Wpisz tytuł „Ab” →
   błąd „co najmniej 3 znaki”. Wpisz „Zamówić ulotki”, termin wczoraj → błąd terminu; termin za tydzień, przypisz
   Jana → „Dodaj zadanie” → karta na górze „W opracowaniu”, dymek.
6. Kliknij kartę → z prawej szerszy podgląd z polami i „Dodane przez: …”. Zmień kolumnę na „W toku”, zapisz → karta
   w „W toku”.
7. Przeciągnij kartę myszką do „Zrealizowane” → pod tytułem „Zrealizowane <dzisiejsza data>”. Przeciągnij z powrotem.
8. „⋮ → Usuń” → okno „Usunąć zadanie?” → „Usuń” → karta znika, dymek „Zadanie przeniesione do archiwum.”
9. Na liście projektów „Edytuj” przy „Marketing”, usuń Jana z członków, gdy ma otwarte zadanie → żółta ramka
   z liczbą jego zadań; zapisz → w zadaniu Jana już nie ma.
10. „Usuń” przy „Produkcja” → przycisk „Usuń na stałe” jest wyłączony; wpisz „Produkcja” → włącza się; usuń →
    projekt znika z menu i listy.

## Jako pracownik

1. Zaloguj się jako Piotr (członek „Marketingu”) → w menu „Zadania” → tylko „Marketing”, bez „Projektów”.
2. Administrator przypisuje Piotra do nowego zadania → w ciągu minuty dzwonek pokazuje „Nowe zadanie dla Ciebie”;
   kliknięcie otwiera tablicę z podglądem tego zadania.
3. Przeciągnij kartę do „W toku”. W oknie administratora z otwartą tablicą karta przesuwa się sama w ciągu kilku
   sekund.
4. Włącz „Tylko moje zadania” → zostają tylko karty z Piotrem (niebieski pasek po lewej). Odśwież stronę →
   przełącznik dalej włączony.
5. Wpisz w adres numer projektu, do którego Piotr nie należy (np. `/admin/tasks/999`) → „Nie masz dostępu do tego
   projektu albo projekt został usunięty.”
6. Jan bez żadnego projektu → w menu nie ma „Zadań”.

## Na telefonie (okno 390 px)

1. Tablica pokazuje przełącznik „W opracowaniu / W toku / Zrealizowane” z liczbami i jedną kolumnę („W toku”).
2. Przeciągnij kartę palcem w obrębie kolumny → zmienia miejsce. „⋮ → Przenieś do → Zrealizowane” → karta w
   „Zrealizowanych”.
3. Kliknij kartę → podgląd na cały ekran, da się zapisać.

## Próby nadużyć

(uzupełniane na etapie testy według `abuse.md`)

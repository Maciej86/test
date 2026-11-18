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
   błąd „co najmniej 3 znaki”. Wpisz „Zamówić ulotki”; w kalendarzu terminu nie da się wybrać wczorajszego dnia; termin za tydzień, przypisz
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

Sprawdzone 2026-11-18 na prawdziwej bazie (`e2e/tasks.spec.ts`, blok `abuse`) i w testach tras (`describe('abuse')`):

- Pracownik spoza projektu: nie widzi go na liście projektów; tablica, dodanie zadania, zmiana, przeniesienie
  i usunięcie cudzego zadania → 404, zadanie bez zmian: przeszła (odparta)
- Pracownik wpisuje adres listy projektów i woła trasy administratora (dodanie, kandydaci, usunięcie) → brak dostępu,
  403: przeszła
- Podrobione pola przy dodaniu (autor, pozycja, data realizacji, inny projekt) → wartości z sesji i z serwera:
  przeszła
- Karta „przed” kartą z innego projektu → 400; przypisanie osoby spoza projektu → 400 przy polu; termin
  w przeszłości → 400; zmiany zadania w archiwum → 404: przeszła
- Sześć przeciągnięć naraz w tych samych kolumnach (dwie osoby) → bez błędu serwera, pozycje 1..n bez powtórzeń;
  dwa dodania naraz do pustej kolumny → oba zapisane: naprawiona (przegląd kodu: zakleszczenie blokad, teraz
  najpierw blokada projektu)
- Zmyślone numery w adresie (`0`, `1e3`, `0x10`, `007`, `21;DROP`) → 404 bez wywołania usługi: przeszła
- `<script>alert(1)</script>` w tytule → na tablicy zwykły tekst, bez okienka; tytuł 151 znaków → 400: przeszła
- Usunięcie osoby z projektu → jej otwarte zadanie zostaje bez niej, a ona traci dostęp do tablicy (404): przeszła

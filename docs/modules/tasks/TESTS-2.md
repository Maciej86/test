# Testy: Zadania, część 2: Komentarze

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180. Potrzebne konta: administrator i dwóch
pracowników z projektu (np. Jan Kowalski i Piotr Zieliński). Najwygodniej w dwóch oknach przeglądarki (drugie
w trybie prywatnym).

## Jako pracownik (Jan)

1. Otwórz tablicę projektu, w którym jest zadanie przypisane Piotrowi (nie Tobie). Kliknij kartę → pod polami zadania
   „Komentarze 0” i „Nikt jeszcze nie skomentował tego zadania.”; przycisk „Dodaj komentarz” jest wyłączony.
2. Wpisz komentarz w dwóch liniach, kliknij „Dodaj komentarz” → komentarz pojawia się na dole listy z Twoim imieniem
   i „dzisiaj, GG:MM”, pole jest puste, dymek „Dodano komentarz.” Zamknij podgląd → na karcie ikonka dymku i „1”.
3. Przy swoim komentarzu kliknij „Edytuj”, zmień tekst, „Zapisz” → dymek „Zapisano komentarz.” i dopisek
   „(edytowany)”.
4. Zacznij pisać nowy komentarz i odczekaj 10 sekund → tekst w polu zostaje.
5. Kliknij „Usuń” przy swoim komentarzu → okno „Usunąć komentarz?” → „Usuń” → komentarz znika, dymek.

## Jako drugi pracownik (Piotr, przypisany do zadania)

1. Po komentarzu Jana w dzwonku jest „Nowy komentarz do zadania” z tytułem zadania i początkiem komentarza, nadawca
   Jan. Kliknij → otwiera się tablica z podglądem zadania, komentarz widać pod polami.
2. Przy komentarzu Jana nie ma przycisków „Edytuj” ani „Usuń”.
3. Dodaj własny komentarz → Ty nie dostajesz powiadomienia o własnym komentarzu.

## Jako administrator

1. Otwórz to samo zadanie → przy komentarzu Jana jest „Usuń”, ale nie ma „Edytuj”. Usuń go → znika też u Jana
   (w ciągu kilku sekund).
2. „⋮ → Usuń” przy zadaniu z komentarzami → okno mówi „razem z N komentarzami”.

## Próby nadużyć

Testy automatyczne w `e2e/tasks.spec.ts`, blok `abuse` (prawdziwa baza), 2026-11-19:
- Pracownik spoza projektu czyta, dodaje, poprawia i usuwa komentarze przez adres → 404, komentarz bez zmian: przeszła
- Pracownik z projektu poprawia albo usuwa cudzy komentarz → 403; administrator poprawia cudzy → 403: przeszła
- Podrobione pola (autor, „Prezes”, daty, „edytowany”) → autor i daty z serwera: przeszła
- Zadanie w archiwum: odczyt, dodanie, poprawka, usunięcie komentarza → 404 (także autor i administrator): przeszła
- Usunięcie projektu usuwa zadania razem z komentarzami: przeszła
- Poprawka, dwa usunięcia i archiwizacja zadania naraz → bez błędu serwera, najwyżej jedno usunięcie: przeszła
- Pięć komentarzy naraz od dwóch osób → wszystkie zapisane: przeszła
- `<script>alert(1)</script>` w komentarzu → widać jako tekst, bez okienka; 2001 znaków → 400 przy polu: przeszła
- Komentarz do zadania usuniętego w międzyczasie → wcześniej niejasny dymek; naprawiona (przegląd kodu): „Nie znaleziono
  zadania.” i odświeżona tablica

# Testy: Powiadomienia

Przed testem: `npm run db`, `npm run dev`, w terminalu `npm run notifications:test` (dopisuje przykładowe
powiadomienia), potem otwórz http://localhost:5180.

## Jako administrator

1. Zaloguj się jako administrator → na dzwonku w górnej belce czerwona liczba nieprzeczytanych.
2. Kliknij dzwonek → okienko z powiadomieniami „Nowy wniosek: …” i „Wniosek wycofany: …”; nowe mają jaśniejsze tło
   i kropkę.
3. Kliknij jedno nowe powiadomienie → przechodzisz na „Wnioski urlopowe”, a liczba na dzwonku zmniejsza się o 1.
4. Otwórz dzwonek i kliknij „Pokaż wszystkie” → strona „Powiadomienia” z grupami „Dzisiaj”, „Wczoraj” albo datą;
   w menu po lewej nic nie jest podświetlone.
5. Kliknij „Nieprzeczytane” → zostają tylko nowe; adres ma `?unread=1`.
6. Kliknij „Oznacz wszystkie jako przeczytane” → liczba na dzwonku znika, w „Nieprzeczytane” napis „Wszystko
   przeczytane.”
7. Na telefonie (albo w wąskim oknie) kliknij dzwonek dwa razy z rzędu (otwórz, zamknij krzyżykiem, otwórz) → panel
   na cały ekran za każdym razem, bez mrugania.

## Jako pracownik

1. Zaloguj się jako pracownik → na dzwonku liczba nowych powiadomień.
2. Kliknij dzwonek → „Urlop zatwierdzony”, „Urlop odrzucony” z powodem, „Urlop anulowany”, „Nowe zadanie dla Ciebie”;
   nie ma powiadomień administratora.
3. Kliknij „Nowe zadanie dla Ciebie” → przechodzisz na „Zadania”.

## Odświeżanie

1. Zostaw aplikację otwartą jako administrator, w terminalu wpisz jeszcze raz `npm run notifications:test` → do minuty
   liczba na dzwonku rośnie (albo od razu po przełączeniu na inną kartę i z powrotem).

## Próby nadużyć

(uzupełniane na etapie testy według `abuse.md`)

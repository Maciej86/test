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

Sprawdzone 2026-11-16 (`describe('abuse')` w `notifications.routes.test.ts`, testy schematu i dzwonka):

- Oznaczenie cudzego powiadomienia (inna osoba, także administrator) → 404 jak nieistniejące; na prawdziwej bazie
  wiersz bez zmian: przeszła
- Podrobione numery w adresie (`0`, `-1`, `1.5`, `abc`, `0x10`, `007`, ogromny) → 404 bez zapytania do bazy: przeszła
- Podrobiony właściciel (`userId`, `user_id`) w adresie i w treści, podrobione `readAt` → zawsze konto z sesji: przeszła
- Dwa kliknięcia naraz („przeczytane”, „oznacz wszystkie”) → obie odpowiedzi poprawne, pierwsza data odczytu
  zostaje: przeszła
- Usunięcie osoby → jej powiadomienia znikają (klucz obcy `ON DELETE CASCADE`), imię autora w cudzych zostaje: przeszła
- Ogromny i ujemny numer strony → strona 1, bez błędu bazy: przeszła
- HTML i `<script>` w tytule zadania → na ekranie zwykły tekst, nic się nie wykonuje: przeszła
- Adres powiadomienia poza panelem (`https://…`, `//…`, `javascript:`) → serwer nie zapisze, ekran nie przejdzie:
  przeszła (testy z kroku 2 i 5)
- Pracownik nie widzi powiadomień administratora (e2e): przeszła

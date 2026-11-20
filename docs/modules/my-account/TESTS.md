# Testy: Moje konto

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180.

## Jako administrator

1. Zaloguj się jako administrator, w menu po lewej kliknij „Moje konto” → nagłówek „Moje konto”, karta „Moje dane”
   z Twoim imieniem i nazwiskiem, loginem, znacznikiem „Administrator”, datą zatrudnienia i umową; pod spodem „Te dane
   zmienisz w Pracownikach.”
2. Ten sam ekran otwiera też menu użytkownika w prawym górnym rogu → „Moje konto”.
3. W karcie „E-mail do powiadomień” jest zdanie „Na ten adres przychodzą e-maile o nowych wnioskach urlopowych.”
   Wpisz inny adres, kliknij „Zapisz e-mail” → dymek „Zapisano e-mail do powiadomień”. W „Pracownicy” w kolumnie
   „E-mail do powiadomień” jest nowy adres.
4. Wpisz adres, który ma inny pracownik, „Zapisz e-mail” → pod polem „Ten e-mail ma już inne konto.” (bez nazwiska).
5. Wpisz „jan@”, „Zapisz e-mail” → pod polem napis o złym adresie. Przywróć swój adres i zapisz.
6. Otwórz „Historia zmian” → na górze wpis o zmianie Twojego konta: e-mail „przed → po”.

## Jako pracownik

1. Zaloguj się jako pracownik, kliknij „Moje konto” → Twoje dane, znacznik „Pracownik”, pod spodem „Te dane zmienia
   administrator. Coś się nie zgadza? Daj mu znać.”; nad polem e-mail: „Na razie aplikacja nie wysyła Ci e-maili;
   powiadomienia widzisz pod dzwonkiem.”
2. W „Zmiana hasła” wpisz złe obecne hasło i poprawne nowe dwa razy, „Zmień hasło” → pod polem „Obecne hasło jest
   nieprawidłowe.”
3. Wpisz dobre obecne hasło, jako nowe to samo co obecne → pod polem „Nowe hasło musi być inne niż obecne.”
4. Nowe hasło „krotkie” → pod polem zasady hasła. Nowe dobre, powtórzenie inne → „Hasła się różnią. Wpisz to samo
   hasło dwa razy.”
5. Wszystko dobrze → dymek „Hasło zmienione”, pola puste, dalej jesteś zalogowany.
6. Wyloguj się, zaloguj starym hasłem → „Login lub hasło są nieprawidłowe. Sprawdź je i spróbuj ponownie.”; nowym → wchodzisz.
7. (Dwa urządzenia) Zaloguj się na to samo konto w drugiej przeglądarce, w pierwszej zmień hasło → w drugiej przy
   następnym kliknięciu wracasz do ekranu logowania.
8. Jako administrator otwórz „Historia zmian” → wpis „Zmiana własnego hasła” z nazwiskiem pracownika, bez hasła.

## Próby nadużyć
(uzupełniane na etapie testy)

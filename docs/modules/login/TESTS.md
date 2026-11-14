# Testy: Logowanie

Przed testem: włącz Docker Desktop, potem w terminalu `npm run db`, `npm run migrate`, `npm run dev`.
Jeśli nie masz jeszcze konta administratora: `npm run admin` (hasło wpisujesz tylko w terminalu).
Otwórz http://localhost:5173.

## Jako administrator

1. Otwórz http://localhost:5173 → przenosi Cię na ekran logowania: po lewej dzisiejsza data jak kartka z kalendarza,
   po prawej formularz.
2. Kliknij „Zaloguj się” bez wpisywania czegokolwiek → pod oboma polami „To pole jest wymagane.”
3. Wpisz swój login i złe hasło → czerwona ramka „Login lub hasło są nieprawidłowe…”.
4. Wpisz login wielkimi literami (np. `ANNA.NOWAK@FIRMA.PL`) i dobre hasło → widzisz Pulpit.
5. Otwórz menu z inicjałami w prawym górnym rogu, kliknij „Wyloguj” → ekran logowania.
6. Wpisz w pasku adresu http://localhost:5173/admin → zostajesz na ekranie logowania.
7. Zaloguj się, zamknij całą przeglądarkę, otwórz ją znowu i wejdź na http://localhost:5173/admin → ekran logowania.
8. Zaloguj się i nic nie rób przez 29 minut → okno „Zaraz Cię wylogujemy” z odliczaniem. Kliknij „Zostań zalogowany”
   → okno znika, możesz pracować dalej.
9. Znowu nic nie rób przez 30 minut (przy oknie ostrzeżenia też nic nie klikaj) → ekran logowania z granatową
   ramką „Wylogowaliśmy Cię po 30 minutach…”.
10. Otwórz aplikację w dwóch kartach, w jednej kliknij „Wyloguj” → druga karta też przechodzi na ekran logowania.

## Jako pracownik z hasłem tymczasowym

Konta pracowników zakłada moduł Pracownicy; do tego czasu sprawdza to test automatyczny (`npm run test:e2e`,
konto `e2e.employee@test.local`).

1. Zaloguj się hasłem tymczasowym → ekran „Ustaw własne hasło”.
2. Wpisz w pasku adresu http://localhost:5173/admin/tasks → wracasz na „Ustaw własne hasło”.
3. Wpisz jako nowe to samo hasło tymczasowe → pod polem „Nowe hasło musi być inne niż tymczasowe.”
4. Wpisz `haslo123` → „Hasło musi mieć co najmniej 8 znaków, w tym cyfrę i znak specjalny.”
5. Wpisz dwa różne hasła → pod „Powtórz nowe hasło”: „Hasła się różnią…”.
6. Wpisz poprawne nowe hasło dwa razy → dymek „Hasło zapisane.” i Pulpit.

## Na telefonie

1. W przeglądarce zmniejsz okno do szerokości telefonu (albo otwórz na telefonie) → nad formularzem nazwa aplikacji
   i data, bez dużej kartki z kalendarza; formularz na całą szerokość.

# Testy: Pracownicy

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180 i zaloguj się jako administrator.

## Jako administrator

1. Kliknij w menu „Pracownicy” → widzisz listę kont, pod tytułem „Osób z kontem: …”, przy swoim koncie „(to Ty)”
   i wyłączony przycisk „Do archiwum”. Jeśli są tylko konta administratorów, pod tabelą jest ramka „Nie masz jeszcze
   pracowników”.
2. Kliknij „Dodaj pracownika”, nic nie wpisuj, kliknij „Zapisz” → pod polami „To pole jest wymagane.” Wpisz w „Imię” jedną literę → „Za mało znaków.”
3. Wpisz imię i nazwisko (dwa osobne pola), login (np. `jan.test@firma.pl`), kliknij „Wygeneruj” → w polu widać hasło (zapisz je
   sobie). Zmień „Dni na rok” na 20, kliknij „Zapisz” → zielony dymek, nowa osoba na liście z „20 z 20 dni zostało”.
4. Przy tej osobie kliknij „Edytuj”, ustaw „Zaległe z …” na 4, zapisz → pasek ma jaśniejszą część, a pod nim
   „w tym 4 dni zaległe”.
5. W „Edytuj” zmień rolę na Administrator → pola puli znikają. Zmień z powrotem na Pracownik i zapisz.
6. Otwórz „Edytuj” przy swoim koncie → pole „Rola” jest wyłączone z napisem „Własnej roli nie zmienisz.”
7. Wpisz w wyszukiwarkę część nazwiska → lista się zawęża, a adres strony zawiera to, co wpisałeś. Wpisz coś,
   czego nie ma → „Nikt nie pasuje do …” i przycisk „Wyczyść wyszukiwanie”. Sprawdź filtr roli i kolejność
   „Najmniej dni zostało”.
8. Wyloguj się i zaloguj loginem nowej osoby i hasłem z kroku 3 → aplikacja każe ustawić własne hasło; ustaw je.
   Ta osoba nie ma w menu pozycji „Pracownicy”, a wpisanie adresu `/admin/employees` pokazuje brak dostępu.
9. Wróć na konto administratora. Przy nowej osobie kliknij „Ustaw hasło”, „Wygeneruj”, „Ustaw hasło” → dymek.
   Ta osoba przy następnym logowaniu znów musi ustawić własne hasło.
10. Kliknij „Do archiwum” przy nowej osobie → okno z opisem skutków; potwierdź → osoba znika z listy i nie może się
    zalogować.
11. Kliknij „Dodaj pracownika” i wpisz ten sam login (możesz wielkimi literami) → pod loginem „Ten login ma konto
    w archiwum: …” z linkiem „Przywróć konto zamiast zakładać nowe”; kliknij go i potwierdź → osoba wraca na listę.
12. Kliknij „Zamknij rok …” → okno z tabelą: „Zostało w …”, „Pula na …” (do zmiany) i „Razem w …”. Zmień jedną
    pulę → „Razem” zmienia się od razu. **Kliknij „Anuluj”**, chyba że naprawdę chcesz zamknąć rok w swojej bazie
    (tego nie da się cofnąć).
13. Zmniejsz okno przeglądarki do szerokości telefonu → zamiast tabeli są karty z tymi samymi danymi i przyciskami.

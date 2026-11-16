# Testy: Typy umów

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180.

## Jako administrator

1. Zaloguj się jako administrator, w menu kliknij „Ustawienia” → „Typy umów” → widzisz 4 typy: Umowa o pracę,
   Umowa zlecenie, Umowa o dzieło, B2B. Nad tabelą: „Do wyboru u pracownika: 4. Ukryte: 0.”
2. W kolumnie „Pracownicy” typy bez pracowników mają szare „nikt”, pozostałe np. „1 pracownik”.
3. Przy „Umowa o pracę” strzałka „w górę” jest szara, przy „B2B” strzałka „w dół” jest szara.
4. Kliknij strzałkę „w górę” przy „Umowa zlecenie” → zamienia się miejscem z „Umowa o pracę”. Kliknij „w dół”, żeby
   wrócić.
5. Kliknij „Dodaj typ umowy”, wpisz „Umowa o staż”, kliknij „Zapisz” → dymek „Dodano typ umowy”, typ jest na końcu
   listy z „nikt”.
6. Znowu „Dodaj typ umowy”, wpisz „umowa o staż” (małą literą), „Zapisz” → pod polem „Typ o tej nazwie już jest.”
   Zamknij okno.
7. Otwórz „Pracownicy”, przy dowolnym pracowniku kliknij „Edytuj”. W polu „Rodzaj umowy” są typy w tej samej
   kolejności co na liście typów, „Umowa o staż” na końcu. Wybierz ją, „Zapisz” → w kolumnie „Umowa” widać
   „Umowa o staż”.
8. Wróć do „Typy umów”. Przy „Umowa o staż” jest „1 pracownik”. Kliknij „Edytuj” → żółta ramka „Ten typ ma
   1 pracownik. Nowa nazwa pokaże się także u niego.” Zmień nazwę na „Umowa stażowa”, „Zapisz” → dymek
   „Zapisano zmiany”. W „Pracownicy” w kolumnie „Umowa” jest już „Umowa stażowa”.
9. Przy „Umowa stażowa” kliknij „Ukryj” → okno „Ukryć typ „Umowa stażowa”?” z tekstem „1 pracownik z tą umową ją
   zachowa”. Kliknij „Ukryj” → dymek „Typ ukryty”, typ znika, nad tabelą „Ukryte: 1”, obok przełącznik
   „Pokaż ukryte (1)”.
10. W „Pracownicy” ten pracownik dalej ma „Umowa stażowa”. W jego oknie „Edytuj” pole „Rodzaj umowy” pokazuje
    „Umowa stażowa (ukryty)”; zmień tylko e-mail i zapisz → zapis przechodzi.
11. „Dodaj pracownika” → w polu „Rodzaj umowy” nie ma „Umowa stażowa”. Zamknij okno.
12. W „Typy umów” włącz „Pokaż ukryte (1)” → „Umowa stażowa” na dole, przygaszona, ze znacznikiem „ukryty” i dopiskiem
    „Nie da się go wybrać u pracownika”, bez strzałek.
13. Kliknij „Dodaj typ umowy”, wpisz „Umowa stażowa”, „Zapisz” → pod polem „Typ „Umowa stażowa” już jest, ukryty.
    Przywróć go”. Kliknij „Przywróć go” → okno się zamyka, dymek „Typ jest znowu do wyboru u pracownika”, typ na końcu
    widocznych.
14. Ukryj wszystkie typy po kolei → da się (rodzaj umowy jest nieobowiązkowy). W oknie pracownika pole „Rodzaj umowy”
    pokazuje „Brak typów umów. Dodasz je w Ustawieniach → Typy umów.”, a pracownika da się zapisać bez umowy. Potem
    przywróć typy.
15. Zmniejsz okno przeglądarki do szerokości telefonu → zamiast tabeli są karty z tymi samymi danymi i przyciskami.

## Jako pracownik

1. Zaloguj się jako pracownik → w menu nie ma „Ustawienia” ani „Typy umów”.
2. Wpisz w pasku adresu http://localhost:5180/admin/contract-types → napis „Nie masz dostępu do tej części aplikacji.”

## Próby nadużyć

(uzupełnione na etapie testów)

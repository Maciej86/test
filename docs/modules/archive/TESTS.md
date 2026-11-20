# Testy: Archiwum

Przed testem: `npm run db`, `npm run dev`, otwórz http://localhost:5180 i zaloguj się jako administrator.

## Jako administrator

1. W „Pracownicy” dodaj osobę „Olga Testowa” i kliknij przy niej „Do archiwum”. W menu kliknij „Archiwum” → zakładka
   „Pracownicy” ma Olgę z „bez wniosków urlopowych”, dzisiejszą datą i „przeniósł(a): <Twoje imię i nazwisko>”.
2. Wpisz w wyszukiwarce „Testowa” → zostaje sama Olga. Odśwież stronę → wyszukiwanie zostaje.
3. Kliknij „Przywróć”, potem w oknie „Przywróć” → dymek „Przywrócono konto: Olga Testowa.”, Olga znika z listy, a w
   „Pracownicy” znowu jest na liście.
4. Przenieś Olgę jeszcze raz do archiwum. W „Archiwum” kliknij przy niej „Usuń na stałe” → przycisk w oknie jest
   wyszarzony. Wpisz „Olga” → dalej wyszarzony; wpisz „Olga Testowa” → działa. Kliknij → dymek „Usunięto na stałe:
   Olga Testowa.”, Olgi nie ma w Archiwum ani w Pracownikach.
5. Osoba w archiwum, która ma wnioski urlopowe → „Usuń na stałe” jest wyszarzony, po najechaniu dymek „Ma wnioski
   urlopowe, więc zostaje w archiwum: historia urlopów musi zostać.”
6. Na tablicy dowolnego projektu dodaj zadanie „Test archiwum” w kolumnie „W toku”, dopisz komentarz i usuń zadanie
   (kosz). W „Archiwum” otwórz zakładkę „Zadania” → jest „Test archiwum” z „1 komentarz”, projektem i „W toku”.
7. Wybierz projekt w polu obok wyszukiwarki → lista pokazuje tylko jego zadania. „Wszystkie projekty” przywraca resztę.
8. Kliknij wiersz zadania → z prawej otwiera się podgląd: opis, termin, osoby, komentarz, informacja, że zadanie
   można tylko obejrzeć. Kliknij „Przywróć” → okno mówi, że zadanie wróci na koniec kolumny „W toku”; potwierdź →
   dymek „Przywrócono zadanie „Test archiwum”.”. Na tablicy projektu zadanie jest na końcu kolumny „W toku”,
   z komentarzem.
9. Usuń zadanie z tablicy jeszcze raz. W „Archiwum” kliknij „Usuń na stałe” → okno mówi, że zniknie razem z 1
   komentarzem; potwierdź → dymek, zadania nie ma w archiwum.
10. W „Historii zmian” kliknij wpis o przeniesieniu do archiwum zadania, które jest w archiwum → przycisk „Otwórz
    w archiwum” otwiera Archiwum z podglądem tego zadania. To samo dla konta: otwiera zakładkę Pracownicy
    z wyszukaniem po loginie.
11. W Historii zmian są wpisy „Przywrócenie konta”, „Usunięcie konta na stałe”, „Przywrócenie zadania z archiwum”,
    „Usunięcie zadania na stałe”.
12. Puste archiwum (gdy nic w nim nie ma) → „Nikogo nie ma w archiwum” i „Żadnego zadania nie ma w archiwum”.
13. Na telefonie (wąskie okno) listy są kartami, a podgląd zadania zajmuje cały ekran.

## Jako pracownik

1. W menu nie ma „Archiwum”. Wejście na adres `/admin/archive` → ekran „Brak dostępu”.

## Próby nadużyć

(uzupełniane na etapie testy według `abuse.md`)

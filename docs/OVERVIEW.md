# Opis aplikacji: test

## Opis własnymi słowami

Chciałbym aby w aplikacji zbierać wnioski urlopowe pracowników. Pracownik się loguje, składa wniosek, typ urlopu,
daty, a ja go zatwierdzam lub odrzucam. Dodatkowo chciałbym aby aplikacja miała możliwość przypisania zadań coś jak
Asana.

Zadania może tworzyć każdy pracownik i dodać każdego innego pracownika. Zadania muszą być w trybie: w opracowaniu,
w toku, zrealizowane. Wystarczy mi tytuł zadania, opis, ewentualnie data, na kiedy ma być zrobione. Zadania muszą dać
się przeciągać, aby ustawiać ich kolejność.

**Inspiracja:** Asana, czyli tablica z kolumnami, na której zadania przeciąga się między kolumnami i w ich obrębie.
Budujemy podobnie, nie identycznie (bez nazwy, wyglądu i pozostałych funkcji Asany).

## Ustalenia z wywiadu (2026-11-13)

- **Części aplikacji:** tylko panel (`/admin`) dla administratora i pracowników. Bez strony dla odwiedzających i bez
  kont klientów.
- **Role:**
  - `admin` (Administrator, właściciel): zakłada i archiwizuje konta pracowników, ustawia pule dni, zatwierdza,
    odrzuca (z powodem widocznym dla pracownika) i anuluje urlopy (także już zatwierdzone, wtedy dni wracają do
    puli), zarządza typami urlopów, widzi historię zmian i archiwum, przywraca z archiwum i usuwa z niego na stałe.
  - `employee` (Pracownik): składa wnioski urlopowe i widzi tylko swoje, wycofuje wniosek, dopóki czeka na decyzję,
    widzi swoją pulę dni (bieżącą i zaległą).
  - Wszyscy: jedna wspólna tablica zadań. Każdy widzi, tworzy, edytuje, przesuwa i przypisuje wszystkie zadania.
- **Dostęp:** nic nie jest publiczne. Wszystko wymaga zalogowania, a każda część danych jest dostępna tylko dla ról,
  które ją widzą. Każdy pracownik ma dostęp do urlopów i zadań, bez nadawania dostępu osobno.
- **Logowanie:** login w formacie adresu e-mail (nie musi to być prawdziwa skrzynka) i hasło. Osobne,
  nieobowiązkowe pole „e-mail do powiadomień”. Kto go nie ma, nie dostaje e-maili, a zapomniane hasło zmienia mu
  administrator. Konta zakłada tylko administrator, bez samodzielnej rejestracji.
- **Wiele firm:** nie, tylko jedna firma.
- **Dane:**
  - Pracownik (użytkownik): imię i nazwisko, login, e-mail do powiadomień (opcjonalny), rola, hasło.
  - Typ urlopu: nazwa, czy odejmuje dni z puli. Na start: wypoczynkowy, na żądanie, okolicznościowy, bezpłatny,
    opieka nad dzieckiem. Listę edytuje administrator.
  - Pula dni: dla pracownika na rok (liczba dni). Niewykorzystane dni przechodzą na następny rok jako osobna
    pozycja „zaległy urlop”, wykorzystywana w pierwszej kolejności.
  - Wniosek urlopowy: pracownik, typ, data od i do, liczba dni roboczych (wyliczana), komentarz pracownika
    (opcjonalny), status, powód odrzucenia, kto i kiedy rozpatrzył.
  - Zadanie: tytuł, opis, termin (opcjonalny), kolumna (status), kolejność w kolumnie, autor, przypisane osoby
    (jedna lub kilka).
- **Główna czynność:** pracownik składa wniosek urlopowy, administrator dostaje powiadomienie i e-mail, zatwierdza
  albo odrzuca, a zatwierdzony wniosek odejmuje dni z puli (najpierw zaległe).
- **Statusy:**
  - Wniosek: oczekuje → zatwierdzony / odrzucony; oczekuje → wycofany (przez pracownika); zatwierdzony → anulowany
    (przez administratora, dni wracają do puli).
  - Zadanie: W opracowaniu → W toku → Zrealizowane (dowolne przeciąganie między kolumnami i w obrębie kolumny).
- **Historia zmian:** tak, dla wniosków urlopowych (złożenie, decyzje, wycofanie, anulowanie), pul dni (zmiany)
  i zadań (utworzenie, edycja, przesunięcie, usunięcie). Widzi ją tylko administrator.
- **Archiwum:** pracownicy (konto przestaje działać, wnioski i historia zostają) i zadania. Przywraca i usuwa na
  stałe tylko administrator. Wniosków urlopowych się nie usuwa.
- **Powiadomienia w aplikacji (dzwonek):** administrator o nowym i wycofanym wniosku; pracownik o zatwierdzeniu,
  odrzuceniu i anulowaniu swojego urlopu oraz o przypisaniu do zadania.
- **E-maile:** tylko do administratora o nowym wniosku urlopowym (gdy ma e-mail do powiadomień).
- **Pliki:** brak na start.
- **Raporty:** brak na start.
- **Wygląd:** kolory w odcieniach ciemnego niebieskiego; tylko jasny motyw (bez przełącznika).
- **Języki:** tylko polski.
- **Publikacja:** brak domeny i serwera; na końcu budowy przez OVH.
- **Najważniejsze na start:** wnioski urlopowe.
- **Dodatki:**
  1. Pulpit z liczbami: administrator widzi wnioski do rozpatrzenia, pracownik swoją pulę dni i przypisane zadania.
  2. Ustawienia własnego konta: zmiana własnego hasła i e-maila do powiadomień.
  3. Strona „nie znaleziono” i przerwa techniczna.
  4. Wyszukiwarka, filtry i sortowanie list (pracownicy, wnioski).
  5. Eksport wniosku urlopowego do PDF i wydruk (do podpisu, do teczki pracownika).
  6. Wylogowanie po bezczynności.

## Makieta ogólna: odpowiedzi (2026-11-13)

Menu zaakceptowane bez zmian: Pulpit, Moje urlopy (pracownik), Wnioski urlopowe (admin), Zadania, Pracownicy (admin),
Typy urlopów (admin), Historia zmian (admin), Archiwum (admin), Moje konto.

Użytkownik wybrał wszystkie polecane warianty:

- Pulpit: zawartość jak w makiecie (admin: wnioski do rozpatrzenia, stan tablicy; pracownik: pozostałe dni, moje zadania).
- Moje urlopy: aplikacja sama liczy dni robocze z dat (bez weekendów i świąt).
- Moje urlopy: gdy w puli brakuje dni, wniosek na typ odejmujący dni z puli jest blokowany (pracownik widzi, ile
  dni mu brakuje). **[decyzja AI]**, bez wariantu polecanego w pytaniu.
- Wnioski urlopowe: zatwierdzanie i odrzucanie od razu z listy.
- Zadania: filtr „Tylko moje zadania”.
- Zadania: zrealizowane ponad 30 dni temu chowają się same, przycisk pokazuje je ponownie.
- Pracownicy: przejście na nowy rok ręcznie, przyciskiem „Zamknij rok” (przeniesienie niewykorzystanych dni do zaległych).
- Pracownicy: bez dodatkowych danych (imię i nazwisko, login, e-mail do powiadomień, rola). **[decyzja AI]**
- Typy urlopów: nazwa, „odejmuje dni z puli” i opcjonalny roczny limit dni dla typu.

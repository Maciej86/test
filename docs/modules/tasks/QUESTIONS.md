# Zadania: pytania do makiety

Makieta: http://localhost:5181, w menu **Zadania** (rozwija się): projekty **Marketing**, **Produkcja**, **Montaż**
i **Projekty** (lista projektów, tylko administrator). W pasku „Oglądam jako:” przełączasz Administrator i Pracownik
(pracownik to Jan Kowalski: widzi tylko Marketing i Produkcję). Przełącznik „Pokaż stan” na tablicy pokazuje: tablicę,
nowe zadanie (okno), podgląd z komentarzami, osobę na urlopie przed terminem, błędy w formularzu, usunięcie, starsze
zrealizowane, „tylko moje” i pusty projekt; na liście projektów: listę, nowy projekt, powtórzoną nazwę, usuwanie osoby
z zadaniami, przeniesienie do archiwum i brak projektów. Karty da się przeciągać myszką (w makiecie tylko na
komputerze), a w menu „⋮” na karcie jest „Przenieś do”.

**[decyzja AI]** Obie role mogą wszystko na tablicach projektów, które widzą (dodać, zmienić, przesunąć, przypisać,
usunąć, komentować). „Usuń” przenosi zadanie do archiwum, skąd przywraca je tylko administrator. Termin po czasie jest
czerwony, termin dziś albo jutro żółty, a w nagłówku widać liczbę zadań po terminie. Zadanie przeniesione do
„Zrealizowane” dostaje datę realizacji; po 30 dniach od niej chowa się samo, a przeniesione z powrotem traci datę.
Osoba w archiwum zostaje przy starych zadaniach (szare kółko), ale nie da się jej dodać. Wyszukiwarka szuka w tytule
i opisie. Administratorzy widzą wszystkie projekty i można ich przypisać do każdego zadania bez dodawania do projektu.
Liczba komentarzy jest widoczna na karcie.

## Zmiany zgłoszone 2026-11-18 (po pierwszej makiecie)

- **Projekty:** administrator tworzy projekty (np. Marketing, Produkcja, Montaż) i przypisuje do nich wybranych
  pracowników. Każdy projekt to osobna pozycja w podmenu „Zadania” z własną tablicą. **Każde zadanie należy do
  projektu**, nie ma tablicy wspólnej. Pracownik widzi tylko projekty, do których należy; administrator wszystkie.
  Do zadania można przypisać tylko członków projektu (i administratorów).
- **Komentarze do zadań:** komentuje każdy, kto widzi zadanie; przypisane osoby dostają powiadomienie o nowym
  komentarzu (autor nie).
- **Dodawanie zadania w oknie na środku ekranu**; podgląd klikniętego zadania zostaje z prawej, szerszy o 100 px
  (540 px).
- **Odświeżanie tablicy co 5 sekund**, gdy karta przeglądarki jest otwarta (zamiast 30 s), i od razu po powrocie do
  niej. Dzwonek zostaje przy 60 sekundach.
- **Znacznik „Zakończone” (2026-11-19):** opcja w menu karty i w podglądzie; karta zostaje w swojej kolumnie,
  wyszarzona, z plakietką „Zakończone”; budowane w części 1.
- Moduł robi się duży: po pytaniach zaproponuję podział na części (część 1: projekty i tablice, część 2: komentarze).

## 1. Kliknięcie karty

- a) Podgląd z prawej, w którym od razu można zmieniać pola i klikać „Zapisz”; pod spodem komentarze **(polecam)**
- b) Najpierw sam podgląd, zmiany dopiero po „Edytuj”

**Odpowiedź (2026-11-18):** 1a.

## 2. Dodawanie zadań

- a) Jeden przycisk u góry; nowe zadanie trafia na górę „W opracowaniu”, w oknie można wybrać inną kolumnę **(polecam)**
- b) Dodatkowo mały przycisk „+” pod każdą kolumną

**Odpowiedź (2026-11-18):** 2a.

## 3. Urlop przypisanej osoby (powiązanie z urlopami)

- a) Żółta kropka przy osobie, gdy ma zatwierdzony urlop między dziś a terminem zadania (bez terminu: w najbliższych
  14 dniach); po najechaniu tylko daty, bez rodzaju urlopu; w formularzu żółta ramka z ostrzeżeniem **(polecam)**
- b) Tak samo, ale także dla wniosków czekających na decyzję
- c) Bez informacji o urlopach na tablicy

**Odpowiedź (2026-11-18):** 3a.

## 4. „Tylko moje zadania”

- a) Zadania, do których jestem przypisany (moje karty mają też niebieski pasek po lewej) **(polecam)**
- b) Przypisane do mnie i te, które sam dodałem

**Odpowiedź (2026-11-18):** 4a.

## 5. Powiadomienia o zadaniach

- a) Gdy ktoś inny przypisze mnie do zadania albo skomentuje zadanie, do którego jestem przypisany **(polecam)**
- b) Dodatkowo, gdy ktoś inny przeniesie moje zadanie do „Zrealizowane” albo je usunie

**Odpowiedź (2026-11-18):** 5a.

## 6. Tablica na telefonie

- a) Jedna kolumna naraz, przełączana u góry; kolejność przeciągnięciem, do innej kolumny przez „⋮ → Przenieś do” **(polecam)**
- b) Wszystkie trzy kolumny jedna pod drugą

**Odpowiedź (2026-11-18):** 6a.

## 7. Zmiany innych osób na wspólnej tablicy

- a) Odświeżanie co 30 sekund i po powrocie do karty przeglądarki
- b) Tylko po odświeżeniu strony

**Odpowiedź (2026-11-18):** co 5 sekund, gdy karta przeglądarki jest otwarta, i od razu po powrocie do niej
(użytkownik chciał „od razu”; zmiana w tej samej sekundzie wymagałaby stałego połączenia z serwerem).

## 8. Dodatek do przeciągania kart

- a) Zgoda na `@dnd-kit` (darmowy, popularny, działa też palcem na telefonie) **(polecam)**
- b) Bez dodatku: przenoszenie tylko z menu karty

**Odpowiedź (2026-11-18):** 8a: zgoda na `@dnd-kit`.

## 9. Zasady pól (zadanie i komentarz)

| Pole | Wymagane | Zasady | Przykład |
|---|---|---|---|
| Tytuł | tak | 3–150 znaków | Zamówić tonery do drukarek |
| Opis | nie | do 2000 znaków | |
| Termin | nie | data DD.MM.RRRR; przy dodawaniu nie wcześniej niż dziś, przy zmianie dowolna | 25.11.2026 |
| Przypisane osoby | nie | 0–10 osób: członkowie projektu i administratorzy, bez kont w archiwum | |
| Kolumna | tak | W opracowaniu / W toku / Zrealizowane, domyślnie „W opracowaniu” | |
| Komentarz | tak | 1–2000 znaków | |

**Odpowiedź (2026-11-18):** ok.

## 10. Widok zadań ze wszystkich projektów

- a) Każdy projekt osobno; „moje zadania ze wszystkich projektów” pokaże Pulpit **(polecam)**
- b) Dodatkowo pozycja „Moje zadania” na górze podmenu: moje zadania ze wszystkich projektów na jednej tablicy

**Odpowiedź (2026-11-18):** 10a.

## 11. Zmiana i usuwanie komentarzy

- a) Autor może poprawić i usunąć swój komentarz (poprawiony ma dopisek „edytowany”); administrator może usunąć
  każdy **(polecam)**
- b) Komentarzy nie da się zmieniać ani usuwać

**Odpowiedź (2026-11-18):** 11a.

## 12. Kolejność projektów w menu

- a) Strzałkami na liście projektów, tak jak typy urlopów **(polecam)**
- b) Zawsze alfabetycznie

**Odpowiedź (2026-11-18):** 12a.

## 13. Projekt, który nie jest już potrzebny

- a) „Do archiwum”: znika z menu razem z zadaniami; w Archiwum można go przywrócić albo usunąć na stałe **(polecam)**
- b) Usunąć można tylko projekt bez zadań

**Odpowiedź (2026-11-18):** „Usuń projekt” usuwa **na stałe**, bez archiwum, razem z zadaniami i komentarzami; w oknie widać liczbę zadań, które znikną, i trzeba wpisać nazwę projektu.

## 14. Usunięcie osoby z projektu

- a) Osoba przestaje widzieć projekt i znika z przypisań w jego otwartych zadaniach (w zrealizowanych zostaje); okno
  najpierw ostrzega, z ilu zadań zniknie **(polecam)**
- b) Nie da się usunąć osoby, która ma otwarte zadania w projekcie

**Odpowiedź (2026-11-18):** 14a: zadanie zostaje, osoba znika z przypisań tylko w otwartych zadaniach („W opracowaniu”, „W toku”); w zrealizowanych zostaje. Osoba przestaje widzieć projekt.

## 15. Powiadomienie o dodaniu do projektu

- a) Pracownik dostaje powiadomienie w dzwonku, gdy dodasz go do projektu **(polecam)**
- b) Bez powiadomienia, projekt po prostu pojawia się w menu

**Odpowiedź (2026-11-18):** 15a.

## 16. Zasady pól (projekt)

| Pole | Wymagane | Zasady | Przykład |
|---|---|---|---|
| Nazwa | tak | 2–60 znaków, nie może się powtarzać (także z projektami w archiwum) | Marketing |
| Członkowie | nie | 0–50 osób, tylko pracownicy spoza archiwum (administratorzy widzą wszystko i bez tego) | |

**Odpowiedź (2026-11-18):** ok.

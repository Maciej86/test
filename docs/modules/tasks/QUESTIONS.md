# Zadania: pytania do makiety

Makieta: http://localhost:5181/admin/tasks (w menu „Zadania”; w pasku „Oglądam jako:” można przełączać Administrator
i Pracownik, obie role widzą to samo). Przełącznik „Pokaż stan” pokazuje: tablicę, nowe zadanie, edycję, osobę na
urlopie przed terminem, błędy w formularzu, usunięcie, starsze zrealizowane, „tylko moje” i pustą tablicę. Karty da
się przeciągać myszką (w makiecie tylko na komputerze), a w menu „⋮” na karcie jest „Przenieś do”.

**[decyzja AI]** Zgodnie ze specem ogólnym obie role mogą wszystko na tablicy (dodać, zmienić, przesunąć, przypisać,
usunąć). „Usuń” przenosi zadanie do archiwum, skąd przywraca je tylko administrator. Termin po czasie jest czerwony,
termin dziś albo jutro żółty, a w nagłówku widać liczbę zadań po terminie. Zadanie przeniesione do „Zrealizowane”
dostaje datę realizacji; po 30 dniach od tej daty chowa się samo, a przeniesione z powrotem traci datę. Osoba
w archiwum zostaje przy starych zadaniach (szare kółko), ale nie da się jej dodać do zadania. Wyszukiwarka szuka
w tytule i opisie.

## 1. Kliknięcie karty

- a) Od razu formularz z prawej: zmieniasz i klikasz „Zapisz” **(polecam)**
- b) Najpierw podgląd zadania, zmiany dopiero po „Edytuj”

**Odpowiedź:**

## 2. Dodawanie zadań

- a) Jeden przycisk u góry; nowe zadanie trafia na górę „W opracowaniu”, w formularzu można wybrać inną kolumnę **(polecam)**
- b) Dodatkowo mały przycisk „+” pod każdą kolumną

**Odpowiedź:**

## 3. Urlop przypisanej osoby (powiązanie z urlopami)

- a) Żółta kropka przy osobie, gdy ma zatwierdzony urlop między dziś a terminem zadania (bez terminu: w najbliższych
  14 dniach); po najechaniu tylko daty, bez rodzaju urlopu; w formularzu żółta ramka z ostrzeżeniem **(polecam)**
- b) Tak samo, ale także dla wniosków czekających na decyzję
- c) Bez informacji o urlopach na tablicy

**Odpowiedź:**

## 4. „Tylko moje zadania”

- a) Zadania, do których jestem przypisany (moje karty mają też niebieski pasek po lewej) **(polecam)**
- b) Przypisane do mnie i te, które sam dodałem

**Odpowiedź:**

## 5. Powiadomienia

- a) Tylko gdy ktoś inny przypisze mnie do zadania (jak w planie aplikacji) **(polecam)**
- b) Dodatkowo, gdy ktoś inny przeniesie moje zadanie do „Zrealizowane” albo je usunie

**Odpowiedź:**

## 6. Tablica na telefonie

- a) Jedna kolumna naraz, przełączana u góry; kolejność przeciągnięciem, do innej kolumny przez „⋮ → Przenieś do” **(polecam)**
- b) Wszystkie trzy kolumny jedna pod drugą

**Odpowiedź:**

## 7. Zmiany innych osób na wspólnej tablicy

- a) Tablica odświeża się sama co 30 sekund i po powrocie do karty przeglądarki **(polecam)**
- b) Tylko po odświeżeniu strony

**Odpowiedź:**

## 8. Dodatek do przeciągania kart

- a) Zgoda na `@dnd-kit` (darmowy, popularny, działa też palcem na telefonie) **(polecam)**
- b) Bez dodatku: przenoszenie tylko z menu karty

**Odpowiedź:**

## 9. Zasady pól (formularz zadania)

| Pole | Wymagane | Zasady | Przykład |
|---|---|---|---|
| Tytuł | tak | 3–150 znaków | Zamówić tonery do drukarek |
| Opis | nie | do 2000 znaków | |
| Termin | nie | data DD.MM.RRRR; przy dodawaniu nie wcześniej niż dziś, przy zmianie dowolna | 25.11.2026 |
| Przypisane osoby | nie | 0–10 osób, tylko konta spoza archiwum | |
| Kolumna | tak | W opracowaniu / W toku / Zrealizowane, domyślnie „W opracowaniu” | |

**Odpowiedź:** („ok” albo poprawki)

# Moje urlopy: pytania do makiety

Makieta: http://localhost:5181/admin/my-leave (w pasku „Oglądam jako:” wybierz **Pracownik**, w menu „Moje urlopy”).
Przełącznik „Pokaż stan” pokazuje: listę, brak wniosków, nowy wniosek, za mało dni, limit typu, termin zajęty,
wniosek na przyszły rok, wycofanie i wydruk. Przyciski „Złóż wniosek”, „Wycofaj” i „PDF” otwierają okna.

**[decyzja AI]** Pula na górze pokazuje rok otwarty (jeszcze niezamknięty przez administratora): duża liczba = dni,
o które można jeszcze wnioskować; pasek: wykorzystane, czeka na decyzję, zostało z zaległego, zostało z puli rocznej.
Obok limity typów, które je mają (Na żądanie, Opieka nad dzieckiem). W oknie wniosku pasek dni terminu: dni robocze
jasne, weekendy i święta przekreślone (np. Wigilia 24.12). Wniosek się nie usuwa (spec ogólny).

## 1. Urlop na przyszły rok

- a) Wniosek mieści się w jednym roku i liczy się z puli tego roku. Na daty z przyszłego roku wniosek można złożyć
  dopiero, gdy administrator zrobi „Zamknij rok” (wtedy znana jest pula). Urlop na przełomie lat = dwa wnioski
  **(polecam)**
- b) Wniosek na daty z przyszłego roku można złożyć od razu; dni liczą się z obecnej puli

**Odpowiedź:**

## 2. Blokada przy braku dni

- a) Nie da się złożyć wniosku na więcej dni, niż zostało; dni z wniosków czekających na decyzję też się liczą
  (są zarezerwowane) **(polecam)**
- b) Liczą się tylko wnioski zatwierdzone; czekające nie blokują kolejnych
- c) Można złożyć, aplikacja tylko ostrzega, a decyduje administrator

**Odpowiedź:**

## 3. Wniosek na dni, które minęły

- a) Najwcześniej od dziś **(polecam)**
- b) Także do 14 dni wstecz (np. urlop na żądanie zgłoszony po fakcie)

**Odpowiedź:**

## 4. Wnioski ze wspólnymi dniami

- a) Nie: termin nie może zachodzić na inny wniosek czekający albo zatwierdzony **(polecam)**
- b) Tak, decyduje administrator

**Odpowiedź:**

## 5. Pomyłka w terminie

- a) Wniosku się nie poprawia: czekający można wycofać i złożyć nowy **(polecam)**
- b) Wniosek czekający na decyzję można też poprawić (przycisk „Edytuj”)

**Odpowiedź:**

## 6. Wydruk / PDF zatwierdzonego wniosku

- a) Treść jak w podglądzie (nazwa aplikacji, data złożenia, numer, pracownik, typ, termin, dni robocze z podziałem,
  komentarz, kto i kiedy zatwierdził), miejsca na dwa podpisy; przycisk otwiera PDF w nowej karcie, tam drukujesz
  albo zapisujesz **(polecam)**
- b) Bez miejsc na podpisy

Czegoś brakuje (np. nazwa firmy, stanowisko)? Dopisz.

**Odpowiedź:**

## 7. Starsze wnioski

- a) Wybór roku nad tabelą (domyślnie bieżący); czekające na górze, potem od najnowszego terminu **(polecam)**
- b) Wszystkie lata naraz, z filtrem statusu

**Odpowiedź:**

## 8. Zasady pól (okno „Złóż wniosek”)

| Pole | Wymagane | Zasada | Przykład |
|---|---|---|---|
| Typ urlopu | tak | tylko widoczne typy, w kolejności z „Typów urlopów” | Wypoczynkowy |
| Od | tak | data, najwcześniej dziś (pytanie 3) | 21.12.2026 |
| Do | tak | data, nie wcześniej niż „Od”, ten sam rok (pytanie 1) | 31.12.2026 |
| Termin | — | co najmniej 1 dzień roboczy; nie więcej niż zostało (pytanie 2) i niż limit typu | 7 dni roboczych |
| Komentarz | nie | do 500 znaków; widzi go administrator, jest na wydruku | Święta u rodziców. |

Odpowiedz „ok” albo popraw pole.

**Odpowiedź:**

## 9. Powiązania z innymi modułami

- a) Nowy wniosek: powiadomienie w dzwonku i e-mail do administratorów. Wycofanie: samo powiadomienie. Dni czekające
  widać u administratora w „Pracownikach” (pasek puli, żółta ramka w „Zamknij rok”) **(polecam)**
- b) Jak a, ale przy wycofaniu też e-mail

**Odpowiedź:**

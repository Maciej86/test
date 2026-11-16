# Typy urlopów: pytania do makiety

Makieta: http://localhost:5181/admin/leave-types (w menu makiety „Typy urlopów”). Przełącznik „Pokaż stan” pokazuje
stany ekranu: lista, z ukrytymi typami, nazwa zajęta przez ukryty typ, edycja typu, który jest już we wnioskach.
Przyciski „Dodaj typ urlopu”, „Edytuj” i „Ukryj” otwierają okna.

**[decyzja AI]** Na start aplikacja ma pięć typów z wywiadu, w tej kolejności: Wypoczynkowy (odejmuje dni), Na żądanie
(odejmuje dni, limit 4), Okolicznościowy, Bezpłatny, Opieka nad dzieckiem (limit 2). Ostatniego widocznego typu nie da
się ukryć (bez typów nie da się złożyć wniosku). Typy widzi i zmienia tylko administrator.

## 1. Limit w roku: jak liczyć?

- a) Osobno dla każdej osoby, w dniach roboczych, w roku kalendarzowym; wliczają się wnioski czekające
  i zatwierdzone, więc nie da się złożyć dwóch, które razem przekroczą limit **(polecam)**
- b) Wliczają się tylko wnioski zatwierdzone; czekające nie blokują kolejnego

**Odpowiedź:**

## 2. Edycja typu, który jest już we wnioskach

- a) Nową nazwę widać we wszystkich wnioskach, także starych; „Odejmuje dni z puli” i limit działają tylko dla nowych
  wniosków (żółta ramka w oknie) **(polecam)**
- b) Gdy typ jest już we wnioskach, „Odejmuje dni z puli” jest zablokowane; inną zasadę ustawia się nowym typem

**Odpowiedź:**

## 3. Jak pokazywać ukryte typy?

- a) Schowane; przełącznik „Pokaż ukryte” dopisuje je przygaszone, z przyciskiem „Przywróć” **(polecam)**
- b) Zawsze widoczne na dole listy, przygaszone

**Odpowiedź:**

## 4. Czy typ urlopu da się usunąć?

- a) Tylko ukrywanie, bez usuwania na stałe (jak w specu ogólnym) **(polecam)**
- b) Typ, którego nie ma w żadnym wniosku, można też usunąć na stałe

**Odpowiedź:**

## 5. Kolejność typów na liście i w formularzu wniosku

- a) Własna kolejność, ustawiana strzałkami; nowy typ trafia na koniec **(polecam)**
- b) Alfabetycznie

**Odpowiedź:**

## 6. Opis typu dla pracownika

- a) Bez opisu, wystarczy nazwa **(polecam)**
- b) Krótki opis (do 200 znaków) widoczny dla pracownika w formularzu wniosku

**Odpowiedź:**

## 7. Kolumna „Wnioski”

W ilu wnioskach (ze wszystkich lat) jest typ; do czasu modułu „Moje urlopy” wszędzie 0.

- a) Zostaje **(polecam)**
- b) Bez tej kolumny

**Odpowiedź:**

## 8. Zasady pól

| Pole | Wymagane | Zakres | Format |
|---|---|---|---|
| Nazwa | tak | 2–40 znaków | niepowtarzalna także wśród ukrytych, bez względu na wielkość liter, np. `Na żądanie` |
| Odejmuje dni z puli | — | tak / nie | przełącznik, domyślnie włączony |
| Limit dni w roku | nie | 1–365 | liczba całkowita; puste = bez limitu |

**Odpowiedź:**

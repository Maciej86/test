# Typy umów: pytania do makiety

Makieta: http://localhost:5181/admin/contract-types (w menu makiety „Ustawienia → Typy umów”). Przełącznik „Pokaż stan”
pokazuje stany ekranu: lista, z ukrytymi typami, nazwa zajęta przez ukryty typ, edycja typu, który mają pracownicy,
podgląd pola „Rodzaj umowy” w oknie pracownika, pusta lista. Przyciski „Dodaj typ umowy”, „Edytuj” i „Ukryj” otwierają
okna.

**Ustalone wcześniej** (`docs/IDEAS.md`, odpowiedzi 1a 2a 3a): typy umów prowadzi tylko administrator, w menu
„Ustawienia”; można dodać, zmienić nazwę i ukryć (bez usuwania na stałe). **[decyzja AI]** Na start są cztery
dotychczasowe rodzaje umowy (Umowa o pracę, Umowa zlecenie, Umowa o dzieło, B2B), a pracownicy zachowują swoje umowy.

## 1. Ukryty typ u pracownika

- a) Pracownicy, którzy już mają ukryty typ, zachowują go (na liście pracowników bez zmian, w oknie pracownika
  z dopiskiem „ukryty”). Nowej osobie nie da się go wybrać **(polecam)**
- b) Przy ukryciu typ znika też u pracowników (pole „Rodzaj umowy” robi się puste)

**Odpowiedź (2026-11-16):** 1a.

## 2. Kolejność typów

- a) Własna kolejność ustawiana strzałkami, jak w Typach urlopów; nowy typ trafia na koniec. Ta sama kolejność jest na
  liście w oknie pracownika **(polecam)**
- b) Alfabetycznie

**Odpowiedź (2026-11-16):** 2a.

## 3. Kolumna „Pracownicy”

- a) Zostaje: ile osób (także w archiwum) ma ten typ **(polecam)**
- b) Bez tej kolumny

**Odpowiedź (2026-11-16):** 3a.

## 4. Czy typ umowy ma mieć coś poza nazwą?

- a) Tylko nazwa. Inne ustawienia (np. „czy umowa daje pulę urlopu”) można dodać później **(polecam)**
- b) Nazwa i przełącznik „Daje prawo do urlopu”: pracownik z umową bez tego prawa nie dostaje puli dni (zmieni to
  Pracowników i Moje urlopy)

**Odpowiedź (2026-11-16):** 4a.

## 5. Zasady pól

| Pole | Wymagane | Zakres | Format |
|---|---|---|---|
| Nazwa | tak | 2–60 znaków | niepowtarzalna także wśród ukrytych, bez względu na wielkość liter, np. `Umowa zlecenie` |

**Odpowiedź (2026-11-16):** ok.

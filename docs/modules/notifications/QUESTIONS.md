# Powiadomienia: pytania do makiety

Makieta: http://localhost:5181 (panel). Dzwonek jest w górnej belce na każdym ekranie; „Pokaż wszystkie” w dzwonku
otwiera stronę „Powiadomienia: wszystkie” (też w menu makiety). Przełącznik „Oglądam jako” pokazuje powiadomienia
administratora albo pracownika, a „Pokaż stan” na stronie pokazuje, jak wygląda brak powiadomień.

**[decyzja AI]** Kto dostaje jakie powiadomienie, ustala spec ogólny: administrator o nowym i wycofanym wniosku,
pracownik o zatwierdzeniu, odrzuceniu, anulowaniu swojego urlopu i o przypisaniu do zadania. Nikt nie dostaje
powiadomienia o czymś, co zrobił sam (np. przypisał siebie do zadania). Nieprzeczytane mają jaśniejsze tło, granatowy
pasek po lewej i kropkę; liczba na dzwonku to liczba nieprzeczytanych. Kliknięcie prowadzi do wniosku albo zadania.
Przy powiadomieniu widać, kto wykonał czynność (zostaje także po usunięciu tej osoby). Strona „wszystkie” nie ma
pozycji w menu.

## 1. Czy potrzebna jest osobna strona ze wszystkimi powiadomieniami?

- a) Dzwonek pokazuje 8 ostatnich, a „Pokaż wszystkie” otwiera stronę z całą listą i filtrem „Nieprzeczytane”
  **(polecam)**
- b) Bez osobnej strony: w dzwonku przewijana lista wszystkich powiadomień

**Odpowiedź (2026-11-16):** 1a.

## 2. Kiedy powiadomienie przestaje być „nowe” (znika z licznika na dzwonku)?

- a) Gdy je klikniesz; do tego przycisk „Oznacz wszystkie jako przeczytane” **(polecam)**
- b) Wszystkie już przy otwarciu dzwonka

**Odpowiedź (2026-11-16):** 2a.

## 3. Jak szybko ma się pojawić nowe powiadomienie, gdy aplikacja jest otwarta?

- a) Co minutę, a od razu, gdy wracasz do karty z aplikacją **(polecam)**
- b) Tylko po odświeżeniu strony albo przejściu na inny ekran

**Odpowiedź (2026-11-16):** 3a.

## 4. Jak długo trzymać powiadomienia?

- a) Przeczytane usuwają się same po 90 dniach, nieprzeczytane zostają **(polecam)**
- b) Wszystkie zostają na zawsze
- c) Każde da się usunąć ręcznie krzyżykiem, a starsze niż 90 dni znikają same

**Odpowiedź (2026-11-16):** 4a.

## 5. Gdy w firmie jest kilku administratorów, kto dostaje powiadomienie o nowym wniosku?

- a) Każdy administrator dostaje własne powiadomienie i sam je odczytuje **(polecam)**
- b) Gdy jeden administrator rozpatrzy wniosek, powiadomienie o nim znika u pozostałych

**Odpowiedź (2026-11-16):** 5a.

## 6. Czy teksty powiadomień są w porządku?

Administrator: „Nowy wniosek: Jan Kowalski” (typ, termin, dni robocze), „Wniosek wycofany: Piotr Zieliński”.
Pracownik: „Urlop zatwierdzony”, „Urlop odrzucony” (z powodem), „Urlop anulowany” („Dni wróciły do puli.”), „Nowe
zadanie dla Ciebie” (tytuł i termin).

- a) Tak jak w makiecie **(polecam)**
- b) Poprawki (napisz, które)

**Odpowiedź (2026-11-16):** 6a.

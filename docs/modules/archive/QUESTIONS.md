# Archiwum: pytania do makiety

Makieta: http://localhost:5181, w menu **Archiwum** (tylko administrator). Żółty przełącznik „Pokaż stan” pokazuje
listę, puste archiwum i brak wyników. Dwie zakładki: Pracownicy i Zadania. Przyciski otwierają okna potwierdzeń,
a kliknięcie zadania otwiera jego podgląd z prawej.

**[decyzja AI]** Przywrócone konto loguje się tym samym loginem i hasłem, z tą samą rolą i pulą dni (tak działa już
przywracanie w module Pracownicy). Usunięcie konta na stałe kasuje też jego pule dni, powiadomienia, członkostwo
w projektach i przypisania do zadań. Komentarze, autorstwo zadań i wpisy w Historii zmian zostają z imieniem
i nazwiskiem (tak ustalono w specu ogólnym). Zadania z usuniętego projektu znikają razem z nim, więc w archiwum ich nie
ma. Najnowsze na górze.

## 1. Usunięcie na stałe osoby z wnioskami urlopowymi

- a) Nie da się: przycisk jest wyłączony z wyjaśnieniem, konto zostaje w archiwum na zawsze (historia urlopów zostaje) **(polecam)**
- b) Da się: po wpisaniu imienia i nazwiska konto znika razem ze wszystkimi jego wnioskami
- c) Da się: konto znika, a wnioski zostają z samym imieniem i nazwiskiem (bez konta)

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

## 2. Potwierdzenie usunięcia na stałe

- a) Osoby: wpisanie imienia i nazwiska (jak przy usuwaniu projektu). Zadania: zwykłe okno z liczbą komentarzy, które znikną **(polecam)**
- b) Wszędzie zwykłe okno z pytaniem
- c) Wszędzie wpisanie nazwy (imienia i nazwiska albo tytułu zadania)

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

## 3. Gdzie wraca przywrócone zadanie

- a) Do tej samej kolumny, w której było, na jej koniec **(polecam)**
- b) Zawsze do „W opracowaniu”, na górę

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

## 4. Kliknięcie zadania w archiwum

- a) Otwiera podgląd z prawej, tylko do oglądania: opis, termin, osoby, komentarze oraz „Przywróć” i „Usuń na stałe” **(polecam)**
- b) Nic: w tabeli są tylko tytuł, projekt i przyciski

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

## 5. Szukanie zadań w archiwum

- a) Wyszukiwarka i wybór projektu **(polecam)**
- b) Tylko wyszukiwarka

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

## 6. Czy coś znika z archiwum samo

- a) Nie: znika tylko to, co administrator usunie na stałe **(polecam)**
- b) Zadania usuwają się same po 12 miesiącach w archiwum (konta nigdy)

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

## 7. Kilka rzeczy naraz

- a) Nie: każdą rzecz osobno, archiwum zwykle jest małe **(polecam)**
- b) Tak: pola do zaznaczania i przyciski „Przywróć zaznaczone”, „Usuń zaznaczone”

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

## 8. Co widać przy osobie w archiwum

- a) Imię i nazwisko, login, rolę, od kiedy w archiwum i kto przeniósł, liczbę wniosków urlopowych i zadań **(polecam)**
- b) Tylko imię i nazwisko, login i od kiedy w archiwum

**Odpowiedź:** a (2026-11-20, zgodnie z rekomendacją)

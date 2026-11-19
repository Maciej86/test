# Spec: Zadania (ogólny)

**Data:** 2026-11-18 · **Status:** zaakceptowany; moduł zrobiony 2026-11-19
**Podstawa:** `QUESTIONS.md` (odpowiedzi 2026-11-18), `SPEC-GENERAL.md`, makieta `mockups/src/modules/tasks/`

## Cel

Zespół prowadzi zadania na tablicach projektów (np. Marketing, Produkcja, Montaż) z trzema kolumnami: W opracowaniu,
W toku, Zrealizowane. Karty przeciąga się między kolumnami i w obrębie kolumny, także palcem na telefonie.
Administrator tworzy projekty i decyduje, którzy pracownicy je widzą. Do zadań można przypisywać osoby, a później
także pisać komentarze. Moduł działa, gdy administrator założy projekt z dwoma pracownikami, jeden z nich doda
zadanie i przypisze drugiego, drugi dostanie powiadomienie, przeciągnie kartę do „Zrealizowane”, a pierwszy zobaczy
to na swojej tablicy w ciągu kilku sekund.

## Ustalenia całego modułu

- **Projekty.** Tworzy, zmienia, układa (strzałkami) i usuwa tylko administrator. Projekt ma nazwę i członków
  (pracownicy). Administratorzy widzą wszystkie projekty bez dodawania ich do członków. Pracownik widzi tylko
  projekty, do których należy (odpowiedzi 12, 16 i zmiana z 2026-11-18).
- **Menu.** „Zadania” to grupa bez własnej strony. Pod nią każdy widoczny projekt (w kolejności z listy projektów),
  a dla administratora na końcu „Projekty”. Pracownik bez projektów nie widzi „Zadań” w menu.
- **Każde zadanie należy do projektu.** Nie ma wspólnej tablicy ani widoku „wszystkie projekty” (odpowiedź 10a;
  „moje zadania ze wszystkich projektów” pokaże Pulpit).
- **Na tablicy obie role mogą wszystko** w projektach, które widzą: dodać, zmienić, przesunąć, przypisać, usunąć do
  archiwum (a w części 2 komentować).
- **Przypisać** można członków projektu i administratorów, bez kont w archiwum; do 10 osób.
- **Usunięcie projektu jest na stałe** (odpowiedź 13): razem z zadaniami (także tymi w archiwum) i komentarzami, po
  wpisaniu nazwy projektu w oknie. Projekty nie mają archiwum.
- **Usunięcie osoby z projektu** (odpowiedź 14a): osoba znika z przypisań w otwartych zadaniach projektu
  (W opracowaniu, W toku), w zrealizowanych zostaje; przestaje widzieć projekt.
- **Zadanie usunięte z tablicy trafia do archiwum** (`SPEC-GENERAL.md`); przywraca je i usuwa na stałe tylko
  administrator w module Archiwum.
- **Odświeżanie:** tablica co 5 sekund, gdy karta przeglądarki jest widoczna, i od razu po powrocie do niej
  (odpowiedź 7).
- **Przeciąganie:** biblioteka `@dnd-kit` (odpowiedź 8, zgoda użytkownika).

## Części

| # | Część | Zakres | Dlaczego osobno |
|---|---|---|---|
| 1 | Projekty i tablice | lista projektów (dodaj, zmień, członkowie, kolejność, usuń na stałe), projekty w menu, tablica projektu z przeciąganiem i telefonem, dodawanie w oknie, podgląd z prawej (540 px), przypisywanie, kropka urlopu, „Tylko moje”, wyszukiwarka, chowanie zrealizowanych po 30 dniach, odświeżanie co 5 s, usuwanie do archiwum, powiadomienia o przypisaniu i o dodaniu do projektu, historia zmian | bez tego moduł nie działa; sama część 1 jest już używalna na co dzień |
| 2 | Komentarze | komentarze w podglądzie zadania, poprawianie i usuwanie (odpowiedź 11a), licznik na karcie, powiadomienie przypisanych o nowym komentarzu (odpowiedź 5a) | dokłada się do działającej tablicy bez przebudowy |

Każda część ma `SPEC-<n>.md`, `PLAN-<n>.md` i `TESTS-<n>.md` w tym folderze. Spec części 2 powstaje po zamknięciu
części 1.

## Poza zakresem

- Widok zadań ze wszystkich projektów (odpowiedź 10a).
- Zadania cykliczne, podzadania, listy kontrolne, załączniki (pomysł w `docs/IDEAS.md`), etykiety, priorytety.
- Zmiany na żywo w tej samej sekundzie (odpowiedź 7: wystarcza 5 s).
- Powiadomienia o przeniesieniu do „Zrealizowane” i o usunięciu zadania (odpowiedź 5a).

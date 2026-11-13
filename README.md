# Moja aplikacja

Zbudowana z pluginem stepkit. To jest Twoja **ściągawka**: jak uruchomić aplikację i gdzie co podejrzeć.
Claude uzupełnia ją sam, gdy zmienia się port albo dochodzi coś nowego (np. e-maile, adres w internecie).

Dalsza praca: otwórz nową rozmowę w Claude Code i wpisz `/stepkit:dalej`.

## Uruchomienie

Najpierw włącz **Docker Desktop** (ikona wieloryba musi być spokojna, nie animowana). Potem w terminalu, w folderze
projektu:

1. `npm run db`: baza danych,
2. `npm run migrate`: tabele w bazie (wystarczy po zmianach; nic nie szkodzi wpisać za każdym razem),
3. `npm run dev`: aplikacja i makiety. Terminal zostaw otwarty; zamykasz przez `Ctrl+C`.

Wyłączenie bazy: `npm run db:stop`. Dane zostają, przy następnym `npm run db` wszystko wróci.

## Gdzie co podejrzeć

| Adres | Co to jest | Działa, gdy |
|---|---|---|
| http://localhost:5173 | Twoja aplikacja | `npm run dev` |
| http://localhost:5174 | makiety (podgląd ekranów) | `npm run dev` |
| http://localhost:5174/progress | **postęp prac**: co zrobione, co dalej | `npm run dev` |
| http://localhost:8081 | podgląd bazy (phpMyAdmin) | `npm run db` |

**Logowanie do phpMyAdmin:** użytkownik `app`, hasło to wartość `DB_PASSWORD` z pliku `.env`
(otwórz go w edytorze i skopiuj). Baza aplikacji nazywa się `app`. Hasła nie wklejaj do rozmowy z Claude.

## Ważne pliki

| Plik | Co w nim jest |
|---|---|
| `CLAUDE.md` | najważniejsze zasady projektu; Claude czyta je sam w każdej rozmowie, także bez stepkit |
| `docs/CONVENTIONS.md` | pełne zasady kodu (kopia ze stepkit, odświeżana przy aktualizacji) |
| `docs/STATUS.md` | stan prac; od niego Claude zaczyna każdą nową rozmowę |
| `docs/OVERVIEW.md` | opis aplikacji z wywiadu |
| `docs/SPEC-GENERAL.md` | plan całej aplikacji: role, nawigacja, kolejność modułów |
| `docs/modules/` | specyfikacje, plany i listy testów kolejnych modułów |
| `docs/DESIGN.md` | księga wyglądu: kolory, czcionki i wzorce ekranów całej aplikacji |
| `docs/IDEAS.md` | pomysły na rozwój na później; dopisuj w każdej chwili, nie zmieniają obecnej budowy |
| `.env` | hasła i ustawienia tego komputera; **nigdy nie trafia na GitHub** |

## Sprawdzenie, czy wszystko działa

- `npm run check`: testy kodu (kilkadziesiąt sekund),
- `npm run test:e2e`: Claude przeklikuje aplikację w przeglądarce.

## Coś nie działa?

- **Strona się nie otwiera:** czy w terminalu działa `npm run dev`? Jeśli zamknąłeś terminal, uruchom ponownie.
- **Błąd połączenia z bazą:** włącz Docker Desktop, wpisz `npm run db`, odczekaj 20 sekund.
- **„Port is in use”:** inny program zajmuje port. Napisz to Claude'owi, zmieni port i poprawi tę ściągawkę.
- Każdy inny problem: otwórz rozmowę w Claude Code, wpisz `/stepkit:dalej` i opisz, co widzisz (najlepiej ze
  zrzutem ekranu).

# Moja aplikacja

Zbudowana z pluginem stepkit. To jest Twoja **ściągawka**: jak uruchomić aplikację i gdzie co podejrzeć.
Claude uzupełnia ją sam, gdy zmienia się port albo dochodzi coś nowego (np. e-maile, adres w internecie).

Dalsza praca: w Claude Code zacznij nową rozmowę: wpisz `/clear` i naciśnij Enter. To wyczyści tę rozmowę, ale cała
praca zostaje zapisana w plikach i w git. Potem wpisz `/stepkit:dalej`.
Pomysł, zmiana albo błąd: wpisz `/stepkit:zglos` i opisz to własnymi słowami.

## Uruchomienie

Najpierw włącz **Docker Desktop** (ikona wieloryba musi być spokojna, nie animowana). Potem w terminalu, w folderze
projektu:

1. `npm run db`: baza danych,
2. `npm run migrate`: tabele w bazie (wystarczy po zmianach; nic nie szkodzi wpisać za każdym razem),
3. `npm run dev`: aplikacja i makiety. Terminal zostaw otwarty; zamykasz przez `Ctrl+C`.

**Pierwszy administrator** (raz, po pierwszym `npm run migrate`): `npm run admin`. Polecenie zapyta o imię
i nazwisko, login (np. `anna.nowak@firma.pl`), e-mail do powiadomień (Enter = brak) i hasło (co najmniej 8 znaków,
w tym cyfra i znak specjalny; podczas wpisywania nic nie widać). Hasło wpisujesz tylko w terminalu, nigdy w rozmowie
z Claude. Potem logujesz się na http://localhost:5180/login. Kolejne konta zakłada administrator w aplikacji.

**E-mail testowy:** `npm run email:test` wysyła przykładowy e-mail „Nowy wniosek urlopowy” do skrzynki testowej
(http://localhost:8026). Możesz podać adres: `npm run email:test -- ania@firma.pl`.

**Powiadomienia testowe:** `npm run notifications:test` dopisuje każdemu aktywnemu kontu przykładowe powiadomienia
(administratorom o wnioskach, pracownikom o decyzjach i zadaniu). Zobaczysz je w dzwonku w górnej belce panelu.

**Zatwierdzenie testowe:** `npm run my-leave:approve-test` zatwierdza najnowszy wniosek czekający na decyzję (jako
pierwszy administrator), żeby sprawdzić przycisk „PDF” w „Moich urlopach”, zanim powstanie moduł „Wnioski urlopowe”.
Możesz podać login pracownika: `npm run my-leave:approve-test -- jan.kowalski@firma.pl`. Na serwerze nie działa.

Wyłączenie bazy: `npm run db:stop`. Dane zostają, przy następnym `npm run db` wszystko wróci.

## Gdzie co podejrzeć

| Adres | Co to jest | Działa, gdy |
|---|---|---|
| http://localhost:5180 | Twoja aplikacja | `npm run dev` |
| http://localhost:5181 | makiety (podgląd ekranów) | `npm run dev` |
| http://localhost:5181/progress | **postęp prac**: co zrobione, co dalej | `npm run dev` |
| http://localhost:8081 | podgląd bazy (phpMyAdmin) | `npm run db` |
| http://localhost:8026 | skrzynka testowa (Mailpit): e-maile wysłane przez aplikację | `npm run db` |

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
| `docs/FIXES.md` | poprawki już ustalone (błąd, drobna zmiana, porządki), odłożone na po bieżącym module; robione przed następnym modułem |
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

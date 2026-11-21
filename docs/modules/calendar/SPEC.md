# Spec: Kalendarz (ogólny)

**Data:** 2026-11-21 · **Status:** zaakceptowany przez użytkownika 2026-11-21
**Podstawa:** `QUESTIONS.md` (zgłoszenie 1a 2b 3a, uwagi do makiety, odpowiedzi 1a–8a z 2026-11-21), `SPEC-GENERAL.md`,
makiety `mockups/src/modules/calendar/` i `mockups/src/modules/leave-types/`, speki Typów urlopów, Moich urlopów
i Wniosków urlopowych („Powiązania”)

## Cel

Administrator w jednym widoku widzi, kogo nie ma w pracy od dziś przez kolejne 60 dni: urlopy zatwierdzone, wnioski
czekające na decyzję i chorobowe. Może od razu zatwierdzić albo odrzucić czekający wniosek, widząc, kto jeszcze
będzie wtedy nieobecny. Przy okazji typy urlopów dostają trzy ustawienia: kolor w kalendarzu, liczenie dni
(robocze albo kalendarzowe) i „Wymaga zatwierdzenia” (chorobowe nie wymaga: zwolnienie wystawił lekarz albo nie).

Moduł działa, gdy: administrator otwiera „Kalendarz” i widzi wszystkich aktywnych pracowników z paskami nieobecności
w kolorach typów, urlop w dniach roboczych przerwany w weekend, a klik w czekający wniosek pozwala go zatwierdzić;
pracownik zgłasza „Chorobowe” na 7 dni kalendarzowych, wniosek od razu jest zatwierdzony, administrator dostaje
powiadomienie i e-mail, a w kalendarzu pojawia się ciągły fioletowy pasek.

## Części

Moduł jest duży (razem ok. 25 kroków planu) i ma dwie niezależne rzeczy: nowy ekran oraz zmianę zasad wniosków
w trzech zrobionych modułach. Budujemy go w dwóch częściach.

| # | Część | Zakres | Dlaczego osobno |
|---|---|---|---|
| 1 | Kalendarz | ekran „Kalendarz” (dziś + 60 dni, siatka, filtry, wyszukiwarka, „Dziś nie ma”, panel szczegółów z „Zatwierdź” / „Odrzuć”), `GET /api/calendar`, kolor typu urlopu w ustawieniach, przyciski „Otwórz kalendarz” na Pulpicie i „Pokaż w kalendarzu” w szczegółach wniosku | daje działający kalendarz na obecnych wnioskach; wszystkie dzisiejsze typy liczą dni robocze i wymagają zatwierdzenia, więc niczego nie brakuje |
| 2 | Liczenie dni i zatwierdzanie | w typach urlopów „Liczenie dni” i „Wymaga zatwierdzenia”; wniosek zapamiętuje oba ustawienia; dni kalendarzowe w formularzu, limicie, puli, wydruku, e-mailu i kalendarzu; zgłoszenie bez zatwierdzania (od razu zatwierdzone, powiadomienie i e-mail), wycofanie go przez pracownika, typ „Chorobowe” na start | zmienia zasady zrobionych modułów Moje urlopy, Wnioski urlopowe i Typy urlopów; osobne testy, a część 1 działa bez tego |

Każda część ma `SPEC-<n>.md`, `PLAN-<n>.md`, `TESTS-<n>.md` w tym folderze. `SPEC-2.md` powstaje na początku części 2
(zarys niżej, „Część 2 w skrócie”).

## Zasady (obie części)

- **Kto widzi:** tylko administrator (pozycja menu `calendar` z rolą `admin`, `mountModule(api, 'calendar', …)`).
- **Wiersze (2a):** wszyscy aktywni pracownicy (rola `employee`, `archived_at IS NULL`), alfabetycznie po nazwisku,
  także bez nieobecności. Osoby z Archiwum i administratorzy nie mają wiersza. **[decyzja AI]** administrator nie
  składa wniosków (`SPEC-GENERAL.md`), więc nie ma czego pokazać w jego wierszu.
- **Co widać:** wnioski `pending` i `approved`, które mają choć jeden dzień w zakresie. Odrzucone, wycofane
  i anulowane nie pojawiają się (pytanie 3).
- **Zakres:** dziś + 60 dni (61 kolumn), strzałki przesuwają o 30 dni, „Dziś” wraca. Zakres liczy serwer z daty
  początku (`from`), klient nie podaje końca. Adres `/admin/calendar?from=RRRR-MM-DD` otwiera zakres od tej daty
  (link „Pokaż w kalendarzu”).
- **Pasek:** kolor typu (6 do wyboru, pytanie 3a). Wniosek czekający: jasny odcień tego koloru, przerywana ramka,
  dopisek „(czeka)”. Typ w dniach roboczych pęka na weekendy i święta (`isWeekend`, `getHoliday` z `@app/shared`),
  kawałki łączy cienka linia; typ w dniach kalendarzowych to jeden ciągły pasek. Opis na środku paska, pełny w dymku.
- **Siatka:** kolumny dni rozciągają się na całą szerokość, pionowa kreska między dniami, mocniejsza na granicy
  miesiąca; weekendy i święta ciemniejsze (święto z nazwą w dymku nad numerem dnia); dzisiejszy dzień podkreślony.
  Na wąskim ekranie siatka przewija się w bok, kolumna z osobami zostaje.
- **Panel szczegółów (1a):** klik w pasek otwiera te same szczegóły wniosku co we Wnioskach urlopowych (wspólny
  klocek; zmiana zaakceptowana przy planie: bez osobnego „Otwórz wniosek”): przy czekającym „Zatwierdź” i „Odrzuć”,
  te same okna i trasy co we Wnioskach urlopowych. Po decyzji kalendarz odświeża się.
- **Pusty dzień (8a):** klik nic nie robi; administrator nie dodaje nieobecności.
- **Wyjątek od `CONVENTIONS.md` („Kalendarze”):** własna siatka zamiast `@mantine/schedule` (biblioteka pokazuje jeden
  miesiąc i nie przerywa pasków). Zapisany w `SPEC-GENERAL.md` (moduł 15). `DESIGN.md`: wzorzec „Kalendarz zespołu”
  dostaje opis tej siatki.

## Dane

| Zmiana | Część | Migracja |
|---|---|---|
| `leave_types.color VARCHAR(10) NOT NULL DEFAULT 'green'` (jeden z 6) | 1 | `029_leave_types_color.sql` |
| `leave_types.day_count ENUM('working','calendar') NOT NULL DEFAULT 'working'` | 2 | nowa |
| `leave_types.requires_approval BOOLEAN NOT NULL DEFAULT TRUE` | 2 | nowa |
| `leave_requests.day_count` (kopia z typu przy złożeniu) i `leave_requests.auto_approved BOOLEAN` | 2 | nowe |
| typ „Chorobowe” (kalendarzowe, bez zatwierdzania, nie odejmuje, fioletowy), jeśli nie ma typu o tej nazwie | 2 | nowa |

Nowych tabel i relacji nie ma. Kalendarz tylko czyta.

## Powiązania

| Z modułem | Co ten moduł pokazuje stamtąd / co tamten pokazuje stąd | Funkcja | Pola widoczne dla roli |
|---|---|---|---|
| employees | wiersze kalendarza | `listActiveUsers(db, 'employee')` w `employees.queries.ts` | id, imię i nazwisko (aplikacja nie ma stanowisk, więc pod nazwiskiem nic; makieta poprawiona) |
| my-leave / leave-requests | paski i „Dziś nie ma” | `listCalendarAbsences(db, userIds, from, to)` w `leave-requests.queries.ts` | typ, kolor, daty, dni, status |
| leave-requests | „Zatwierdź” / „Odrzuć” w panelu, „Pokaż w kalendarzu” w szczegółach wniosku | trasy `POST /api/leave-requests/:id/approve` i `/reject` (są), hooki z modułu przez wspólny klocek (plan) | — |
| leave-types | kolor typu (cz. 1), liczenie dni i zatwierdzanie (cz. 2) | formularz i lista typów | admin |
| dashboard | przycisk „Otwórz kalendarz” przy boksie „Nieobecności na 2 tygodnie” | link `CALENDAR_PATH` | admin |

## Część 2 w skrócie

- Typy urlopów: pola „Liczenie dni” (robocze / kalendarzowe) i „Wymaga zatwierdzenia”; kolumny w tabeli; zmiana
  dotyczy tylko nowych wniosków (wniosek zapamiętuje `day_count`).
- Dni kalendarzowe wszędzie (6a): podpowiedź w formularzu, sprawdzenie serwera (`checkLeaveRequest` dostaje sposób
  liczenia), limit typu i pula liczone w dniach wniosku, wydruk, e-mail, listy; przy liczbie „dni kalendarzowych”.
  Kolumna `working_days` zostaje i znaczy „dni wniosku” (komentarz w migracji). **[decyzja AI]**
- Bez zatwierdzania (4a): wniosek zapisuje się od razu jako `approved` z `auto_approved = 1` (bez `decided_by`);
  administratorzy dostają powiadomienie (nowy rodzaj, np. „Tomasz Wójcik zgłosił chorobowe 16–22.11.2026”) i e-mail.
- Pomyłki (5a): pracownik wycofuje taki wniosek do końca pierwszego dnia (`date_from ≥ dziś`), potem tylko
  administrator anuluje z powodem (jak zatwierdzony urlop).
- Teksty Typów urlopów do zmiany w części 2 (w części 1 zostają stare, bo ustawień jeszcze nie ma): podpowiedź
  „Odejmuje dni z puli” → „dni wniosku zmniejszają pulę…”, podpowiedź limitu → „Ile dni w roku może wziąć jedna
  osoba, liczonych jak wyżej (robocze albo kalendarzowe)…”, ostrzeżenie przy edycji → „Zmiana liczenia dni,
  zatwierdzania, „Odejmuje dni z puli” i limitu dotyczy tylko nowych wniosków…”.
- **Do potwierdzenia przy specu części 2:** zwolnienie lekarskie bywa wystawiane z datą wsteczną (do 3 dni), a dziś
  wniosek nie może zaczynać się przed dniem złożenia. Propozycja **[decyzja AI]**: typ bez zatwierdzania może
  zaczynać się do 7 dni wstecz.

## Poza zakresem

- Dodawanie nieobecności przez administratora (8b), przeciąganie pasków, eksport kalendarza.
- Kalendarz dla pracowników (ustalone przy zgłoszeniu: tylko administrator).
- Pół dnia, urlop w godzinach, dni wolne firmy.

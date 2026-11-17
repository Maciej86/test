# Wnioski urlopowe: pytania do makiety

Makieta: http://localhost:5181/admin/leave-requests (w pasku „Oglądam jako:” wybierz **Administrator**, w menu
„Wnioski urlopowe”). Przełącznik „Pokaż stan” pokazuje: listę, szczegóły wniosku, wniosek z minionym terminem,
szczegóły zatwierdzonego, odrzucenie (także bez powodu), anulowanie (także urlopu, który już minął), wniosek
rozpatrzony już przez innego administratora i pustą listę. Kliknięcie wiersza otwiera szczegóły z prawej.

**[decyzja AI]** Na liście kolumna „Zostało w puli” (ile dni osoba ma jeszcze do wykorzystania w otwartym roku), żeby
decyzję podjąć bez przechodzenia do „Pracowników”. W szczegółach pasek „Kto jeszcze ma wtedy wolne”: dni wniosku
i urlopy innych osób w tym samym czasie, weekendy i święta przekreślone. Przycisk „PDF” otwiera ten sam dokument co
w „Moich urlopach”. Zatwierdzenie nie zmienia liczby dni w puli (dni są zarezerwowane od złożenia wniosku);
odrzucenie i anulowanie oddają dni. Pracownik dostaje powiadomienie o każdej decyzji (spec ogólny), bez e-maila.

## 1. Zatwierdzanie

- a) Od razu przyciskiem „Zatwierdź” na liście albo w szczegółach, bez dodatkowego pytania (pomyłkę naprawia
  „Anuluj urlop”) **(polecam)**
- b) Zawsze z oknem „Zatwierdzić wniosek?”

**Odpowiedź (2026-11-17):** 1b. Przy zatwierdzeniu okno „Zatwierdzić wniosek?” (z listy i ze szczegółów): pracownik,
typ, termin i dni robocze, kto jeszcze ma wtedy urlop, przy minionym terminie żółta ramka; przyciski „Wróć”
i „Zatwierdź”.

## 2. Pasek „Kto jeszcze ma wtedy wolne” (powiązanie z innymi wnioskami)

- a) Urlopy zatwierdzone i wnioski czekające innych osób **(polecam)**
- b) Tylko urlopy zatwierdzone
- c) Nie pokazywać paska

**Odpowiedź (2026-11-17):** 2a.

## 3. Powód odrzucenia

- a) Obowiązkowy: pracownik zawsze dowie się dlaczego **(polecam)**
- b) Nieobowiązkowy

**Odpowiedź (2026-11-17):** 3a.

## 4. Który zatwierdzony urlop można anulować

- a) Każdy z roku, którego „Zamknij rok” jeszcze nie zamknął, także trwający albo miniony (np. pracownik jednak
  przyszedł do pracy); przy takim okno pokazuje żółte ostrzeżenie **(polecam)**
- b) Tylko taki, który jeszcze się nie zaczął

**Odpowiedź (2026-11-17):** 4a.

## 5. Powód anulowania

- a) Obowiązkowy, jak przy odrzuceniu **(polecam)**
- b) Nieobowiązkowy

**Odpowiedź (2026-11-17):** 5a.

## 6. Wniosek, którego termin minął przed decyzją

- a) Można go normalnie zatwierdzić albo odrzucić; lista i szczegóły pokazują dopisek „termin już minął”
  **(polecam)**
- b) Aplikacja sama go odrzuca następnego dnia

**Odpowiedź (2026-11-17):** 6a.

## 7. Układ listy

- a) Na start zakładka „Czekają”, najstarsze złożone na górze. Pozostałe zakładki (Zatwierdzone, Odrzucone,
  Anulowane, Wycofane, Wszystkie): wybrany rok, od najnowszego terminu, 25 na stronę. Wyszukiwarka po pracowniku
  i filtr typu urlopu **(polecam)**
- b) Jedna lista wszystkich wniosków od najnowszych, czekające na górze

**Odpowiedź (2026-11-17):** 7a.

## 8. Link z e-maila i z powiadomienia o nowym wniosku

- a) Otwiera listę ze szczegółami tego wniosku z prawej, gotowe do decyzji (adres `/admin/leave-requests/24`)
  **(polecam)**
- b) Otwiera samą listę czekających

**Odpowiedź (2026-11-17):** 8a.

## 9. Zasady pól

| Okno | Pole | Wymagane | Min–maks | Format |
|---|---|---|---|---|
| Odrzucenie | Powód odrzucenia | tak (pytanie 3) | 3–500 znaków | zwykły tekst |
| Anulowanie | Powód anulowania | tak (pytanie 5) | 3–500 znaków | zwykły tekst |

Odpowiedz „ok” albo popraw pojedyncze pola.

**Odpowiedź (2026-11-17):** 9 ok.

# Stan projektu: test

**Wersja stepkit:** 0.1.22

**Następny krok:** Moduł Pracownicy, etap spec: akceptacja `docs/modules/employees/SPEC.md`.

## Start aplikacji

- [x] 1. Sprawdzenie komputera
- [x] 2. Szkielet i repo
- [x] 3. Opis
- [x] 4. Wywiad
- [x] 5. Podsumowanie
- [x] 6. Makieta ogólna
- [x] 7. Spec ogólny
- [x] 8. Plik stanu

## Moduły

| # | Moduł | Folder | Status | Etap | Zależy od |
|---|---|---|---|---|---|
| 1 | Wygląd | appearance | zrobiony | zamknięcie | — |
| 2 | Logowanie | login | zrobiony | zamknięcie | appearance |
| 3 | Pracownicy | employees | w toku | spec | login |
| 4 | Typy urlopów | leave-types | czeka | makieta | login |
| 5 | E-mail | email | czeka | makieta | login |
| 6 | Powiadomienia | notifications | czeka | makieta | login |
| 7 | Moje urlopy | my-leave | czeka | makieta | employees, leave-types, email, notifications |
| 8 | Wnioski urlopowe | leave-requests | czeka | makieta | my-leave |
| 9 | Zadania | tasks | czeka | makieta | employees, notifications |
| 10 | Historia zmian | activity-log | czeka | makieta | employees, my-leave, leave-requests, tasks |
| 11 | Archiwum | archive | czeka | makieta | employees, tasks |
| 12 | Moje konto | my-account | czeka | makieta | login |
| 13 | Pulpit | dashboard | czeka | makieta | my-leave, leave-requests, tasks |
| 14 | Publikacja | deploy | czeka | makieta | appearance, login, employees, leave-types, email, notifications, my-leave, leave-requests, tasks, activity-log, archive, my-account, dashboard |

## Ostatnie decyzje

- 2026-11-15: Pracownicy: makieta listy (pasek puli dni: wykorzystane, zaległe, z puli rocznej), okna: dodaj/edytuj, ustaw hasło, „Zamknij rok” z podglądem, do archiwum; 10 pytań. Nowe ikony przycisków: Ustaw hasło (`KeyRound`), Zamknij rok (`CalendarCheck`).

- 2026-11-14: Porty na komputerze: aplikacja 5180, makiety 5181, serwer 3006 (5173, 5174 i 3001 zajmują inne aplikacje); ustawione w `.env`.

- 2026-11-14: Moduł Logowanie zrobiony (potwierdzony przez użytkownika): 30 min bezczynności z ostrzeżeniem, hasło tymczasowe do zmiany, bez „Zapamiętaj mnie”, hasło z cyfrą i znakiem specjalnym, pierwszy administrator przez `npm run admin`.

- 2026-11-14: Logowanie: makieta ekranu logowania (kartka z kalendarza + formularz), stany: błąd, za dużo prób, po bezczynności, hasło tymczasowe, ostrzeżenie w panelu; 6 pytań.

- 2026-11-14: Moduł Wygląd zrobiony (potwierdzony przez użytkownika).

- 2026-11-14: Wygląd: wybrany wariant D „Nocny granat, cały ciemny”, zawsze ciemny motyw bez przełącznika; przeniesiony do `shared/src/theme.ts` i `theme.css`, opis w `docs/DESIGN.md`.

- 2026-11-14: Wygląd: użytkownikowi podoba się C, ale z ciemną treścią; dodany wariant D (cały ciemny). Wybór D zmieni ustalenie „tylko jasny motyw”.

- 2026-11-14: Wygląd: trzy warianty do porównania (A. Granat klasyczny, B. Atrament, C. Nocny granat); palety w `shared/src/theme.variants.ts`, bo test kolorów nie pozwala na kolory w `mockups/`.

- Podgląd bazy (phpMyAdmin) na porcie 8081, bo 8080 zajmuje inny projekt.
- 2026-11-13: Plan aplikacji zaakceptowany (docs/OVERVIEW.md, docs/SPEC-GENERAL.md).

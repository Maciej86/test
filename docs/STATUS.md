# Stan projektu: test

**Wersja stepkit:** 0.1.22

**Następny krok:** Moduł Wygląd, etap makieta (otwórz nową rozmowę i wpisz /stepkit:dalej).

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
| 1 | Wygląd | appearance | czeka | makieta | — |
| 2 | Logowanie | login | czeka | makieta | appearance |
| 3 | Pracownicy | employees | czeka | makieta | login |
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

- Podgląd bazy (phpMyAdmin) na porcie 8081, bo 8080 zajmuje inny projekt.
- 2026-11-13: Plan aplikacji zaakceptowany (docs/OVERVIEW.md, docs/SPEC-GENERAL.md).

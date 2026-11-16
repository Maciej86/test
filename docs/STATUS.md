# Stan projektu: test

**Wersja stepkit:** 0.1.29

**Następny krok:** Moduł E-mail, implementacja: krok 1 z 10 (Mailpit i ustawienia).

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
| 3 | Pracownicy | employees | zrobiony | zamknięcie | login |
| 4 | Typy urlopów | leave-types | zrobiony | zamknięcie | login |
| 5 | E-mail | email | w toku | implementacja (krok 1/10) | login |
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

- 2026-11-16: E-mail: makieta podglądu e-maila „Nowy wniosek urlopowy” (jasna treść, wersja tekstowa, widok na telefonie); 6 pytań (w tym powrót do wniosku po zalogowaniu).

- 2026-11-16: Aktualizacja stepkit 0.1.28 → 0.1.29: test zasad pilnuje, że numer z adresu idzie tylko przez `idParam` (nigdy `Number(req.params…)`); `routeHelpers.ts`, `errors.ts` i ich testy wyrównane z szablonem.

- 2026-11-16: Moduł Typy urlopów zrobiony (potwierdzony przez użytkownika): lista z kolejnością strzałkami, dodawanie i edycja, ukrywanie i przywracanie (ostatniego widocznego nie da się ukryć), 5 typów na start; wspólne `idParam`/`reply` w `backend/src/middleware/routeHelpers.ts` (numer w adresie tylko z cyfr), wspólne kroki e2e w `e2e/helpers.ts`.

- 2026-11-16: Aktualizacja stepkit 0.1.27 → 0.1.28: wszystkie funkcje w kodzie zapisane jako stałe ze strzałką (test zasad `functions are arrow functions`).

- 2026-11-16: Typy urlopów: odpowiedzi 1a–7a, zasady pól ok (limit liczony na osobę z czekającymi, zmiana zasad tylko dla nowych wniosków, tylko ukrywanie, własna kolejność strzałkami, bez opisu, kolumna „Wnioski”).

- 2026-11-16: Typy urlopów: makieta listy (kolejność strzałkami, „Pokaż ukryte”, kolumna „Wnioski”), okna dodaj/edytuj (ostrzeżenie przy typie użytym we wnioskach) i ukryj; 8 pytań. Nowe ikony przycisków: Ukryj (`EyeOff`), Przywróć ukryty (`Undo2`).

- 2026-11-16: Aktualizacja stepkit 0.1.22 → 0.1.27: makiety otwierają panel pod `/`, skrypty kopii zapasowych poza serwerem i wdrożeń (`scripts/backup/`, `scripts/deploy.sh`), nagłówki bezpieczeństwa w Caddyfile, blokada zapisów z obcych stron, baza i phpMyAdmin tylko z tego komputera, zmiana hasła kończy inne sesje (`users.token_version`), testy w folderach `__tests__`.

- 2026-11-15: Moduł Pracownicy zrobiony (potwierdzony przez użytkownika): lista z paskiem puli, dodawanie i edycja (imię i nazwisko osobno), hasło tymczasowe, archiwum i przywracanie, „Zamknij rok” z kolumną „Razem”.

- 2026-11-15: Pracownicy: na etapie testów użytkownik chce osobnych pól „Imię” (2–60) i „Nazwisko” (2–80); `name` w bazie staje się kolumną wyliczaną, `npm run admin` pyta o oba.

- 2026-11-15: Pracownicy: zbudowane (kroki 0–12, przegląd kodu z poprawkami), testy e2e zielone; zaległe dni do 999 (zamiast 120), bo „Zamknij rok” przenosi wszystkie dni bez limitu.

- 2026-11-15: Pracownicy: makieta listy (pasek puli dni: wykorzystane, zaległe, z puli rocznej), okna: dodaj/edytuj, ustaw hasło, „Zamknij rok” z podglądem, do archiwum; 10 pytań. Nowe ikony przycisków: Ustaw hasło (`KeyRound`), Zamknij rok (`CalendarCheck`).

- 2026-11-14: Porty na komputerze: aplikacja 5180, makiety 5181, serwer 3006 (5173, 5174 i 3001 zajmują inne aplikacje); ustawione w `.env`.

- 2026-11-14: Moduł Logowanie zrobiony (potwierdzony przez użytkownika): 30 min bezczynności z ostrzeżeniem, hasło tymczasowe do zmiany, bez „Zapamiętaj mnie”, hasło z cyfrą i znakiem specjalnym, pierwszy administrator przez `npm run admin`.

- 2026-11-14: Logowanie: makieta ekranu logowania (kartka z kalendarza + formularz), stany: błąd, za dużo prób, po bezczynności, hasło tymczasowe, ostrzeżenie w panelu; 6 pytań.

- 2026-11-14: Moduł Wygląd zrobiony (potwierdzony przez użytkownika).

- 2026-11-14: Wygląd: wybrany wariant D „Nocny granat, cały ciemny”, zawsze ciemny motyw bez przełącznika; przeniesiony do `shared/src/theme.ts` i `theme.css`, opis w `docs/DESIGN.md`.

- Podgląd bazy (phpMyAdmin) na porcie 8081, bo 8080 zajmuje inny projekt.
- 2026-11-13: Plan aplikacji zaakceptowany (docs/OVERVIEW.md, docs/SPEC-GENERAL.md).

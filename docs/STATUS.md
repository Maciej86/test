# Stan projektu: test

**Wersja stepkit:** 0.1.29

**Następny krok:** Moduł Powiadomienia, implementacja: krok 6 z 8 (strona „Powiadomienia”).

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
| 5 | E-mail | email | zrobiony | zamknięcie | login |
| 6 | Powiadomienia | notifications | w toku | implementacja (krok 6/8) | login |
| 7 | Moje urlopy | my-leave | czeka | makieta | employees, leave-types, email, notifications |
| 8 | Wnioski urlopowe | leave-requests | czeka | makieta | my-leave |
| 9 | Zadania | tasks | czeka | makieta | employees, notifications |
| 10 | Historia zmian | activity-log | czeka | makieta | employees, my-leave, leave-requests, tasks |
| 11 | Archiwum | archive | czeka | makieta | employees, tasks |
| 12 | Moje konto | my-account | czeka | makieta | login |
| 13 | Pulpit | dashboard | czeka | makieta | my-leave, leave-requests, tasks |
| 14 | Publikacja | deploy | czeka | makieta | appearance, login, employees, leave-types, email, notifications, my-leave, leave-requests, tasks, activity-log, archive, my-account, dashboard |

## Ostatnie decyzje

- 2026-11-16: Powiadomienia: spec zaakceptowany (dzwonek, strona „wszystkie”, `notifyUsers`/`notifyAdmins` dla kolejnych modułów, `npm run notifications:test`).

- 2026-11-16: Powiadomienia: odpowiedzi 1a–6a (strona „wszystkie”, przeczytane po kliknięciu, odświeżanie co minutę, przeczytane usuwane po 90 dniach, każdy administrator osobno, teksty ok).

- 2026-11-16: Powiadomienia: makieta dzwonka w belce (licznik nieprzeczytanych, 8 ostatnich, „Oznacz wszystkie jako przeczytane”) i strony „wszystkie” (grupy po dniach, filtr „Nieprzeczytane”); 6 pytań.

- 2026-11-16: Moduł E-mail zrobiony (potwierdzony przez użytkownika): e-mail „Nowy wniosek urlopowy” do administratorów z e-mailem (`emailAdminsAboutNewRequest`, woła go „Moje urlopy” bez czekania), skrzynka testowa Mailpit (port 8026), `npm run email:test`, po zalogowaniu powrót na otwierany adres w panelu (`?next=`, `safeNextPath`).

- 2026-11-16: Skrzynka testowa Mailpit na porcie 8026 (`MAILPIT_PORT` w `.env`), bo 8025 zajmuje inny projekt.

- 2026-11-16: E-mail: makieta podglądu e-maila „Nowy wniosek urlopowy” (jasna treść, wersja tekstowa, widok na telefonie); 6 pytań (w tym powrót do wniosku po zalogowaniu).

- 2026-11-16: Aktualizacja stepkit 0.1.28 → 0.1.29: test zasad pilnuje, że numer z adresu idzie tylko przez `idParam` (nigdy `Number(req.params…)`); `routeHelpers.ts`, `errors.ts` i ich testy wyrównane z szablonem.

- 2026-11-16: Moduł Typy urlopów zrobiony (potwierdzony przez użytkownika): lista z kolejnością strzałkami, dodawanie i edycja, ukrywanie i przywracanie (ostatniego widocznego nie da się ukryć), 5 typów na start; wspólne `idParam`/`reply` w `backend/src/middleware/routeHelpers.ts` (numer w adresie tylko z cyfr), wspólne kroki e2e w `e2e/helpers.ts`.

- 2026-11-16: Aktualizacja stepkit 0.1.27 → 0.1.28: wszystkie funkcje w kodzie zapisane jako stałe ze strzałką (test zasad `functions are arrow functions`).

- 2026-11-16: Typy urlopów: odpowiedzi 1a–7a, zasady pól ok (limit liczony na osobę z czekającymi, zmiana zasad tylko dla nowych wniosków, tylko ukrywanie, własna kolejność strzałkami, bez opisu, kolumna „Wnioski”).

- 2026-11-16: Typy urlopów: makieta listy (kolejność strzałkami, „Pokaż ukryte”, kolumna „Wnioski”), okna dodaj/edytuj (ostrzeżenie przy typie użytym we wnioskach) i ukryj; 8 pytań. Nowe ikony przycisków: Ukryj (`EyeOff`), Przywróć ukryty (`Undo2`).
